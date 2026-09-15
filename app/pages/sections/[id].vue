<script setup lang="ts">
const route = useRoute()
const { data: section, error } = await useFetch<{
  id: string; lawId: string; actTitle: string; actIdentifier: string
  sectionNumber: string; sectionType: string; title: string; body: string
  articles: Array<{ id: string; articleNumber: string; title: string; body: string }>
}>(`/api/sections/${encodeURIComponent(String(route.params.id))}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: error.value.statusMessage })
</script>

<template>
  <main>
    <NuxtLink v-if="section" :to="`/laws/${encodeURIComponent(section.lawId)}`">← {{ section.actTitle }}</NuxtLink>
    <section v-if="section" class="card" style="margin-top: 1rem">
      <p class="muted">{{ section.actIdentifier }} · {{ section.sectionType }}</p>
      <h1>{{ section.sectionNumber }}<span v-if="section.title"> {{ section.title }}</span></h1>
      <p>{{ section.body }}</p>
      <div v-if="section.articles.length">
        <h2>Articles</h2>
        <article v-for="article in section.articles" :key="article.id" class="result">
          <h3>{{ article.articleNumber }}<span v-if="article.title"> {{ article.title }}</span></h3>
          <p>{{ article.body }}</p>
        </article>
      </div>
    </section>
  </main>
</template>
