# Database, archive import, and MCP

## Database model

The application uses one SQLite database at `RT_DATA_DIR/riigiteataja.sqlite`
(normally `/data/riigiteataja.sqlite`). The schema is created by
[`server/utils/db.ts`](../server/utils/db.ts).

- `laws` stores one imported act, including metadata, extracted text, and the
  original canonical XML.
- `sections` stores the hierarchy extracted from each law.
- `articles` stores article-level records linked to both a law and a section.
- `import_runs` records import history.
- `app_meta` stores application metadata such as the imported archive SHA-256.
- `laws_fts` and `sections_fts` are SQLite FTS5 indexes used for fast search.

Foreign keys cascade from laws to sections and articles. The XML remains the
source of truth; the relational rows and FTS indexes are derived data.

## Archive download and import

ZIP archives are read from `RT_DATA_DIR/import`. A configured archive URL or
discovery URL can also be downloaded automatically. The importer in
[`server/utils/importer.ts`](../server/utils/importer.ts):

1. Finds a mounted ZIP, or downloads one when automatic download is enabled.
2. Reads and hashes the ZIP. An unchanged SHA-256 is skipped.
3. Extracts XML files and parses each file into a law, sections, and articles.
4. Stores the records in SQLite inside a transaction.
5. Rebuilds the FTS5 indexes and records the import result.

This is done so the original legal XML is preserved while the application can
search and browse normalized metadata and extracted text locally. SQLite keeps
the app self-contained, supports FTS5 search, and avoids a separate database
service. The archive can be reimported when needed; the archive-management
controls also allow the ZIP and imported database data to be cleared separately.

## MCP tools

The MCP server is available at `/mcp` using Streamable HTTP. It registers four
tools in [`server/utils/mcp.ts`](../server/utils/mcp.ts):

- `search(query, limit?)` — searches laws and sections and returns snippets and
  local API/resource links.
- `get_act(actIdentifier)` — returns act metadata, extracted sections, and
  canonical XML. The legacy `id` input is also accepted.
- `get_section(sectionIdentifier, actIdentifier?)` — returns a section, its
  articles, and exact text. The legacy `id` input is also accepted.
- `archive_status()` — returns archive configuration, import status, and counts
  of laws, sections, and articles.
