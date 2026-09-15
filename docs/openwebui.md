# OpenWebUI connection

Run this service on a network address reachable by OpenWebUI (for example,
`http://riigiteataja:3000`). Add an OpenAPI/MCP connection pointing to:

```text
http://riigiteataja:3000/mcp
```

The MCP server exposes:

- `search(query, limit?)` for full-text searches. Each result has `title`,
  `actIdentifier`, `snippet`, and a local `url`/`resource`; section matches
  also have `sectionIdentifier`.
- `get_act(actIdentifier)` for act metadata, extracted sections, and canonical
  XML text. The legacy `id` input is accepted as an alias for `actIdentifier`.
- `get_section(sectionIdentifier, actIdentifier?)` for an extracted section,
  its act title, section number/title, exact text, and articles. The legacy
  `id` input is accepted as an alias for `sectionIdentifier`; supplying both
  identifiers constrains the lookup to that act.
- `archive_status()` for archive configuration and import counts

Keep the `/data` volume persistent. OpenWebUI should be treated as a client:
archive ZIP files are copied to `data/import` and imported by this service.
