<script setup lang="ts">
const route = useRoute()
const { data: act, error } = await useFetch<{
  id: string; title: string; identifier: string; adoptedAt?: string; amendedAt?: string
  xmlPath: string; sections: Array<{ id: string; sectionNumber: string; sectionType: string; title: string; body: string }>
}>(`/api/acts/${encodeURIComponent(String(route.params.id))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: error.value.statusMessage })
</script>

<template>
  <main>
    <NuxtLink to="/">← Search</NuxtLink>
    <section v-if="act" class="card" style="margin-top: 1rem">
      <h1>{{ act.title }}</h1>
      <p class="muted">{{ act.identifier }} <span v-if="act.adoptedAt">· adopted {{ act.adoptedAt }}</span></p>
      <p class="muted">Canonical source: {{ act.xmlPath }}</p>
      <h2>Sections</h2>
      <p v-if="!act.sections.length" class="muted">No sections were extracted from this act.</p>
      <ul v-else>
        <li v-for="section in act.sections" :key="section.id">
          <NuxtLink :to="`/sections/${encodeURIComponent(section.id)}`">
            {{ section.sectionNumber }}<span v-if="section.title"> {{ section.title }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>
