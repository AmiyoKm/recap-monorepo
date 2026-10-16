# Recap handoff (2026-10-17)

## Goal

Recap is a multi-user platform that gives a daily and weekly overview of a person's work, with an AI summary. It pulls data from Jira, Google Chat, Google Calendar and GitHub (Sazim), and from Linear, Slack, Google Calendar and GitHub (Lune). Users bring their own AI API key (Anthropic, OpenAI, Gemini or Ollama) and configure the digests.

The first session set up the monorepo, auth and coding standards. The second session added CI, CD and the Cloudflare setup. There is no feature code yet.

## State

- Repo: https://github.com/AmiyoKm/recap-monorepo (private). Use the `AmiyoKm` gh account (`GH_TOKEN=$(gh auth token -u AmiyoKm)`).
- Branches: `development` is the default and the PR base. `prod` is production. `main` still exists from the first commit and has no use.
- PRs are squash-merged. Do not wait for CodeRabbit or other review bots. Wait only for the GitHub Actions CI.
- **Open PR #5** (`chore/ci-one-job-split-deploys`): CI runs in one job, and `deploy.yml` is split into `dev-deploy.yml` and `prod-deploy.yml`. CI result not checked yet. `development` still has the old `ci.yml` (4 jobs) and `deploy.yml` until #5 merges.
- Dev and prod are not deployed yet. Run `scripts/provision-workers.sh` once to make the D1 databases and KV namespaces, then push to `development`.

## Stack

| Layer | Choice |
|---|---|
| Runtime and package manager | Bun 1.4.2, Bun workspaces with a `catalog` |
| API | Elysia 1.4 (`apps/api`) on Cloudflare Workers (`apps/api/wrangler.jsonc`, environments `dev` and `prod`) |
| Auth | Better Auth 1.7, Drizzle adapter on D1. Sessions, verifications and rate limits live in D1. |
| DB | Drizzle 0.45 with the `d1` driver (`packages/db`), Cloudflare D1 (`recap-dev`, `recap-prod`) |
| Cache | Workers KV (`recap-api-dev-cache`, `recap-api-prod-cache`), only for Google access tokens |
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
- **fallow** (`.fallowrc.json`): dead code, duplicates, complexity and boundary zones.
- **Git**: lefthook (Biome, ls-lint and comments on commit; commitlint on the message; `bun run check` on push). Commit scopes: `api`, `web`, `db`, `infra`, `deps`, `repo`, `tooling`.
- **CI**: `.github/workflows/ci.yml` runs on PRs to `development`: lint, file names, comments, fallow, typecheck, web build, API build (`wrangler deploy --dry-run`), then API tests on a local D1 and KV, then web tests. Actions are pinned to commit SHAs, and Dependabot updates them weekly.

Main conventions (full list in `AGENTS.md`):

- Luminar file kinds: `.tsx`, `.helpers`, `.hooks`, `.types`, `.interfaces`, `.constants`, `.enums`, with `I`, `T` and `E` name prefixes.
- Web: thin `routes/` render one container. `features/<feature>/{containers,components}/<Name>/` folders nest. Only `src/api/<domain>/` (keys, queries, mutations) calls the API.
- API: `modules/<feature>/<feature>.{module,service,model,...}.ts`. Modules only route. Services do the work.
- Go-style early returns, with no `else` (plugins `no-else` and `no-inverted-guard`).
- D1 has no interactive transactions: use `db.batch`. KV is only for caches, through `CacheService`.
- No `Date` global. Error messages come from `E<Name>Messages` enums. No `../` imports: use `@/`, `#api/` or `#db/`.

## Infrastructure

Everything stays on free tiers. The user did the setup by hand in the web UIs. `scripts/provision-workers.sh` walks through the Workers setup.

| Part | Service | Details |
|---|---|---|
| API | Cloudflare Workers | `recap-api-dev` and `recap-api-prod`, custom domains from `wrangler deploy --domain`. An hourly cron deletes expired pending grants. |
| Secrets | Worker secrets | Uploaded on each deploy with `wrangler deploy --secrets-file`, from the `ENV_FILE` secret of the GitHub environment. |
| Database | Cloudflare D1 | `recap-dev` and `recap-prod`. Migrations from `packages/db/migrations`. |
| Cache | Workers KV | `recap-api-dev-cache` and `recap-api-prod-cache`. |
| Web | Cloudflare Workers | `recap-web-dev` and `recap-web`. Workers custom domains get their own certificate, so 2-level hosts work. |
| DNS | Cloudflare, `amiyo.lol` | Workers custom domains make the API and web records. |

| Environment | Branch | Workflow | Web | API |
|---|---|---|---|---|
| dev | `development` | `dev-deploy.yml` | `dev.recap.amiyo.lol` | `recap-api-dev.amiyo.lol` |
| prod | `prod` | `prod-deploy.yml` | `recap.amiyo.lol` | `recap-api-prod.amiyo.lol` |

Each deploy: `wrangler d1 migrations apply --remote`, then `wrangler deploy` for the API with its secrets and domain, then check `https://<API_HOST>/health`, then build the web app with `VITE_API_URL` and `wrangler deploy` it.

GitHub repo variables: `APP_DOMAIN` (`amiyo.lol`), `CLOUDFLARE_ACCOUNT_ID`. Each environment has an `ENV_FILE` secret that holds `CLOUDFLARE_API_TOKEN` and the API secrets.

## Decisions and trade-offs

- Named exports only, with an `index.ts` barrel per component folder. Default exports only in `*.config.ts`.
- `exactOptionalPropertyTypes` is off, and `noPropertyAccessFromIndexSignature` is off in the web app only, because shadcn code fails them. Biome `useLiteralKeys` is off, because it conflicts with `noPropertyAccessFromIndexSignature`.
- `packages/db/src/schema/auth.ts` is the Better Auth default schema, edited by hand. The user removed the CLI generator. When you add a Better Auth plugin, update the file from the Better Auth docs and run `bun run db:generate`.
- The `Container` folder suffix is a convention only. ls-lint cannot check it without overlapping keys.
- `authClient` in `apps/web/src/api/client/index.ts` has no users yet, so fallow is told to ignore it.
- The user removed the plugin fixture harness. Test a new plugin with a temporary probe file and `bunx biome lint <file>`.
- Each workspace has its own `.env` and `.env.example`. Bun loads the package's `.env`, and Vite reads `apps/web/.env`.
- Deployed APIs use host-only auth cookies (no `COOKIE_DOMAIN`). All hosts are on `amiyo.lol`, so web and API are the same site and sign-in works. A shared `.amiyo.lol` cookie would send prod sessions to the dev API.
- Both apps run on Cloudflare Workers, so one platform and one deploy tool (`wrangler`) serve both. D1 holds all data. KV holds only the Google access-token cache.
- Local dev uses the remote dev D1 and KV (`remote: true`). Only tests use a local simulated D1 and KV.
- `apps/api/src/worker.ts` is the only `noDefaultExport` exception outside `*.config.ts`, because Workers need a default export.

## Open items

1. Check CI on PR #5 and merge it. After the merge, `development` uses `dev-deploy.yml`.
2. Test sign-up and sign-in on `https://dev.recap.amiyo.lol`. A reload must keep the session.
3. Remove the `dev.amiyo.lol` domain from the `recap-web-dev` Worker (Settings → Domains & Routes).
4. First prod deploy: open a PR from `development` to `prod`, merge it, then check `https://recap-api-prod.amiyo.lol/health` and `https://recap.amiyo.lol`.
5. Google sign-in (not done): make 1 OAuth web client with the redirect URIs `https://recap-api-{dev,prod}.amiyo.lol/api/auth/callback/google`. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the `ENV_FILE` secret of each GitHub environment. The deploy uploads them as Worker secrets. For local use, fill them in `apps/api/.env`.
6. Close Dependabot PRs #2 and #3. They bump Docker actions that no workflow uses.
7. Run `scripts/provision-workers.sh` before the first deploy. Then check dev, then prod.
8. `/health` returns a raw 500 with the SQL error when a dependency is down. It should catch the error and return 503 with a clear status (offered, not done).
9. Optional: delete the unused `main` branch on GitHub.
10. Product work has not started. Next step from the user's workflow: `/grill-with-docs` on scope (MVP sources, data policy for sending employer data to AI APIs, Google Chat admin approval), then a spec.

## Product notes from the brainstorm

- Feasibility risk: Google Chat needs Workspace admin approval for `chat.messages.readonly`. A Slack app install can need admin approval.
- Data policy: sending employer data to AI APIs needs approval from each employer. A local model (Ollama) is one option.
- Planned architecture: connectors sync into one `events` table. A rules layer builds lists without AI (PRs to review, calendar clashes). The AI layer only writes the summary. Sync and digests can run as Workers Cron Triggers, with Queues for fan-out per source.
- Feature ideas: morning brief, "waiting on me" queue, cross-org calendar clashes, end-of-day log, weekly report.
