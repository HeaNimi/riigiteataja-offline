import { getQuery } from 'h3'
import { getDatabase } from '../utils/db'

export default defineEventHandler((event) => {
  const query = String(getQuery(event).q || '').trim()
  const requestedLimit = Number(getQuery(event).limit || 20)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 50)
  if (!query) return { query, results: [] }
  const terms = query.split(/\s+/).filter(Boolean).map(term => `"${term.replaceAll('"', '""')}"`)
  const results = getDatabase().prepare(`
    SELECT l.id, l.title, l.identifier, l.adopted_at AS adoptedAt, l.amended_at AS amendedAt,
      snippet(laws_fts, 2, '<mark>', '</mark>', '…', 24) AS snippet
    FROM laws_fts JOIN laws l ON l.rowid = laws_fts.rowid
    WHERE laws_fts MATCH ? ORDER BY rank LIMIT ?
  `).all(terms.join(' AND '), limit)
  return { query, results }
})
