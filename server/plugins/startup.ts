import { getDatabase } from '../utils/db'
import { importMountedArchive } from '../utils/importer'

export default defineNitroPlugin(async () => {
  getDatabase()
  try {
    const result = await importMountedArchive()
    if (result && !result.skipped) console.info(`Imported ${result.lawsImported} laws from ${result.archive}`)
  } catch (error) {
    console.error('Riigi Teataja import failed:', error)
    if (process.env.RT_AUTO_DOWNLOAD?.toLowerCase() === 'true') {
      // Nitro starts listening before async plugins settle; explicitly terminate
      // so a required initial download cannot leave a half-initialized service.
      process.exit(1)
    }
  }
})
