# Recap

Daily and weekly work overview with AI summaries, from Jira, Linear, GitHub, Slack, Google Chat, and Google Calendar.

## Layout

| Path | What |
|---|---|
| `apps/api` | Bun + Elysia API. Better Auth, one Elysia plugin per module in `src/modules`. Deploys to Cloud Run. |
| `apps/web` | Vite + React + TanStack Router/Query + shadcn/ui. Deploys to Cloudflare Workers (static assets). |
| `packages/db` | Drizzle schema, client, and migrations (Postgres). |

## Start

```bash
for d in . apps/api apps/web packages/db; do cp $d/.env.example $d/.env; done
# then set BETTER_AUTH_SECRET in apps/api/.env (openssl rand -base64 32)
bun install
bun run services:up             # Postgres 18 + Redis 8
bun run db:migrate
bun run dev:api                 # http://localhost:3000 (OpenAPI at /openapi)
bun run dev:web                 # http://localhost:5173
```

## Scripts

| Script | What |
|---|---|
| `check` | Everything CI runs: `lint`, `lint:files`, `lint:comments`, `lint:fallow`, `typecheck`, `build` |
| `lint` / `format` | Biome with the GritQL plugins in `tooling/biome-plugins` |
| `lint:files` | ls-lint file and folder names (`.ls-lint.yml`) |
| `lint:comments` | Only `TODO:` and tool directives are allowed as comments |
| `lint:fallow` | Dead code, duplicates, complexity, architecture boundaries (`.fallowrc.json`) |
| `db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `services:up` / `services:down` | Local Docker services |

Coding standards: see [AGENTS.md](AGENTS.md).
