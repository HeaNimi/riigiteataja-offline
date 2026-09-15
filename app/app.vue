<script setup lang="ts">
useHead({
  titleTemplate: (title) => title ? `${title} · Riigi Teataja Offline` : 'Riigi Teataja Offline',
  meta: [{ name: 'description', content: 'Search an offline Riigi Teataja XML archive.' }]
})
</script>

<template>
  <NuxtPage />
</template>

<style>
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #17202a; background: #f4f6f8; }
* { box-sizing: border-box; }
body { margin: 0; }
a { color: #125e9c; text-decoration: none; }
a:hover { text-decoration: underline; }
main { max-width: 960px; margin: 0 auto; padding: 2rem 1rem 4rem; }
.card { background: #fff; border: 1px solid #dce2e7; border-radius: 10px; padding: 1.25rem; box-shadow: 0 1px 2px #0000000c; }
button, input { font: inherit; }
button { background: #1261a0; border: 0; border-radius: 6px; color: white; cursor: pointer; padding: .65rem 1rem; }
button:disabled { opacity: .6; cursor: wait; }
input { border: 1px solid #aab5bf; border-radius: 6px; padding: .65rem; width: 100%; }
.search { display: flex; gap: .6rem; margin: 1.25rem 0; }
.search input { flex: 1; }
.muted { color: #5f6b75; }
.result { border-top: 1px solid #e6eaed; padding: 1rem 0; }
mark { background: #fff0a6; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
