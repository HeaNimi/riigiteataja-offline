import { downloadConfiguredArchive, importMountedArchive } from '../../utils/importer'

export default defineEventHandler(async () => {
  const archive = await downloadConfiguredArchive()
  const result = await importMountedArchive(archive)
  return { archive, result }
})
