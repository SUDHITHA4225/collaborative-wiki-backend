Collaborative Wiki Backend

Compact backend for collaborative documents using Node.js, Express and MongoDB.

Quick start (Docker)

```bash
copy .env.example .env   # Windows
docker compose up --build
```

Local dev

```bash
npm install
node src/index.js
```

Required env vars

- `PORT`
- `MONGO_URI`
- `DATABASE_NAME`

Core endpoints

- `POST /api/documents` — create (returns `slug`, `version: 1`)
- `GET /api/documents/:slug` — read (auto-upgrades old author schema)
- `PUT /api/documents/:slug` — update with optimistic concurrency (`version` required)
- `DELETE /api/documents/:slug` — delete
- `GET /api/search?q=...&tags=...` — full-text search + tag filter
- `GET /api/analytics/most-edited` — top 10 by revisions
- `GET /api/analytics/tag-cooccurrence` — tag pair counts

Migration script

```bash
node scripts/migrate_author_schema.js
```

Notes

- First run seeds ~1200 documents and creates indexes (unique `slug`, text index on `title` + `content`).
- Revision history capped to the last 20 entries.

Conclusion

This project implements OCC-based conflict handling, graceful schema evolution (lazy + background migration), basic full-text search, and analytics in a compact, production-ready backend.
