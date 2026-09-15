import { importMountedArchive } from '../../utils/importer'

export default defineEventHandler(async () => {
  const result = await importMountedArchive()
  if (!result) throw createError({ statusCode: 404, statusMessage: 'No archive ZIP is available to import' })
  return { result }
})
