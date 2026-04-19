# GStack Monorepo (Phase 1)

This repository contains a minimal monorepo scaffold for Phase 1. It includes:

- packages/frontend: React + Vite app
- packages/backend: Express + TypeScript API
- packages/worker: Redis-connected worker stub
- docker-compose.yml: local Postgres + Redis
- GitHub Actions CI skeleton

Getting started (developer)
---------------------------
1. Install Node.js 20 and Docker
2. Run: `npm ci`
3. Start infra: `docker compose up -d`
4. Start apps: `npm run dev`
5. Frontend: http://localhost:5173, Backend: http://localhost:4000/health

Documentation
- AI Tool Library docs: docs/AI_TOOL_LIBRARY.md
