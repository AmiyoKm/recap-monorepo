# Cloudflare Worker bindings at module load

Research date: 2026-10-17.

## Problem

The `dev-deploy` run for PR 11 failed with code 10021. The upload startup check ran the top-level scope, and `requireBinding` threw because `env.DB` was empty (`bindings.helpers.ts:13`). Text bindings and secrets were set at that time, because `ENV` reads `process.env` at load and did not throw.

## What the Cloudflare docs say

- `env` from `cloudflare:workers` is readable at top level. Variables and secrets work there. Binding I/O (KV calls, Durable Object stub calls, service calls) does not work outside a request. Source: [Bindings (env)](https://developers.cloudflare.com/workers/runtime-apis/bindings/).
- Code 10021 is any error that the top-level scope throws during the upload check. Source: [Errors and exceptions](https://developers.cloudflare.com/workers/observability/errors/).
- Clients made in global scope from bindings can become stale after a binding change, because Cloudflare can keep the isolate. Source: same Bindings page, "Making changes to bindings".
- The docs do not say whether D1 or KV bindings are set during the upload check.

## Patterns in public projects

| Pattern | Example | Throws at load if `DB` is empty |
|---|---|---|
| Top-level `drizzle(env.DB)` with no check | [mdhruvil/deplit](https://github.com/mdhruvil/deplit/blob/main/apps/api/src/db/index.ts), [oscabriel/better-chat](https://github.com/oscabriel/better-chat/blob/main/apps/server/src/lib/auth.ts) (top-level `betterAuth` on a top-level `db`) | No. Drizzle only stores the client. |
| Factory per request: `getDb()` and `getAuth()` read `env` on each call | [remorses/playwriter](https://github.com/remorses/playwriter/blob/main/website/src/db.ts) (4k stars). Its comment: auth is not a singleton because Workers need per-request env. | No |
| Request scope with `AsyncLocalStorage` and a `Proxy` named `db` | [sammmms/project-eggs](https://github.com/sammmms/project-eggs/blob/main/packages/db/src/db.ts). The fetch handler calls `runWithDb(createD1Db(env.DB), ...)`. | No |
| Pass `env` from the handler into a factory (Hono `c.env`) | [w3cj/monorepo-example-tasks-app](https://github.com/w3cj/monorepo-example-tasks-app/blob/main/apps/api/src/db/index.ts) | No |
| Top-level check that throws when `DB` is missing | Recap before the fix | Yes |

None of these projects throw at load when a binding is empty. The deploy failure comes from the eager check, not from the use of `env` at top level.

## Options for Recap

1. **Lazy reads (current fix).** `readBindings` returns getters. `db` wraps D1 in `deferD1Database`, and `cache` wraps KV in `deferKvNamespace`. Each call reads `env.DB` or `env.CACHE` at call time. This keeps the `db` and `cache` singletons that `AGENTS.md` asks for, uses no `Proxy` or `as`, and does not keep a stale binding. A missing binding fails on the first query with `MISSING_BINDING`.
2. **No check (deplit style).** Use `createDb(env.DB)` at top level and delete `requireBinding`. This is less code, but a missing binding fails later as `cannot read properties of undefined`, and the D1 client is captured at load.
3. **Per-request factories (playwriter style).** Change `db` and `auth` to `getDb()` and `getAuth()`. This needs edits in every repository and in `auth.client.ts`, and it conflicts with the `AGENTS.md` rule to import `db`.
4. **`AsyncLocalStorage` (project-eggs style).** This is correct but needs a `Proxy` with a type assertion, which `AGENTS.md` does not allow.

Recommendation: keep option 1.

## Bun and Node test setup

- Recap runs `bun test` with `getPlatformProxy({ remoteBindings: false })` and replaces `cloudflare:workers` with `mock.module` in `tests/setup/setup.preload.ts`. This gives a local D1 and KV and works for Bun and Node.
- `@cloudflare/vitest-pool-workers` runs tests inside `workerd`, so it matches production more closely. But it needs Vitest, and Recap uses `bun test`.
- Neither setup runs the upload startup check. To test it before a merge, start the bundle with no D1 or KV bindings (Miniflare), or run `wrangler versions upload --env dev`, which checks the Worker without sending traffic to it.
