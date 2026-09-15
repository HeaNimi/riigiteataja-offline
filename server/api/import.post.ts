import { importMountedArchive } from '../utils/importer'

export default defineEventHandler(async () => {
  const result = await importMountedArchive()
  return { result }
})
