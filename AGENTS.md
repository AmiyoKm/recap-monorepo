# Recap: agent and contributor guide

Bun monorepo. `apps/api` (Elysia on Bun, Cloud Run), `apps/web` (Vite, React 19, TanStack Router and Query, shadcn/ui, Cloudflare Workers), `packages/db` (Drizzle, Postgres).

Run `bun run check` before you push. It runs Biome, ls-lint, the comment linter, fallow, typecheck and build. Do not turn off a rule, add an ignore comment, widen an exclusion or raise a threshold without explicit approval.

## Folder layout

### API (`apps/api/src`)

```
index.ts                     entry: create app, listen on ENV.port
app.ts, app.types.ts         createApp() and TApp (the Eden contract)
modules/<feature>/
  <feature>.module.ts        Elysia instance = controller. Routes only.
  <feature>.service.ts       class with the feature logic. Never takes Elysia Context.
  <feature>.repository.ts    class with all Postgres access. The only file that imports `db`.
  <feature>.model.ts         t schemas: one source for types and validation
  <feature>.{types,interfaces,enums,constants,helpers}.ts
shared/<name>/<name>.<kind>.ts   cross-module code (env, redis, date)
shared/<name>/<name>.client.ts   singletons: `db`, `redis`, `auth`
shared/providers/providers.client.ts   `providers`: one object with every provider service
shared/providers/providers.{enums,interfaces}.ts   EProvider, IProviderAccount
shared/providers/<provider>/<provider>.<kind>.ts   one folder per external provider (google, jira, linear)
```

- A module is `new Elysia({ name: "<feature>" })`. The `name` makes it a singleton. Use `.use(authModule)` and `{ auth: true }` for signed-in routes.
- Import `db`, `redis` and `ENV` (`#api/shared/env/env.constants`). Do not pass them as arguments. Only `.repository.ts` files import `db`.
- Services, repositories and provider services are `abstract class`es with `static` methods (Elysia best practice). Import them directly. Do not pass a service as an argument for tests: replace its static methods with `spyOn` from `bun:test` and call `mock.restore()` after the suite. A module is a `const` Elysia instance, not a factory function.
- Talk to an external provider only through its SDK, never with a hand-written `fetch`: `google-auth-library` (`OAuth2Client`) for Google, `jira.js` (`createCloudClient`) for Jira, `@linear/sdk` (`LinearClient`) for Linear. Each provider has its own `shared/providers/<provider>/<provider>.service.ts`, registered in `providers` (`#api/shared/providers/providers.client`). Modules import `providers` and call `providers.google`, `providers.jira` or `providers.linear`, not the service classes. Biome plugin `no-direct-provider-service-import` fails on a `#api/shared/providers/**/*.service` import outside `shared/providers/`. Types from `<provider>.interfaces.ts` can be imported directly. Google OAuth uses PKCE: the pending grant stores the `codeVerifier`.
- A provider service returns `null` for credentials that the provider rejects, and throws for every other failure. Use the SDK error guards (`isAuthError`, `AuthenticationLinearError`) to tell them apart. Do not compare error message strings.
- Pure functions (mappers, key builders, row builders) go in `.helpers.ts`, not in the service.
- Every path and URL lives in `ROUTES` (`#api/shared/routes/routes.constants`): the Google callback URL (`ROUTES.API`), web redirect targets (`ROUTES.WEB`) and provider URLs that the SDKs do not own (`ROUTES.GOOGLE` scopes, `ROUTES.JIRA.SITE(site)`). A static path is a string. A dynamic URL is a function in the object, such as `ROUTES.JIRA.SITE(site)` or `ROUTES.WEB.CONNECT_RESULT({ error })`. Keep `as const` so Eden gets literal paths. Elysia route paths stay as literals in `<feature>.module.ts`. Biome plugin `no-route-literal` fails on a path or URL literal anywhere else in `apps/api/src`. `routes.constants.ts` is the only constants file that can hold functions.
- Every route declares `response` with a schema for each status it can return, errors included: `response: { 200: identityListResponse, 401: unauthorizedError, 404: identityNotFoundError }`. Eden uses this to type `data` and `error` on the web. Biome plugin `route-response-schema` enforces it.
- An error body is `{ message }`, with `message` as a `t.Literal` of an `E<Feature>Messages` member. Put response and error schemas in `<feature>.model.ts`, and derive their types in `<feature>.types.ts` with `typeof schema.static`. Do not write a parallel interface.
- Services `throw status("Not Found", { message: EIdentityMessages.IDENTITY_NOT_FOUND } satisfies TIdentityNotFoundError)`. Every `status()` body uses `satisfies` with the type of its schema (Biome plugin `typed-status-body`). Handlers stay one line.
- Pass only the values a service needs, not the Elysia `Context`.
- Every `t.String()` in a model has `maxLength`, `format` or `pattern`.
- API tests run from `apps/api` with `bun test`. Bun loads `apps/api/.env.test` (committed, test values only), so `ENV`, `db` and `redis` point at the test services.
- API tests live in `apps/api/tests` (`bunfig.toml` sets `root = "tests"`), and every file ends in `.spec.ts`. `tests/unit/` mirrors `src/` (`tests/unit/shared/redis/redis.service.spec.ts` tests `src/shared/redis/redis.service.ts`). `tests/integration/<feature>/` tests routes. `tests/fixtures/` holds shared constants and helpers. Import them as `#api-tests/*`.
- Route tests call the app through Eden: `const api = treaty(createApp())`. Do not call `app.handle(new Request(...))` (Biome plugin `no-raw-request-in-api-test`). Sign up test users with `auth.api.signUpEmail({ body, returnHeaders: true })`.
- Mock with `spyOn` and call `mock.restore()` in `afterEach` or `afterAll`. A unit test never reaches the network: stub `fetch`, or spy on the SDK method when the SDK does not use the global `fetch`.
- Use `test`, not `it`. Use `test.each` for a table of cases. Await every `expect(...).rejects` and `expect(...).resolves` (plugin `no-unawaited-expect-promise`). Put `expect` only inside a test. A helper throws an `Error` when its setup fails.

### Web (`apps/web/src`)

```
routes/                      TanStack file routes. Thin: render one container.
routes/_app.tsx, routes/_app/  signed-in pages (`/dashboard`, `/settings`) inside AppShellContainer
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
- Build UI from the shadcn components in `@/components/ui`. Before you write markup, check if a component exists: `Button`, `Input`, `Field`, `Label`, `Card`, `Badge`, `Alert`, `Empty`, `Skeleton`, `Spinner`, `Table`, `Separator`, `Dialog`, `DropdownMenu`, `Avatar`, `Progress`. Wrap a router `<Link>` in `<Button asChild>` when it must look like a button. Do not write a raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<label>`, `<table>`, `<hr>`, `<dialog>`, `<progress>` or `<meter>`. Biome plugin `no-raw-html-control` fails on them outside `components/ui`. If no component fits, add it with the shadcn CLI. Do not hand-write a copy.
- Signed-in pages live under the pathless `_app` layout. `AppShellContainer` reads the session with `useSessionQuery` and sends a user with no session to `/sign-in`. It renders the shadcn `Sidebar` (`AppSidebar`): navigation goes there, not in a top header. Add a page link as an `AppSidebarNavItem`. App pages use the fluid `Container`, so content fills the space beside the sidebar. Session and sign-in calls go through `src/api/auth/` (`authClient`), never directly from a feature.

### DB (`packages/db`)

- `src/schema/auth.ts` is the Better Auth default schema. When you add a Better Auth plugin or user field, update it from the Better Auth docs, then run `bun run db:generate`.
- Make migrations with `bun run db:generate --name <change>`. Never edit a merged migration.

## Naming and declarations

- Interfaces start with `I`, type aliases with `T`, enums with `E` (`IUser`, `TApp`, `EStatus`).
- Use interfaces for object shapes. Use type aliases for unions and derived types.
- Declare each kind only in its own file: interfaces in `.interfaces.ts`, types in `.types.ts`, enums in `.enums.ts`, constants in `.constants.ts`. Exceptions: query-key factories in `.keys.ts`, Elysia models in `.model.ts`.
- Constants are `SCREAMING_SNAKE_CASE`. Declaration and constants files contain no functions.
- A closed set of related string values is an enum in `.enums.ts`, not a group of constants (`JIRA_PROVIDER_NAME`, `LINEAR_PROVIDER_NAME`) and not a literal union (`"expired" | "failed"`). This covers provider names, statuses, error codes, protocol values and key prefixes. Key lookup objects by enum members: `Record<EProvider, string>` with `[EProvider.JIRA]: ...`.
- An enum that several API modules use lives in `shared/<name>/<name>.enums.ts`, and modules import it from there (`EProvider` in `#api/shared/providers/providers.enums`). The web cannot import API runtime code, so it mirrors the values it needs in `src/api/<domain>/<domain>.enums.ts`. Pass the mirrored enum to Eden calls, so a value that does not match makes a type error.
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
- On the web, derive data and error types from Eden in `<domain>.types.ts`, and pass them to `useMutation<TData, ApiError<TError>, TVars>` or `queryOptions<TData, ApiError<TError>>`. `ensureOk` throws an `ApiError` that keeps the Eden error type, so `error.status` and `error.value.message` narrow for each status.
- Derive types from their source (`typeof`, `ReturnType`, Eden, Drizzle) before you write a parallel interface.
- Make `switch` statements on unions exhaustive.

## Dates

- Use dayjs only, from `#api/shared/date/date.helpers` or `@/shared/date/date.helpers`. That file loads the `utc` and `timezone` plugins.
- The global `Date` (`new Date()`, `Date.now()`, the `Date` type) and other date libraries are not allowed.

## Errors

- Error messages come from an `E<Name>Messages` enum in the sibling `.enums.ts` file, never a string literal. Put details in `{ cause }`.
- In Elysia, return or throw `status(code, { message } satisfies T<Name>Error)` with an enum message, and declare that status in the route `response`. In a service, import `status` from `elysia`.

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

Read `apps/web/DESIGN.md` before UI work. It holds the visual system: colour roles, the type scale, spacing, elevation, component recipes, states and the visual don'ts. `apps/web/PRODUCT.md` holds the product context. Keep DESIGN.md in step with `src/index.css` when you change a token.

- Use Tailwind theme tokens from `src/index.css`. No arbitrary values (`w-[13px]`, `bg-[#fff]`, `z-[99]`).
- Compose classes with `cn()` from `@/lib/utils`. No template literals in `className`.
- No static `style={{ ... }}`. Use inline styles only for values computed at runtime.
- Use the TanStack Router `<Link>` for internal links, not `<a href="/...">`.
- Do not write `renderX()` helpers in TSX. Make a component.
- Every clickable element shows a pointer cursor, and a disabled one shows `not-allowed`. The base layer in `src/index.css` sets this for buttons, links and the interactive ARIA roles. Do not add `cursor-pointer` one element at a time. Add a missing role to that rule.

Tailwind rules (each one is a Biome plugin in `tooling/biome-plugins/react/`):

| Rule | Plugin |
|---|---|
| Colors come from theme tokens (`bg-primary`, `text-muted-foreground`, `bg-chart-1`). No palette colors (`bg-blue-500`, `text-white`). | `no-palette-color` |
| Spacing uses the shared scale only: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32. | `no-off-scale-spacing` |
| Space children with `gap-*` on flex or grid, not `space-x-*` or `space-y-*`. | `no-space-utility` |
| No `!` important modifier. Fix the class order instead. | `no-important-modifier` |
| No constant layout sizes: no `w-64` or wider and no `h-32` or taller without a breakpoint. Content sets height. Width is `w-full` plus a `max-w-*` step. | `no-fixed-layout-size`, `no-arbitrary-size` |
| No gradients, gradient text, `backdrop-blur`, custom `shadow-[...]` or side borders thicker than 1px. | `no-decorative-effect` |

## Layout and typography

Every page uses the shared layout components in `@/features/app-shell/components`, so headings, widths, gutters and vertical rhythm match on every page.

| Need | Use | Plugin that enforces it |
|---|---|---|
| Signed-in page (title, description, actions, content) | `<AppPage title description actions>` | `no-raw-page-width` |
| Landing or marketing band | `<Section className innerClassName>` with `<SectionHeader title description>` | `no-raw-page-width` |
| Page width and gutters anywhere else (headers, bars) | `<Container>` | `no-raw-page-width` |
| Any heading or display text | `<Heading as={EHeadingTag.H2} variant={EHeadingVariant.SECTION}>` | `no-raw-heading`, `no-display-typography` |

- Heading variants are the only type scale: `DISPLAY` (landing h1), `PAGE` (app page h1), `SECTION` (section h2), `TITLE` (form and auth h1), `CARD` (card titles), `ITEM` (list item titles, numerals), `LABEL` (small sans labels). Pick the variant by role, not by look. If a role is missing, add a variant to `Heading.constants.ts`. Do not override the size with `className`. `className` on `Heading` is only for color and numerals.
- `text-2xl` and larger exist only in `Heading` and `Wordmark`. The app uses Inter only: no serif or display face. Body text stays at `text-xs`, `text-sm`, `text-base` or `text-lg`.
- Wrap a card title as `<CardTitle><Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>`.
- Use the same state components on every page: `Skeleton` while loading, `Alert` with a retry `Button` on error, `Empty` with one action when there is no data.

## Responsive layout

Design mobile first. Base classes are for a 320 px screen. Add `sm:`, `md:` and `lg:` steps for larger screens. Before you finish UI work, take screenshots at 320, 768, 1024 and 1440 px wide, and check that `document.documentElement.scrollWidth` is not larger than the window width.

- A grid starts at one column: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Plugin `responsive-grid-columns` fails on `grid-cols-2` or more without a breakpoint.
- Large text scales with the screen. Plugin `responsive-display-text` fails on `text-5xl` and larger without a breakpoint. The `Heading` variants already scale.
- Full-height pages use `min-h-svh` or `min-h-dvh`. Plugin `no-screen-viewport-unit` fails on `h-screen` and `w-screen`.
- A row that can be too wide on a phone stacks first: `flex flex-col gap-4 sm:flex-row`. Action buttons beside a title go below it on small screens (`PageHeader` does this).
- Give `min-w-0` to a grid or flex child that holds a table, long text or truncated text. Without it the child grows past the screen.
- Truncate emails and names that can be long (`truncate` inside a `min-w-0` parent). Hide secondary table columns below `sm` (`hidden sm:table-cell`).
- When the impeccable skill is installed, run its detector once on the changed UI files before you finish (`impeccable detect --json <files>`), and fix what it reports.

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
