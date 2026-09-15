import { archiveStatus } from '../utils/db'
import { mountedArchivePath } from '../utils/importer'

export default defineEventHandler(async () => ({
  ...archiveStatus(),
  mountedArchive: await mountedArchivePath()
}))
