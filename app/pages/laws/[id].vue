<script setup lang="ts">
const route = useRoute()
const { data: law, error } = await useFetch<{
  id: string; title: string; identifier: string; adoptedAt?: string; amendedAt?: string
  xmlPath: string; sourceUrl?: string; body: string; canonicalXml: string
  sections: Array<{ id: string; sectionNumber: string; sectionType: string; title: string; body: string }>
}>(`/api/acts/${encodeURIComponent(String(route.params.id))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: error.value.statusMessage })
</script>

<template>
  <main>
    <NuxtLink to="/">← Search</NuxtLink>
    <section v-if="law" class="card" style="margin-top: 1rem">
      <h1>{{ law.title }}</h1>
      <p class="muted">{{ law.identifier }} <span v-if="law.adoptedAt">· adopted {{ law.adoptedAt }}</span></p>
      <p class="muted">Canonical source: {{ law.xmlPath }}</p>
      <h2>Sections</h2>
      <p v-if="!law.sections.length" class="muted">No sections were extracted from this act.</p>
      <ul v-else>
        <li v-for="section in law.sections" :key="section.id">
          <NuxtLink :to="`/sections/${encodeURIComponent(section.id)}`">
            {{ section.sectionNumber }}<span v-if="section.title"> {{ section.title }}</span>
          </NuxtLink>
        </li>
      </ul>
      <details open>
        <summary>Indexed XML text</summary>
        <pre>{{ law.canonicalXml }}</pre>
      </details>
    </section>
  </main>
</template>
