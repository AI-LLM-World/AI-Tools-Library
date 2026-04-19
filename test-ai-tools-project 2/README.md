GStack Phase 3 API scaffold
===========================

This repository contains a minimal scaffold for Phase 3: Next.js Route Handlers and a Prisma schema.

Getting started (local)
-----------------------
1. Install dependencies: `npm install`
2. Generate the Prisma client: `npm run prisma:generate`
3. Run the initial migration (creates sqlite dev.db): `npm run prisma:migrate:dev`
4. Start a Next.js dev server (not included in this scaffold) or import the route handlers into your app.

Notes
-----
- Auth helper is a placeholder. Replace with JWT validation in production.
- Prisma datasource uses SQLite for local testing. Switch to Postgres in production and create proper migrations.
