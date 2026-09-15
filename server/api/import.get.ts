import { latestImport } from '../utils/db'

export default defineEventHandler(() => ({ latestImport: latestImport() }))
