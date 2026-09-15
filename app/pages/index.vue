<script setup lang="ts">
type Result = { id: string; title: string; identifier: string; adoptedAt?: string; amendedAt?: string; snippet?: string }
const q = ref('')
const results = ref<Result[]>([])
const loading = ref(false)
const error = ref('')
const imported = ref(false)

async function search() {
  if (!q.value.trim()) { results.value = []; return }
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ results: Result[] }>('/api/search', { query: { q: q.value } })
    results.value = response.results
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Search failed'
  } finally { loading.value = false }
}

async function importArchive() {
  imported.value = false
  try {
    await $fetch('/api/import', { method: 'POST' })
    imported.value = true
    if (q.value) await search()
  } catch (err) { error.value = err instanceof Error ? err.message : 'Import failed' }
}

const { data: health } = await useFetch<{ laws: number }>('/api/health')
</script>

<template>
  <main>
    <header>
      <p class="muted">Offline legal reference</p>
      <h1>Riigi Teataja Offline</h1>
      <p class="muted">Search the canonical XML archive imported from a mounted ZIP.</p>
      <NuxtLink to="/archive">Archive status</NuxtLink>
    </header>
    <section class="card">
      <form class="search" @submit.prevent="search">
        <input v-model="q" aria-label="Search laws" placeholder="Search title or full text…" />
        <button :disabled="loading">{{ loading ? 'Searching…' : 'Search' }}</button>
      </form>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="imported">Import completed.</p>
      <p v-if="!loading && q && !results.length" class="muted">No results.</p>
      <article v-for="result in results" :key="result.id" class="result">
        <NuxtLink :to="`/acts/${encodeURIComponent(result.id)}`"><strong>{{ result.title }}</strong></NuxtLink>
        <div class="muted">{{ result.identifier }} <span v-if="result.adoptedAt">· {{ result.adoptedAt }}</span></div>
        <p v-if="result.snippet" v-html="result.snippet" />
      </article>
    </section>
    <p class="muted">Indexed laws: {{ health?.laws ?? 0 }} · <button @click="importArchive">Import mounted ZIP</button></p>
  </main>
</template>
