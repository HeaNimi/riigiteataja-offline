import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { dataDir, getDatabase, rebuildSearchIndex } from './db'

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true })

function envBool(name: string) {
  return process.env[name]?.toLowerCase() === 'true'
}

function textOf(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(' ')
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(textOf).filter(Boolean).join(' ')
  return ''
}

function findValue(value: unknown, names: string[]): string {
  if (!value || typeof value !== 'object') return ''
  const entries = Object.entries(value as Record<string, unknown>)
  for (const [key, child] of entries) {
    const normalized = key.replace(/^@_/, '').toLowerCase()
    if (names.includes(normalized)) {
      const result = textOf(child).trim()
      if (result) return result
    }
  }
  for (const [, child] of entries) {
    const result = findValue(child, names)
    if (result) return result
  }
  return ''
}

const sectionTypes = new Set([
  'osa', 'peatukk', 'peatükk', 'jagu', 'jaotis', 'alljagu', 'paragrahv', 'paragraaf',
  'lisa', 'artikkel', 'article', 'section', 'chapter', 'subchapter', 'part', 'paragraph'
])
const articleTypes = new Set(['paragrahv', 'paragraaf', 'artikkel', 'article', 'paragraph'])

function localName(name: string) {
  return name.replace(/^.*:/, '').replace(/^@_/, '').toLowerCase()
}

function directValue(value: unknown, names: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (names.includes(localName(key))) {
      const result = textOf(child).trim()
      if (result) return result
    }
  }
  return ''
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value]
}

type ExtractedStructure = {
  sections: Array<Record<string, unknown>>
  articles: Array<Record<string, unknown>>
}

function extractStructure(value: unknown, lawId: string): ExtractedStructure {
  const result: ExtractedStructure = { sections: [], articles: [] }
  let order = 0
  let articleOrder = 0

  function visit(current: unknown, parentId: string | null, path: string) {
    if (!current || typeof current !== 'object') return
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, parentId, `${path}.${index + 1}`))
      return
    }
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      const type = localName(key)
      if (!sectionTypes.has(type)) {
        visit(child, parentId, path)
        continue
      }
      values(child).forEach((node, index) => {
        const nodePath = `${path}.${type}.${index + 1}`
        const id = `${lawId}:section:${nodePath}`
        const number = directValue(node, ['kuvatavnr', 'paragrahvi_nr', 'paragraafinumber', 'number', 'nr', 'artiklinumber'])
          || String(index + 1)
        const title = directValue(node, ['pealkiri', 'pealkiri1', 'title', 'nimetus'])
        const body = textOf(node).trim()
        result.sections.push({
          id, lawId, parentId, sectionType: type, sectionNumber: number, title, body,
          canonicalXml: JSON.stringify(node), sortOrder: order++
        })
        if (articleTypes.has(type)) {
          result.articles.push({
            id: `${lawId}:article:${nodePath}`, lawId, sectionId: id, articleNumber: number,
            title, body, canonicalXml: JSON.stringify(node), sortOrder: articleOrder++
          })
        }
        visit(node, id, nodePath)
      })
    }
  }

  visit(value, null, 'root')
  return result
}

async function xmlFiles(root: string): Promise<string[]> {
  const result: string[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) result.push(...await xmlFiles(path))
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.xml') result.push(path)
  }
  return result
}

async function discoverArchive(): Promise<string> {
  const direct = process.env.RT_ARCHIVE_URL
  const discovery = process.env.RT_DISCOVERY_URL
  const year = process.env.RT_ARCHIVE_YEAR
  if (discovery) {
    const response = await fetch(discovery)
    if (!response.ok) throw new Error(`Riigi Teataja discovery failed: HTTP ${response.status}`)
    const html = await response.text()
    const matches = [...html.matchAll(/(?:href=["']|url=)([^"'\s>]+\.zip(?:\?[^"'\s>]*)?)/gi)]
    const match = (year && matches.length > 1
      ? matches.find(candidate => candidate[1]?.includes(year))
      : matches[0])
    if (match?.[1]) return new URL(match[1], discovery).toString()
  }
  if (direct) return direct.replaceAll('{year}', year || '')
  throw new Error('No archive URL configured (set RT_ARCHIVE_URL or RT_DISCOVERY_URL)')
}

async function downloadArchive(url: string, destination: string) {
  const response = await fetch(url)
  if (!response.ok || !response.body) throw new Error(`Riigi Teataja archive download failed: HTTP ${response.status}`)
  await mkdir(join(dataDir(), 'import'), { recursive: true })
  await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(destination))
}

async function findMountedArchive() {
  const importDir = join(dataDir(), 'import')
  await mkdir(importDir, { recursive: true })
  const names = await readdir(importDir)
  const year = process.env.RT_ARCHIVE_YEAR
  const archives = names.filter(name => name.toLowerCase().endsWith('.zip'))
  const zip = (year ? archives.find(name => name.includes(year)) : undefined) || archives[0]
  return zip ? join(importDir, zip) : null
}

export async function downloadConfiguredArchive() {
  const url = await discoverArchive()
  const importDir = join(dataDir(), 'import')
  await mkdir(importDir, { recursive: true })
  const destination = join(importDir, 'riigiteataja-auto.zip')
  const temporary = `${destination}.download`
  await rm(temporary, { force: true })
  await downloadArchive(url, temporary)
  await rm(destination, { force: true })
  await rename(temporary, destination)
  return destination
}

async function mountedArchive() {
  const archive = await findMountedArchive()
  if (archive) return archive
  if (!envBool('RT_AUTO_DOWNLOAD')) return null
  return downloadConfiguredArchive()
}

export async function mountedArchivePath() {
  return findMountedArchive()
}

export async function deleteMountedArchives() {
  const importDir = join(dataDir(), 'import')
  await mkdir(importDir, { recursive: true })
  const names = await readdir(importDir)
  const archives = names.filter(name => name.toLowerCase().endsWith('.zip'))
  await Promise.all(archives.map(name => rm(join(importDir, name), { force: true })))
  return archives.length
}

export type ImportResult = {
  archive: string
  lawsImported: number
  skipped: boolean
}

export async function importMountedArchive(archiveOverride?: string): Promise<ImportResult | null> {
  const archive = archiveOverride || await mountedArchive()
  if (!archive) return null
  const db = getDatabase()
  const bytes = await readFile(archive)
  const digest = createHash('sha256').update(bytes).digest('hex')
  const previous = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('archiveSha256') as { value?: string } | undefined
  if (previous?.value === digest) {
    rebuildSearchIndex(db)
    return { archive, lawsImported: 0, skipped: true }
  }

  const workDir = join(dataDir(), 'work', `extract-${digest.slice(0, 12)}`)
  await rm(workDir, { recursive: true, force: true })
  await mkdir(workDir, { recursive: true })
  new AdmZip(bytes).extractAllTo(workDir, true)
  const files = await xmlFiles(workDir)
  const now = new Date().toISOString()
  let count = 0
  const insert = db.prepare(`
    INSERT INTO laws (id, title, identifier, adopted_at, amended_at, xml_path, source_url, body, canonical_xml, updated_at)
    VALUES (@id, @title, @identifier, @adoptedAt, @amendedAt, @xmlPath, @sourceUrl, @body, @canonicalXml, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, identifier=excluded.identifier,
      adopted_at=excluded.adopted_at, amended_at=excluded.amended_at, xml_path=excluded.xml_path,
      source_url=excluded.source_url, body=excluded.body, canonical_xml=excluded.canonical_xml, updated_at=excluded.updated_at
  `)
  const insertSection = db.prepare(`
    INSERT INTO sections (id, law_id, parent_id, section_type, section_number, title, body, canonical_xml, sort_order)
    VALUES (@id, @lawId, @parentId, @sectionType, @sectionNumber, @title, @body, @canonicalXml, @sortOrder)
  `)
  const insertArticle = db.prepare(`
    INSERT INTO articles (id, law_id, section_id, article_number, title, body, canonical_xml, sort_order)
    VALUES (@id, @lawId, @sectionId, @articleNumber, @title, @body, @canonicalXml, @sortOrder)
  `)
  const transaction = db.transaction((records: Array<Record<string, unknown>>) => {
    for (const record of records) {
      const { parsed, ...lawRecord } = record
      insert.run(lawRecord)
      db.prepare('DELETE FROM articles WHERE law_id = ?').run(record.id)
      db.prepare('DELETE FROM sections WHERE law_id = ?').run(record.id)
      const structure = extractStructure(parsed, String(record.id))
      for (const section of structure.sections) insertSection.run(section)
      for (const article of structure.articles) insertArticle.run(article)
      count++
    }
  })
  const records: Array<Record<string, unknown>> = []
  for (const file of files) {
    const raw = await readFile(file, 'utf8')
    if (!raw.trim()) continue
    const parsed = parser.parse(raw) as unknown
    const title = findValue(parsed, ['pealkiri', 'title', 'nimetus']) || basename(file, '.xml')
    const identifier = findValue(parsed, ['id', 'identifier', 'aktinumber', 'documentid']) || basename(file, '.xml')
    const adoptedAt = findValue(parsed, ['vastuvõtmine', 'vastuvotmine', 'adopted', 'adoptiondate'])
    const amendedAt = findValue(parsed, ['muutmine', 'amended', 'amendmentdate'])
    records.push({
      id: identifier,
      title,
      identifier,
      adoptedAt,
      amendedAt,
      xmlPath: relative(dataDir(), file),
      sourceUrl: process.env.RT_ARCHIVE_URL || '',
      body: textOf(parsed).slice(0, 5_000_000),
      canonicalXml: raw,
      updatedAt: now,
      parsed
    })
  }
  transaction(records)
  rebuildSearchIndex(db)
  db.prepare(`
    INSERT INTO app_meta(key, value) VALUES ('archiveSha256', ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(digest)
  db.prepare('INSERT INTO import_runs (archive, imported_at, laws_imported) VALUES (?, ?, ?)').run(archive, now, count)
  return { archive, lawsImported: count, skipped: false }
}
