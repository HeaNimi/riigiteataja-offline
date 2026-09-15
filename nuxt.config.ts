export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [],
  typescript: {
    strict: true,
    typeCheck: true
  },
  runtimeConfig: {
    rtDataDir: process.env.RT_DATA_DIR || '/data',
    rtArchiveYear: process.env.RT_ARCHIVE_YEAR || '',
    rtArchiveUrl: process.env.RT_ARCHIVE_URL || '',
    rtDiscoveryUrl: process.env.RT_DISCOVERY_URL || '',
    rtAutoDownload: process.env.RT_AUTO_DOWNLOAD === 'true',
    public: {
      appName: 'Riigi Teataja Offline'
    }
  },
  nitro: {
    experimental: {
      wasm: true
    }
  }
})
