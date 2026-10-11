# Recap: agent and contributor guide

Bun monorepo. `apps/api` (Elysia on Bun, Cloud Run), `apps/web` (Vite, React 19, TanStack Router and Query, shadcn/ui, Cloudflare Workers), `packages/db` (Drizzle, Postgres).

Run `bun run check` before you push. It runs Biome, ls-lint, the comment linter, fallow, typecheck and build. Do not turn off a rule, add an ignore comment, widen an exclusion or raise a threshold without explicit approval.

## Folder layout

### API (`apps/api/src`)

```
index.ts                     entry: load env, create app, listen
app.ts, app.types.ts         createApp() and TApp (the Eden contract)
modules/<feature>/
  <feature>.module.ts        Elysia instance = controller. Routes only.
  <feature>.service.ts       logic and database access. Never takes Elysia Context.
  <feature>.model.ts         t schemas: one source for types and validation
  <feature>.{types,interfaces,enums,constants,helpers}.ts
shared/<name>/<name>.<kind>.ts   cross-module code (env, redis, date)
```

- A module is a function that returns `new Elysia({ name: "<feature>" })`. The `name` makes it a singleton.
- Modules get their dependencies as arguments. Do not import a database client into a module.
- Pass only the values a service needs, not the Elysia `Context`.
- Every `t.String()` in a model has `maxLength`, `format` or `pattern`.

### Web (`apps/web/src`)

```
routes/                      TanStack file routes. Thin: render one container.
features/<feature>/
  containers/<Name>Container/<Name>Container.tsx + index.ts
  components/<Name>/<Name>.tsx + index.ts
               <Name>.{hooks,helpers,types,interfaces,enums,constants}.ts
               components/<Child>/...      slices nest to any depth
               __tests__/
api/client/                  Eden client, auth client, ensureOk
api/<domain>/<domain>.{keys,queries,mutations,types,interfaces,enums,constants,helpers}.ts
shared/<name>/<name>.<kind>.ts   app shell code (env, router, query, date)
components/ui, hooks, lib    shadcn. Generated vendor code: do not edit by hand.
```

- Routes import only containers. Containers compose components. Components and containers can call hooks from `api/`.
- Only `src/api/**` imports the Eden client, `useQuery`, `useMutation` and `queryOptions`. Everything else imports the `use<Name>Query` or `use<Name>Mutation` hook.
- Query keys come only from the `<domain>Keys` factory in `<domain>.keys.ts`.
- One component per file. Each component has its own folder with an `index.ts` barrel that re-exports it by name.

### DB (`packages/db`)

- `src/schema/auth.ts` is the Better Auth default schema. When you add a Better Auth plugin or user field, update it from the Better Auth docs, then run `bun run db:generate`.
- Make migrations with `bun run db:generate --name <change>`. Never edit a merged migration.

## Naming and declarations

- Interfaces start with `I`, type aliases with `T`, enums with `E` (`IUser`, `TApp`, `EStatus`).
- Use interfaces for object shapes. Use type aliases for unions and derived types.
- Declare each kind only in its own file: interfaces in `.interfaces.ts`, types in `.types.ts`, enums in `.enums.ts`, constants in `.constants.ts`. Exceptions: query-key factories in `.keys.ts`, Elysia models in `.model.ts`.
- Constants are `SCREAMING_SNAKE_CASE`. Declaration and constants files contain no functions.
- Named exports only. Default exports are allowed only in `*.config.ts`.
- File and folder names: kebab-case for features, modules and domains. PascalCase for component and container folders. Every file in a folder starts with the folder name.

## Imports

- No `../`. Use the package alias: `@/` in `apps/web`, `#api/` in `apps/api`, `#db/` in `packages/db`.
- Import a folder, not its `index`.
- Other packages import `@recap/db` and `@recap/api` only through their public entry points.

## Types

- No `any`, no non-null assertion `!`, no `as unknown as`, no `as never`, no `x as { ... }`.
- Do not use `as` to hide a type error. Narrow, validate, or fix the type at its source.
- `JSON.parse` goes into a variable typed `unknown`. Validate it before use.
- Parse external data at the boundary (Elysia `t` on the API, `ensureOk` on the web).
- Derive types from their source (`typeof`, `ReturnType`, Eden, Drizzle) before you write a parallel interface.
- Make `switch` statements on unions exhaustive.

## Dates

- Use dayjs only, from `#api/shared/date/date.helpers` or `@/shared/date/date.helpers`. That file loads the `utc` and `timezone` plugins.
- The global `Date` (`new Date()`, `Date.now()`, the `Date` type) and other date libraries are not allowed.

## Errors

- Error messages come from an `E<Name>Messages` enum in the sibling `.enums.ts` file, never a string literal. Put details in `{ cause }`.
- In Elysia, use `status(...)` with an enum message, or `throw` a custom error registered with `.error()`.

## Control flow (early return)

Write Go-style "line of sight" code: handle the short or failure case first and return, then let the main path run unindented to the end of the function.

```ts
if (!ttl) {
  await this.redis.set(key, value);
  return;
}
await this.redis.send(ERedisCommand.SET, [key, value, ERedisSetOption.EXPIRE_IN_SECONDS, String(ttl)]);
```

- Check the missing, empty, invalid or error case with a negated condition, and return or throw at once.
- Do not wrap the main work in `if (x) { ...; return; }` with the fallback after it. Invert the condition.
- No `else` and no `else if`. Return early, or use a lookup object or `switch` for several cases.
- Keep nesting shallow. If an `if` body grows, move it to a helper and return early in that helper.

Biome enforces this with `noUselessElse`, `noExcessiveCognitiveComplexity` (max 15) and 2 plugins: `no-else` fails on every `else`, and `no-inverted-guard` fails on an `if` without `!` that does the main work and ends in a bare `return;` with more code after it.

## Protocol strings

- Command names, options and other fixed protocol strings come from an enum, never a string literal. Put the enum in the `.enums.ts` file of the module that owns the client.
- Redis: use `ERedisCommand` and `ERedisSetOption` from `#api/shared/redis/redis.enums` in every `redis.send(command, [args])` call. Add a new member when you need a new command. Fixed non-enum arguments (such as a key count) go in `redis.constants.ts`.
- Redis access for Better Auth goes through `RedisStorageService` (`#api/shared/redis/redis.service`), which implements `SecondaryStorage`. Keep one method per storage operation.

## Styling

- Use Tailwind theme tokens from `src/index.css`. No arbitrary values (`w-[13px]`, `bg-[#fff]`, `z-[99]`).
- Compose classes with `cn()` from `@/lib/utils`. No template literals in `className`.
- No static `style={{ ... }}`. Use inline styles only for values computed at runtime.
- Use the TanStack Router `<Link>` for internal links, not `<a href="/...">`.
- Do not write `renderX()` helpers in TSX. Make a component.

## Comments and text

- No code comments, except `TODO:` and tool directives (`biome-ignore`, `@ts-expect-error`). Use names that make the code clear.
- No em dashes in strings or UI text.

## Architecture boundaries (fallow)

| Zone | May import |
|---|---|
| `db` | nothing |
| `api-shared` | `db` |
| `api-modules` | `api-shared`, `db` |
| `web-ui` (shadcn) | nothing |
| `web-shared` | `web-routes` (router setup only) |
| `web-api` | `web-shared`, `api-entry` (the `TApp` type) |
| `web-features` | `web-api`, `web-shared`, `web-ui` |
| `web-routes` | `web-features`, `web-shared` |

fallow also fails on dead code, unused dependencies, duplicated code, cyclomatic complexity over 20 and cognitive complexity over 15.

## Commits

Conventional Commits with a required scope: `api`, `web`, `db`, `infra`, `deps`, `repo` or `tooling`. Example: `feat(web): add digest page`. Lefthook runs Biome, ls-lint and the comment check on commit, commitlint on the message, and `bun run check` on push.

## Agent skills

### Issue tracker

Tickets are GitHub issues in `AmiyoKm/recap-monorepo`. Use the `AmiyoKm` gh account. PRs target `development`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`, both committed. Never git-exclude them (`.gitignore` or `.git/info/exclude`), even when a skill instructs it: this rule overrides the skill. See `docs/agents/domain.md`.
