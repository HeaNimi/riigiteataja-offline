<script setup lang="ts">
type ArchiveStatus = {
  dataDir: string; archiveYear: string | null; autoDownload: boolean; archiveUrl: string | null
  archiveSha256: string | null; mountedArchive: string | null; laws: number; sections: number; articles: number
  latestImport: { archive: string; importedAt: string; lawsImported: number; error?: string } | null
}

const { data: status, error } = await useFetch<{
  dataDir: string; archiveYear: string | null; autoDownload: boolean; archiveUrl: string | null
  archiveSha256: string | null; mountedArchive: string | null; laws: number; sections: number; articles: number
  latestImport: { archive: string; importedAt: string; lawsImported: number; error?: string } | null
}>('/api/archive-status')
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, statusMessage: error.value.statusMessage })

const pending = ref('')
const actionError = ref('')

async function action(name: string, method: 'POST' | 'DELETE', confirmation?: string) {
  if (confirmation && !window.confirm(confirmation)) return
  pending.value = name
  actionError.value = ''
  try {
    await $fetch(`/api/archive/${name}`, { method })
    await refreshNuxtData('/api/archive-status')
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Archive operation failed'
  } finally {
    pending.value = ''
  }
}
</script>

<template>
  <main>
    <NuxtLink to="/">← Search</NuxtLink>
    <section v-if="status" class="card" style="margin-top: 1rem">
      <h1>Archive status</h1>
      <dl>
        <dt>Archive year</dt><dd>{{ status.archiveYear || 'not configured' }}</dd>
        <dt>Acts</dt><dd>{{ status.laws }}</dd>
        <dt>Sections</dt><dd>{{ status.sections }}</dd>
        <dt>Articles</dt><dd>{{ status.articles }}</dd>
        <dt>Data directory</dt><dd>{{ status.dataDir }}</dd>
        <dt>Mounted archive</dt><dd>{{ status.mountedArchive || 'none' }}</dd>
        <dt>Last import</dt><dd>{{ status.latestImport?.importedAt || 'never' }}</dd>
      </dl>
      <p v-if="status.latestImport" class="muted">{{ status.latestImport.archive }}</p>
      <p v-if="status.archiveSha256" class="muted">SHA-256: {{ status.archiveSha256 }}</p>
      <p v-if="actionError" role="alert">{{ actionError }}</p>
      <div class="actions">
        <button :disabled="pending !== ''" @click="action('download', 'POST')">
          {{ pending === 'download' ? 'Downloading…' : 'Download and import archive' }}
        </button>
        <button :disabled="pending !== '' || !status.mountedArchive" @click="action('reimport', 'POST')">
          {{ pending === 'reimport' ? 'Reimporting…' : 'Reimport archive' }}
        </button>
        <button :disabled="pending !== '' || !status.mountedArchive" @click="action('delete', 'DELETE', 'Delete the mounted ZIP archive? Imported data will be kept.')">
          Delete ZIP
        </button>
        <button :disabled="pending !== '' || !status.laws" @click="action('clear-data', 'DELETE', 'Clear all imported laws, sections, articles, and import history?')">
          Clear imported data
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.25rem; }
.actions button:nth-child(3), .actions button:nth-child(4) { background: #8b2f2f; }
</style>
