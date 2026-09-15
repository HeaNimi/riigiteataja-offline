import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { archiveStatus, getDatabase } from './db'
import { getAct, getSection } from './acts'

function searchLaws(query: string, limit: number) {
  const db = getDatabase()
  const terms = query.trim().split(/\s+/).filter(Boolean).map(term => `"${term.replaceAll('"', '""')}"`)
  if (!terms.length) return []
  const match = terms.join(' AND ')
  const maxResults = Math.min(Math.max(limit, 1), 50)
  const acts = db.prepare(`
    SELECT l.id, l.title, l.identifier, l.adopted_at AS adoptedAt,
      snippet(laws_fts, 2, '<mark>', '</mark>', '…', 24) AS snippet
    FROM laws_fts JOIN laws l ON l.rowid = laws_fts.rowid
    WHERE laws_fts MATCH ? ORDER BY rank LIMIT ?
  `).all(match, maxResults) as Array<{ id: string; title: string; identifier: string; snippet: string }>
  const sections = db.prepare(`
    SELECT l.title, l.identifier AS actIdentifier, s.id AS sectionIdentifier,
      snippet(sections_fts, 4, '<mark>', '</mark>', '…', 24) AS snippet
    FROM sections_fts
      JOIN sections s ON s.rowid = sections_fts.rowid
      JOIN laws l ON l.id = s.law_id
    WHERE sections_fts MATCH ? ORDER BY rank LIMIT ?
  `).all(match, maxResults) as Array<{
    title: string
    actIdentifier: string
    sectionIdentifier: string
    snippet: string
  }>

  const actResults = acts.map(({ id, title, identifier, snippet }) => {
    const url = `/api/acts/${encodeURIComponent(id)}`
    return { title, actIdentifier: identifier, snippet, url, resource: url }
  })
  const sectionResults = sections.map(({ title, actIdentifier, sectionIdentifier, snippet }) => {
    const url = `/api/sections/${encodeURIComponent(sectionIdentifier)}`
    return { title, actIdentifier, sectionIdentifier, snippet, url, resource: url }
  })
  return [...sectionResults, ...actResults].slice(0, maxResults)
}

export function createMcpServer() {
  const server = new McpServer({ name: 'riigiteataja-offline', version: '1.0.0' })
  server.registerTool('search', {
    description: 'Search Estonian legislation imported from Riigi Teataja XML archives.',
    inputSchema: {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional()
    }
  }, async ({ query, limit }) => ({
    content: [{ type: 'text', text: JSON.stringify(searchLaws(query, limit || 10)) }]
  }))
  server.registerTool('get_act', {
    description: 'Get one act, its metadata, sections, and canonical XML text by actIdentifier. The legacy id field is accepted as an alias for actIdentifier.',
    inputSchema: {
      actIdentifier: z.string().min(1).optional(),
      id: z.string().min(1).optional()
    }
  }, async ({ actIdentifier, id }) => {
    const identifier = actIdentifier || id
    const act = identifier ? getAct(identifier) : null
    return { content: [{ type: 'text', text: JSON.stringify(act || { error: 'Act not found' }) }], isError: !act }
  })
  server.registerTool('get_section', {
    description: 'Get one section by sectionIdentifier, optionally constrained by actIdentifier. The legacy id field is accepted as an alias for sectionIdentifier.',
    inputSchema: {
      actIdentifier: z.string().min(1).optional(),
      sectionIdentifier: z.string().min(1).optional(),
      id: z.string().min(1).optional()
    }
  }, async ({ actIdentifier, sectionIdentifier, id }) => {
    const section = getSection({ actIdentifier, sectionIdentifier, id })
    return { content: [{ type: 'text', text: JSON.stringify(section || { error: 'Section not found' }) }], isError: !section }
  })
  server.registerTool('archive_status', {
    description: 'Get archive configuration, import status, and extracted item counts.',
    inputSchema: {}
  }, async () => ({
    content: [{ type: 'text', text: JSON.stringify(archiveStatus()) }]
  }))
  return server
}
