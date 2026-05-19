# Collaborative Wiki Backend

A production-ready collaborative wiki backend built using **Node.js, Express.js, MongoDB, and Docker**. This project implements advanced MongoDB concepts like **Optimistic Concurrency Control (OCC)**, **full-text search**, **schema migration**, and **analytics aggregation pipelines**.

## Features

- CRUD APIs for document management
- Optimistic Concurrency Control (OCC)
- Full-text search with tag filtering
- Analytics endpoints for document insights
- Background schema migration support
- Automatic database seeding
- Docker & Docker Compose support

## Tech Stack

- Node.js
- Express.js
- MongoDB 7
- Docker & Docker Compose

## API Endpoints

### Documents
- `POST /api/documents` → Create document
- `GET /api/documents/:slug` → Get document
- `PUT /api/documents/:slug` → Update document (OCC)
- `DELETE /api/documents/:slug` → Delete document

### Search
- `GET /api/search?q=keyword`
- `GET /api/search?q=keyword&tags=tag1,tag2`

### Analytics
- `GET /api/analytics/most-edited`
- `GET /api/analytics/tag-cooccurrence`

## Run Project

```bash
docker-compose up --build
```

## Environment Variables

Create `.env` file:

```env
PORT=4000
MONGO_URI=mongodb://root:example@mongo:27017/?authSource=admin
DATABASE_NAME=wiki
```

## Migration Script

Run background schema migration:

```bash
node scripts/migrate_author_schema.js
```

### Conclusion

This project implements OCC-based conflict handling, graceful schema evolution (lazy + background migration), basic full-text search, and analytics in a compact, production-ready backend.


