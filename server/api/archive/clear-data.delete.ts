import { clearImportedData } from '../../utils/db'

export default defineEventHandler(() => {
  clearImportedData()
  return { cleared: true }
})
