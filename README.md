# Riigi Teataja Offline

Minimal Nuxt 4 application for searching a local Riigi Teataja XML archive. ZIP
files are mounted into `/data/import`; XML is kept as the canonical source and
metadata, extracted sections/articles, plus a SQLite FTS5 index are generated in
`/data/riigiteataja.sqlite`.

## Run with Docker

```sh
cp .env.example .env
mkdir -p data/import
# Copy the current Riigi Teataja XML ZIP into data/import/
docker compose up --build
```

Open <http://localhost:3000>. The app imports the first ZIP in `/data/import`
on startup. Set `RT_AUTO_DOWNLOAD=true` to download the configured archive when
no mounted ZIP exists. A download or import failure stops startup when that
option is enabled; with it disabled, the service stays available with its
existing database.

For local development, use Node 22 and run `npm install && npm run dev`.

## Endpoints

- `GET /api/health` — index count and last import
- `GET /api/search?q=...` — FTS5 search
- `GET /api/acts/:id` — act metadata, extracted sections, and canonical XML text
- `GET /api/laws/:id` — compatibility alias for the act endpoint
- `GET /api/sections/:id` — extracted section and articles
- `GET /api/archive-status` (also `/api/archive/status`) — archive/import details
- `/archive` — archive status page
- `POST /api/import` — re-scan the mounted ZIP
- `/mcp` — MCP Streamable HTTP endpoint with exactly these tools:
  `search(query, limit?)`, `get_act(actIdentifier)` (legacy `id` alias accepted),
  `get_section(sectionIdentifier, actIdentifier?)` (legacy `id` alias accepted),
  and `archive_status()`. Search results include the act title and identifier,
  an optional section identifier, a text snippet, and a local API URL/resource.
  `get_section` returns the act title, section number/title, and exact section
  text (plus extracted articles).

Environment variables are documented in `.env.example`.
