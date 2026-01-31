# Forms Backend

This repository contains the backend service for the Forms project: a modular, TypeScript-based Express API that handles authentication, form management, and submission processing. It's written to be simple to extend and to integrate with the frontend in the same workspace.

---  

## How it works (high level)

- `server.ts` boots the HTTP server and reads environment configuration.
- `app.ts` creates the Express application, applies global middleware (CORS, JSON body parsing), registers routes from the feature modules, and wires global error handling.
- Feature modules live under `src/modules/*` and follow a pattern:
	- `*.routes.ts` — defines Express routes and mounts handlers
	- `*.controller.ts` — request handlers that orchestrate service calls
	- `*.service.ts` — business logic and database interactions
	- `*.schemas.ts` — request/response validation schemas (used by the validate middleware)
- Prisma (in `prisma/`) provides the ORM layer and schema; migrations are stored under `prisma/migrations`.

Middleware and utilities (e.g. `auth.middleware.ts`, `error.middleware.ts`, `validate.middleware.ts`, `jwt.ts`, `password.ts`) implement cross-cutting concerns such as authentication, validation, error normalization, and helpers used across modules.

---

## Project structure (explained)

Top-level layout (important files and folders):

- `prisma/`
	- `schema.prisma` — database schema and model definitions used by Prisma.
	- `migrations/` — generated migration SQL files.

- `src/`
	- `app.ts` — builds and configures the Express app (middleware, routes).
	- `server.ts` — starts the HTTP server and reads `PORT`/env.
	- `config/`
		- `env.ts` — centralizes environment variables and default values.
		- `prisma.ts` — Prisma client initialization.
	- `middlewares/`
		- `auth.middleware.ts` — protects routes and attaches `req.user`.
		- `validate.middleware.ts` — runs request validation against schemas.
		- `error.middleware.ts` — central error handler that formats API errors.
	- `modules/` (feature folders)
		- `auth/` — login, register, OAuth handlers (`auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.schemas.ts`).
		- `users/` — user CRUD and admin utilities.
		- `forms/` — create, edit, list, publish forms.
		- `submissions/` — submit and list submission entries.
	- `types/` — project-wide TypeScript augmentations (e.g., `express.d.ts` to type `req.user`).
	- `utils/` — helpers like `jwt.ts`, `password.ts`, `logger.ts`,`redis.ts`, `httpError.ts`, and `asyncHandler.ts`.

---

## API shape and conventions

- Successful responses generally follow the shape:

```ts
type SuccessResponse<T> = { success: true; data: T; message?: string }
```

- Errors are normalized by the global `error.middleware` and returned with an appropriate HTTP status and a consistent JSON body.

- Validation is schema-driven: controllers expect validated input from `*.schemas.ts` via `validate.middleware`.

---

## Environment variables

Create a `.env` file (copy from example if provided). Common variables used in this project:

- `DATABASE_URL` — Prisma connection string (Postgres). Example: `postgresql://user:pass@host:5432/db`.
- `PORT` — HTTP server port (default 3000).
- `JWT_SECRET` — secret used to sign access tokens.
- `REDIS_URL` — (optional) Redis connection for sessions/caching.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for Google OAuth flows.

Adjust `src/config/env.ts` if you need custom defaults.

Redis usage
- The backend includes lightweight Redis integration used for caching, session-like data (e.g. refresh token storage or token blacklist), and short-lived locks or rate-limiting. The Redis client is initialized in `src/utils/redis.ts` and exported for use across services.
- Example env value: `REDIS_URL=redis://localhost:6379`
- If you don't provide `REDIS_URL`, Redis features are skipped or disabled by the code that depends on it — check `src/utils/redis.ts` and callers to confirm behavior.

---

## Local development

Install dependencies and start the app (from `backend/`):

```bash
npm install
cp .env.example .env   # or create .env manually
npx prisma migrate dev  # apply migrations and generate client
npm run dev
```

Typical npm scripts available in `package.json`:

- `dev` — start development server with hot-reload (ts-node / nodemon / ts-node-dev)
- `build` — compile TypeScript to JavaScript
- `start` — run compiled production build
- Prisma helpers: `prisma:migrate`, `prisma:studio`, etc.

If you prefer Docker, there is a `Dockerfile` and a `docker-compose.yml` in the backend folder to run the service and the database together.

---

## Running the full stack

1. Start the database (locally or via Docker). If using `docker-compose`, run `docker compose up -d` from the `backend/` folder.
2. Ensure `DATABASE_URL` points to the running DB and run `npx prisma migrate dev`.
3. Start the backend (`npm run dev`) and the frontend in `../frontend2` (`npm run dev`).

---

## Extending the API

- Add a new feature module under `src/modules/<feature>` with `routes`, `controller`, `service`, and `schemas`.
- Register the module's router in `app.ts` to expose the endpoints.
- Use `utils/httpError.ts` and `asyncHandler.ts` for consistent error handling in async route handlers.

---

## Troubleshooting

- If Prisma client generation fails, run `npx prisma generate` and inspect `prisma/schema.prisma`.
- For CORS/auth issues, confirm frontend origin and cookie/token handling; review `src/config/env.ts` and `auth.middleware.ts`.

---
