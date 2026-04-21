# PPD-LAB — Aryan

Standalone workspace: React client (`client/`, Mantine UI) and Fastify API (`server/`).

## Setup

1. `npm install`
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL`, `JWT_SECRET` (≥32 chars), and `CLIENT_ORIGIN` (use `http://localhost:5174` for local dev — Vite runs on 5174).
3. `npm run db:migrate -w server`
4. `npm run dev`

Production client builds may set `VITE_API_URL` in `client/.env.production` to your API base URL.
