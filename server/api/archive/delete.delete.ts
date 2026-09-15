import { deleteMountedArchives } from '../../utils/importer'

export default defineEventHandler(async () => ({
  deleted: await deleteMountedArchives()
}))
