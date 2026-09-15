import { archiveStatus, getDatabase, latestImport } from '../utils/db'

export default defineEventHandler(() => {
  const db = getDatabase()
  const row = db.prepare('SELECT COUNT(*) AS count FROM laws').get() as { count: number }
  return { ok: true, laws: row.count, latestImport: latestImport(), archive: archiveStatus() }
})
