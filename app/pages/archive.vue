<script setup lang="ts">
const { data: status, error } = await useFetch<{
  dataDir: string; archiveYear: string | null; autoDownload: boolean; archiveUrl: string | null
  archiveSha256: string | null; laws: number; sections: number; articles: number
  latestImport: { archive: string; importedAt: string; lawsImported: number; error?: string } | null
}>('/api/archive-status')
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, statusMessage: error.value.statusMessage })
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
        <dt>Last import</dt><dd>{{ status.latestImport?.importedAt || 'never' }}</dd>
      </dl>
      <p v-if="status.latestImport" class="muted">{{ status.latestImport.archive }}</p>
      <p v-if="status.archiveSha256" class="muted">SHA-256: {{ status.archiveSha256 }}</p>
    </section>
  </main>
</template>
