# Recap handoff (2026-10-10)

## Goal

Recap is a multi-user platform that gives a daily and weekly overview of a person's work, with an AI summary. It pulls data from Jira, Google Chat, Google Calendar and GitHub (Sazim), and from Linear, Slack, Google Calendar and GitHub (Lune). Users bring their own AI API key (Anthropic, OpenAI, Gemini or Ollama) and configure the digests.

This first session set up the monorepo, auth and coding standards only. There is no feature code yet.

## State

- Repo: `~/Projects/personal/recap-monorepo`, branch `main`, **no commits yet**. Nothing is pushed. There is no GitHub remote. Use the `AmiyoKm` gh account when you add one.
- `bun run check` passes: Biome, ls-lint, comment check, fallow, typecheck and build.
- **Local services were never started with Compose.** Before the reboot, the kernel modules did not match the running kernel, so Docker could not create networks. The kernel is now `6.18.55-2`, so Docker should work. The containers `recap-monorepo-postgres-1` and `recap-monorepo-redis-1` are still in `Created` from the failed start. Run `docker compose down` then `bun run services:up`.
- Auth was tested end to end (sign-up, session, Redis storage) with temporary host-network containers, before the Redis code moved into `RedisStorageService`. Retest after `services:up`.

## Stack

| Layer | Choice |
|---|---|
| Runtime and package manager | Bun 1.4.2, Bun workspaces with a `catalog` |
| API | Elysia 1.4 (`apps/api`), deploy target GCP Cloud Run |
| Auth | Better Auth 1.7, Drizzle adapter, Redis as secondary storage (sessions also kept in Postgres) |
| DB | Drizzle 0.45 with the `bun-sql` driver (`packages/db`), Postgres 18 (Cloud SQL in production) |
| Cache | Redis 8, through Bun's built-in `RedisClient` |
| Web | Vite 8, React 19 with React Compiler, TanStack Router and Query, shadcn/ui (all 61 components), Tailwind 4 with the user's theme in `apps/web/src/index.css` |
| Web deploy | Cloudflare Workers static assets (`apps/web/wrangler.jsonc`) |
| API client | Eden Treaty (`@elysia/eden`), typed from `TApp` in `apps/api/src/app.types.ts` |
| Dates | dayjs only, from `shared/date/date.helpers.ts` in each app |
| TypeScript | 7.0 (native compiler). No JS compiler API, so tools that need it (such as the comment linter) use `oxc-parser` |

## Quality tooling

`AGENTS.md` holds every coding rule, and `CLAUDE.md` loads it with `@AGENTS.md`. Read `AGENTS.md` before you write code.

- **Biome** (`biome.json`): the recommended preset plus strict rules, and 32 GritQL plugins in `tooling/biome-plugins/{core,react,web,api}`. Each plugin is scoped with `includes`. Plugin globs must start with `**/`, or the plugins do not run.
- **ls-lint** (`.ls-lint.yml`): file and folder names. `${0}` is the current folder name. Do not add keys that overlap on the same path: ls-lint then picks a random winner.
- **Comment check**: `scripts/lint-comments.ts` allows only `TODO:` and tool directives.
- **fallow** (`.fallowrc.json`): dead code, duplicates, complexity and boundary zones. `usedClassMembers` exempts `SecondaryStorage` methods.
- **Git**: lefthook (Biome, ls-lint and comments on commit; commitlint on the message; `bun run check` on push). Commit scopes: `api`, `web`, `db`, `infra`, `deps`, `repo`, `tooling`.
- **CI**: `.github/workflows/quality.yml` runs `bun run check`.

Main conventions (full list in `AGENTS.md`):

- Luminar file kinds: `.tsx`, `.helpers`, `.hooks`, `.types`, `.interfaces`, `.constants`, `.enums`, with `I`, `T` and `E` name prefixes.
- Web: thin `routes/` render one container. `features/<feature>/{containers,components}/<Name>/` folders nest. Only `src/api/<domain>/` (keys, queries, mutations) calls the API.
- API: `modules/<feature>/<feature>.{module,service,model,...}.ts`. Modules only route. Services do the work.
- Go-style early returns, with no `else` (plugins `no-else` and `no-inverted-guard`).
- Redis commands come from `ERedisCommand` and `ERedisSetOption`, never string literals (plugin `no-raw-redis-command`).
- No `Date` global. Error messages come from `E<Name>Messages` enums. No `../` imports: use `@/`, `#api/` or `#db/`.

## Decisions and trade-offs

- Named exports only, with an `index.ts` barrel per component folder. Default exports only in `*.config.ts`.
- `exactOptionalPropertyTypes` is off, and `noPropertyAccessFromIndexSignature` is off in the web app only, because shadcn code fails them. Biome `useLiteralKeys` is off, because it conflicts with `noPropertyAccessFromIndexSignature`.
- `packages/db/src/schema/auth.ts` is the Better Auth default schema, edited by hand. The user removed the CLI generator. When you add a Better Auth plugin, update the file from the Better Auth docs and run `bun run db:generate`.
- The `Container` folder suffix is a convention only. ls-lint cannot check it without overlapping keys.
- `authClient` in `apps/web/src/api/client/index.ts` has no users yet, so fallow is told to ignore it.
- The user removed the plugin fixture harness. Test a new plugin with a temporary probe file and `bunx biome lint <file>`.
- Each workspace has its own `.env` and `.env.example`. Bun loads the package's `.env`, and Vite reads `apps/web/.env`.

## Open items

1. Start the services and run the migration: `docker compose down && bun run services:up && bun run db:migrate`. Then retest `/health`, sign-up and session.
2. Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`.
3. `/health` returns a raw 500 with the SQL error when a dependency is down. It should catch the error and return 503 with a clear status (offered, not done).
4. Set `advanced.ipAddress` in `apps/api/src/modules/auth/auth.service.ts` to the Cloud Run or Cloudflare client IP header before production. Without it, Better Auth rate limits share one bucket.
5. Make the first commit after the user approves.
6. Product work has not started. Next step from the user's workflow: `/grill-with-docs` on scope (MVP sources, data policy for sending employer data to AI APIs, Google Chat admin approval), then a spec.

## Product notes from the brainstorm

- Feasibility risk: Google Chat needs Workspace admin approval for `chat.messages.readonly`. A Slack app install can need admin approval.
- Data policy: sending employer data to AI APIs needs approval from each employer. A local model (Ollama) is one option.
- Planned architecture: connectors sync into one `events` table. A rules layer builds lists without AI (PRs to review, calendar clashes). The AI layer only writes the summary. Sync and digests run as Cloud Run Jobs from Cloud Scheduler, with Cloud Tasks for fan-out per source.
- Feature ideas: morning brief, "waiting on me" queue, cross-org calendar clashes, end-of-day log, weekly report.
