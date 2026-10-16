# Recap

Daily and weekly work overview with AI summaries, from Jira, Linear, GitHub, Slack, Google Chat, and Google Calendar.

## Layout

| Path | What |
|---|---|
| `apps/api` | Elysia API on Cloudflare Workers (D1, KV). Better Auth, one Elysia plugin per module in `src/modules`. |
| `apps/web` | Vite + React + TanStack Router/Query + shadcn/ui. Deploys to Cloudflare Workers (static assets). |
| `packages/db` | Drizzle schema, client, and migrations (Cloudflare D1, SQLite). |

## Start

```bash
for d in apps/api apps/web packages/db; do cp $d/.env.example $d/.env; done
# then set BETTER_AUTH_SECRET in apps/api/.env (openssl rand -base64 32)
bun install
bunx wrangler login             # dev uses the remote dev D1 and KV
bun run dev:api                 # wrangler dev --env dev, http://localhost:3000 (OpenAPI at /openapi)
bun run dev:web                 # http://localhost:5173
```

Before the first deploy, run `scripts/provision-workers.sh` once. It creates the D1 databases and KV namespaces with `wrangler` and writes their IDs into `apps/api/wrangler.jsonc`.

## Scripts

| Script | What |
|---|---|
| `check` | Everything CI runs: `lint`, `lint:files`, `lint:comments`, `lint:fallow`, `typecheck`, `build` |
| `lint` / `format` | Biome with the GritQL plugins in `tooling/biome-plugins` |
| `lint:files` | ls-lint file and folder names (`.ls-lint.yml`) |
| `lint:comments` | Only `TODO:` and tool directives are allowed as comments |
| `lint:fallow` | Dead code, duplicates, complexity, architecture boundaries (`.fallowrc.json`) |
| `db:generate` / `db:studio` | Drizzle migrations and studio (wrangler applies migrations) |

Coding standards: see [AGENTS.md](AGENTS.md).
