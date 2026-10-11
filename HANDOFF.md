# Recap handoff (2026-10-11)

## Goal

Recap is a multi-user platform that gives a daily and weekly overview of a person's work, with an AI summary. It pulls data from Jira, Google Chat, Google Calendar and GitHub (Sazim), and from Linear, Slack, Google Calendar and GitHub (Lune). Users bring their own AI API key (Anthropic, OpenAI, Gemini or Ollama) and configure the digests.

The first session set up the monorepo, auth and coding standards. The second session added CI, CD and the cloud setup. There is no feature code yet.

## State

- Repo: https://github.com/AmiyoKm/recap-monorepo (private). Use the `AmiyoKm` gh account (`GH_TOKEN=$(gh auth token -u AmiyoKm)`).
- Branches: `development` is the default and the PR base. `prod` is production. `main` still exists from the first commit and has no use.
- PRs are squash-merged. Do not wait for CodeRabbit or other review bots. Wait only for the GitHub Actions CI.
- **Open PR #5** (`chore/ci-one-job-split-deploys`): CI runs in one job, and `deploy.yml` is split into `dev-deploy.yml` and `prod-deploy.yml`. CI result not checked yet. `development` still has the old `ci.yml` (4 jobs) and `deploy.yml` until #5 merges.
- Dependabot PRs #2 and #3 bump `docker/setup-buildx-action` to v4 and `docker/build-push-action` to v7 (major versions). Not reviewed.
- Dev is live: the first deploys from `development` passed. `https://recap-api-dev.amiyo.lol/health` returned `{"status":"ok"}`.
- Prod is not deployed. `recap-api-prod` runs the Cloud Run placeholder image until the first push to `prod`.
- **Local services were never started with Compose.** Run `docker compose down` then `bun run services:up`. Auth was tested end to end only with temporary host-network containers, before the Redis code moved into `RedisStorageService`.

## Stack

| Layer | Choice |
|---|---|
| Runtime and package manager | Bun 1.4.2, Bun workspaces with a `catalog` |
| API | Elysia 1.4 (`apps/api`) on GCP Cloud Run |
| Auth | Better Auth 1.7, Drizzle adapter, Redis as secondary storage (sessions also kept in Postgres) |
| DB | Drizzle 0.45 with the `bun-sql` driver (`packages/db`), Postgres 18 (Neon in dev and prod) |
| Cache | Redis 8, through Bun's built-in `RedisClient` (Upstash in dev and prod) |
| Web | Vite 8, React 19 with React Compiler, TanStack Router and Query, shadcn/ui (all 61 components), Tailwind 4 with the user's theme in `apps/web/src/index.css` |
| Web deploy | Cloudflare Workers static assets (`apps/web/wrangler.jsonc`), deployed with `wrangler deploy --name --domain` |
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
- **CI**: `.github/workflows/ci.yml` runs on PRs to `development`: lint, file names, comments, fallow, typecheck, web build, API build and API Docker image build. Actions are pinned to commit SHAs, and Dependabot updates them weekly.

Main conventions (full list in `AGENTS.md`):

- Luminar file kinds: `.tsx`, `.helpers`, `.hooks`, `.types`, `.interfaces`, `.constants`, `.enums`, with `I`, `T` and `E` name prefixes.
- Web: thin `routes/` render one container. `features/<feature>/{containers,components}/<Name>/` folders nest. Only `src/api/<domain>/` (keys, queries, mutations) calls the API.
- API: `modules/<feature>/<feature>.{module,service,model,...}.ts`. Modules only route. Services do the work.
- Go-style early returns, with no `else` (plugins `no-else` and `no-inverted-guard`).
- Redis commands come from `ERedisCommand` and `ERedisSetOption`, never string literals (plugin `no-raw-redis-command`).
- No `Date` global. Error messages come from `E<Name>Messages` enums. No `../` imports: use `@/`, `#api/` or `#db/`.

## Infrastructure

Everything stays on free tiers. Only GCP can bill. The user did the setup by hand in the web UIs.

| Part | Service | Details |
|---|---|---|
| API | Cloud Run, `us-central1`, project `recap-511217` | `recap-api-dev` and `recap-api-prod`. `min-instances 0`, `max-instances 1`, 512 MiB, request-based billing, no CPU boost. Runs as `recap-api-runtime`. |
| API images | Artifact Registry `recap` in `us-central1` | `api-dev` and `api-prod`. A cleanup policy keeps the last 2 versions (free limit 0.5 GB). |
| Secrets | Secret Manager, `us-central1` | `recap-{dev,prod}-database-url`, `recap-{dev,prod}-auth-secret`, `recap-redis-url`. 5 of the 6 free versions. To change one, add a version, then destroy the old one. |
| CI login | Workload Identity Federation | Pool `github`, provider `recap-monorepo`. Only pushes to `development` and `prod` in this repo can act as `recap-deployer` (Cloud Run Admin, Artifact Registry Writer, access to the 2 database secrets). |
| Postgres | Neon, AWS US East (Ohio) | 2 projects, `recap-dev` and `recap-prod`. Max 0.25 CU, scale to zero after 5 minutes. Direct (not pooled) URLs. |
| Redis | Upstash, US East, free plan | 1 database for both environments. Keys get the prefix `dev:` or `prod:` from `REDIS_KEY_PREFIX`. Do not add a card. |
| Web | Cloudflare Workers | `recap-web-dev` and `recap-web`. Workers custom domains get their own certificate, so 2-level hosts work. |
| DNS | Cloudflare, `amiyo.lol` | API hosts are CNAMEs to `ghs.googlehosted.com` with proxy off (Cloud Run domain mappings, a preview feature). |
| Cost guard | GCP budget `recap-free-tier` | USD 1, alerts at 50%, 90% and 100%. Alerts do not stop billing. |

| Environment | Branch | Workflow | Web | API |
|---|---|---|---|---|
| dev | `development` | `dev-deploy.yml` | `dev.recap.amiyo.lol` | `recap-api-dev.amiyo.lol` |
| prod | `prod` | `prod-deploy.yml` | `recap.amiyo.lol` | `recap-api-prod.amiyo.lol` |

Each deploy: build and push the image, run migrations with the database URL from Secret Manager, deploy to Cloud Run, check `/health` on the `run.app` URL, build the web app with `VITE_API_URL`, then `wrangler deploy`.

GitHub repo variables: `APP_DOMAIN` (`amiyo.lol`), `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`, `GCP_RUNTIME_SA`, `CLOUDFLARE_ACCOUNT_ID`. Secret: `CLOUDFLARE_API_TOKEN`.

## Decisions and trade-offs

- Named exports only, with an `index.ts` barrel per component folder. Default exports only in `*.config.ts`.
- `exactOptionalPropertyTypes` is off, and `noPropertyAccessFromIndexSignature` is off in the web app only, because shadcn code fails them. Biome `useLiteralKeys` is off, because it conflicts with `noPropertyAccessFromIndexSignature`.
- `packages/db/src/schema/auth.ts` is the Better Auth default schema, edited by hand. The user removed the CLI generator. When you add a Better Auth plugin, update the file from the Better Auth docs and run `bun run db:generate`.
- The `Container` folder suffix is a convention only. ls-lint cannot check it without overlapping keys.
- `authClient` in `apps/web/src/api/client/index.ts` has no users yet, so fallow is told to ignore it.
- The user removed the plugin fixture harness. Test a new plugin with a temporary probe file and `bunx biome lint <file>`.
- Each workspace has its own `.env` and `.env.example`. Bun loads the package's `.env`, and Vite reads `apps/web/.env`.
- Deployed APIs use host-only auth cookies (no `COOKIE_DOMAIN`). All hosts are on `amiyo.lol`, so web and API are the same site and sign-in works. A shared `.amiyo.lol` cookie would send prod sessions to the dev API.
- Neon and Upstash instead of Cloud SQL and Memorystore, because those have no free tier.
- `us-central1` instead of an Asia region, so the API to database traffic stays inside North America. Each call is slower for the user (UTC+6).
- Artifact Registry instead of Docker Hub, so the image stays private. `bun build --compile` puts the bundled source in the binary.
- The API `Dockerfile` runs `bun install --ignore-scripts`, because the root `prepare` script runs `lefthook install` and the image has no `git`.

## Open items

1. Check CI on PR #5 and merge it. After the merge, `development` uses `dev-deploy.yml`.
2. Test sign-up and sign-in on `https://dev.recap.amiyo.lol`. A reload must keep the session.
3. Remove old hosts from the first deploy: `dev.amiyo.lol` on the `recap-web-dev` Worker (Settings → Domains & Routes), and any old `dev-api` or `api` CNAME records.
4. First prod deploy: open a PR from `development` to `prod`, merge it, then check `https://recap-api-prod.amiyo.lol/health` and `https://recap.amiyo.lol`.
5. Set `advanced.ipAddress` in `apps/api/src/modules/auth/auth.service.ts` to read `X-Forwarded-For` before real users sign up. Without it, Better Auth rate limits share one bucket on Cloud Run.
6. Google sign-in (not done): make 1 OAuth web client with the redirect URIs `https://recap-api-{dev,prod}.amiyo.lol/api/auth/callback/google`. Put the client ID in a GitHub variable and the secret in Secret Manager as `recap-google-client-secret` (the 6th free version). Then add both to `--set-env-vars` and `--set-secrets` in both deploy files. For local use, fill them in `apps/api/.env`.
7. Review Dependabot PRs #2 and #3 (major version bumps).
8. Start the local services and run the migration: `docker compose down && bun run services:up && bun run db:migrate`. Then retest `/health`, sign-up and session.
9. `/health` returns a raw 500 with the SQL error when a dependency is down. It should catch the error and return 503 with a clear status (offered, not done).
10. Optional: delete the unused `main` branch on GitHub.
11. Product work has not started. Next step from the user's workflow: `/grill-with-docs` on scope (MVP sources, data policy for sending employer data to AI APIs, Google Chat admin approval), then a spec.

## Product notes from the brainstorm

- Feasibility risk: Google Chat needs Workspace admin approval for `chat.messages.readonly`. A Slack app install can need admin approval.
- Data policy: sending employer data to AI APIs needs approval from each employer. A local model (Ollama) is one option.
- Planned architecture: connectors sync into one `events` table. A rules layer builds lists without AI (PRs to review, calendar clashes). The AI layer only writes the summary. Sync and digests run as Cloud Run Jobs from Cloud Scheduler, with Cloud Tasks for fan-out per source.
- Feature ideas: morning brief, "waiting on me" queue, cross-org calendar clashes, end-of-day log, weekly report.
