import { getDatabase } from './db'

export function getAct(id: string) {
  const db = getDatabase()
  const act = db.prepare(`
    SELECT id, title, identifier, adopted_at AS adoptedAt, amended_at AS amendedAt,
      xml_path AS xmlPath, source_url AS sourceUrl, body, canonical_xml AS canonicalXml
    FROM laws WHERE identifier = ? OR id = ?
    ORDER BY CASE WHEN identifier = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).get(id, id, id) as Record<string, unknown> | undefined
  if (!act) return null
  const sections = db.prepare(`
    SELECT id, law_id AS lawId, parent_id AS parentId, section_type AS sectionType,
      section_number AS sectionNumber, title, body, canonical_xml AS canonicalXml, sort_order AS sortOrder
    FROM sections WHERE law_id = ? ORDER BY sort_order, id
  `).all(act.id)
  return { ...act, actIdentifier: act.identifier, sections }
}

type SectionLookup = string | {
  id?: string
  actIdentifier?: string
  sectionIdentifier?: string
}

export function getSection(lookup: SectionLookup) {
  const db = getDatabase()
  const options = typeof lookup === 'string' ? { id: lookup } : lookup
  const sectionIdentifier = options.sectionIdentifier || options.id || ''
  const actIdentifier = options.actIdentifier || ''
  if (!sectionIdentifier) return null
  const actFilter = actIdentifier ? 'AND (l.identifier = @actIdentifier OR l.id = @actIdentifier)' : ''
  const section = db.prepare(`
    SELECT s.id, s.law_id AS lawId, s.parent_id AS parentId, s.section_type AS sectionType,
      s.section_number AS sectionNumber, s.title, s.body, s.canonical_xml AS canonicalXml,
      s.sort_order AS sortOrder, l.title AS actTitle, l.identifier AS actIdentifier
    FROM sections s JOIN laws l ON l.id = s.law_id
    WHERE s.id = @sectionIdentifier ${actFilter}
  `).get({ sectionIdentifier, actIdentifier }) as Record<string, unknown> | undefined
  if (!section) return null
  const articles = db.prepare(`
    SELECT id, law_id AS lawId, section_id AS sectionId, article_number AS articleNumber,
      title, body, canonical_xml AS canonicalXml, sort_order AS sortOrder
    FROM articles WHERE section_id = @sectionIdentifier ORDER BY sort_order, id
  `).all({ sectionIdentifier })
  return {
    ...section,
    sectionIdentifier: section.id,
    sectionTitle: section.title,
    text: section.body,
    articles
  }
}
