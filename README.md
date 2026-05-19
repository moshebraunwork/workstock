# Jobtracker — Phase 0

Minimal backend: Express + Prisma + Postgres. One table (`jobs`), full CRUD.

## Setup

```bash
npm install
```

Then open `.env` and paste your Postgres connection string into `DATABASE_URL`.

## Create the table

```bash
npm run db:migrate
```

When prompted, name the migration something like `init`.

## Run

```bash
npm run dev
```

Server starts on `http://localhost:4000`.

## Endpoints (try these in Insomnia/Postman)

| Method | URL              | Body (JSON)                                                  |
|--------|------------------|--------------------------------------------------------------|
| GET    | `/health`        | —                                                            |
| GET    | `/jobs`          | —                                                            |
| GET    | `/jobs/:id`      | —                                                            |
| POST   | `/jobs`          | `{ "number": "J-001", "address": "55 Collins", "estimatedCost": 1500, "notes": "optional" }` |
| PATCH  | `/jobs/:id`      | Any subset of the POST fields                                |
| DELETE | `/jobs/:id`      | —                                                            |

`number` and `address` are required on create. `number` must be unique.

## Inspect the DB

```bash
npm run db:studio
```
