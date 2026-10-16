> Spec location: `docs/specs/`. This spec was originally published as issue #6 (child tickets #7, #8, #9) before specs moved into the repo; the file is now the source of truth.

## Problem Statement

Recap builds a personal work overview by pulling a person's activity from the tools they work in, but today there is nothing to pull from. A user can sign in, yet the app has no way to prove which Google account anchors their professional identity, and no way to hold authorized grants to external providers. The tools a person uses at work hang off their work Google account, which often lives in a different browser profile from the one where they use Recap, so an ordinary session-bound "connect your account" flow fails exactly when it matters: the OAuth redirect lands in the wrong Chrome profile and the consent never completes.

## Solution

Users get a Settings page where they build a list of Work Identities. Each Work Identity is created by a one-time Google consent that proves ownership of that Google account and records its email, name and avatar. Under each Work Identity, users add Connections: Google Calendar through a second Google consent with read scopes, and Jira or Linear by pasting an API key that is validated on the spot. The Google consent URL is shown in a dialog with a copy button, so the user can paste it into the browser profile where their work Google account actually lives; the callback completes without a Recap session on that side. When the user comes back to Recap, the new identity or Connection is already there. Users can see each Connection's status and disconnect any of them.

## User Stories

1. As a Recap user, I want a Settings page that lists my Work Identities and their Connections, so that I can see and manage everything Recap will pull from.
2. As a Recap user, I want to start adding a Google account and receive a Google consent URL, so that I can prove I own that work account.
3. As a Recap user, I want a copy button on the consent URL, so that I can paste it into the browser profile where my work Google account lives.
4. As a Recap user, I want an "Open Google" button next to the URL, so that I can complete the consent immediately when I am already in the right profile.
5. As a Recap user, I want the consent to complete in a different browser profile without a Recap session there, so that my work account can anchor a Work Identity even though I never sign in to Recap from that profile.
6. As a Recap user, I want the identity-creation consent to request only my email address (no data scopes), so that proving ownership grants Recap nothing more than proof.
7. As a Recap user, I want to return to the Settings page and see the new identity without clicking refresh, so that completion feels immediate.
8. As a Recap user, I want each identity card to show the Google account's avatar, email and display name, so that I can tell my identities apart at a glance.
9. As a Recap user, I want to add several Google accounts as separate Work Identities, so that each of my professional identities (for example, one per employer) stays distinct.
10. As a Recap user, I want a clear error when the Google account I consent with is already one of my Work Identities, so that my identity list stays unique per Google account.
11. As a Recap user, I want a clear error when a consent link has expired, so that I know to start again instead of being stuck.
12. As a Recap user, I want the post-connect redirect to tell me what happened (connected provider and email, or an error), so that success and failure are visible without digging.
13. As a Recap user, I want to connect Google Calendar under a specific Work Identity, so that calendar data is attributed to the right professional identity.
14. As a Recap user, I want a per-source consent rejected when I complete it with a different Google account than the identity's, so that a pasted URL cannot bind the wrong account's grant.
15. As a Recap user, I want each Connection to show the connected provider account's email, so that I can verify the right account was connected.
16. As a Recap user, I want to connect Jira by pasting an API token with my Atlassian email and site, so that I do not need Jira OAuth to get my activity in.
17. As a Recap user, I want to connect Linear the same way with an API key, so that all API-key providers work alike.
18. As a Recap user, I want my API key validated with a cheap call to the provider when I paste it (Jira: Basic auth to the site `myself` endpoint; Linear: viewer query), so that typos are caught immediately rather than during pulls.
19. As a Recap user, I want an explicit error when an API key is invalid, so that I can fix it on the spot.
20. As a Recap user, I want at most one Connection per provider per Work Identity, so that the connection list stays unambiguous.
21. As a Recap user, I want each Connection to show a status chip (active or needs reconnect), so that I know which sources need attention later.
22. As a Recap user, I want to disconnect a Connection, so that Recap stops being able to pull from that source.
23. As a Recap user, I want deleting a Work Identity to remove its Connections with it, so that nothing dangles.
24. As a Recap user, I want my refresh tokens and API keys stored encrypted, so that a database leak does not expose my credentials.
25. As a Recap user, I want the web app to never receive my tokens, so that credentials stay server-side.
26. As a Recap user, I want short-lived access tokens refreshed quietly when they expire, so that I do not have to re-consent every hour.

## Implementation Decisions

- Domain model (ADR-0001): every Connection belongs to a Work Identity, never directly to the user. A Work Identity is unique by Google `sub` per user, owned by exactly one user. Two users may anchor the same Google account separately. No cap on identities per user.
- Storage (ADR-0002): new `identity` and `connection` tables in the db package, separate from Better Auth, whose `account` table stays sign-in only. One Google OAuth client serves both consent kinds (sign-in requests `openid email profile`; connects request per-source read scopes). Google sign-in never auto-creates a Work Identity, and no auto-create happens in either direction.
- `identity` row: id, user (cascade delete), google_sub (unique, the ownership key), email (display only), display_name, avatar_url, timestamps.
- `connection` row: id, identity (cascade delete), provider, auth_kind (oauth or api_key), status (active or needs_reconnect), scopes, refresh_token_enc, api_key_enc, access_token_expires_at, provider_account_id, provider_account_email, timestamps, unique (identity, provider). Migration name: `identities-and-connections`.
- Rows are written only on success: no pending state in the connection tables. Disconnect is a row delete; identity delete cascades. The `pending_approval` status is deferred until Google Chat.
- Identity-creation consent requests `openid email` only and stores no token.
- Credentials: refresh tokens and API keys are encrypted with AES-256-GCM before reaching D1. The key comes from the CONNECTION_ENCRYPTION_KEY Worker secret, with the key version prefixed to the ciphertext for rotation. Short-lived access tokens are cached in KV keyed by connection id, TTL equal to expiry (at least 60 seconds). Refresh is lazy, at first need during the future pull phase; no background refresher in this spec.
- OAuth state (ADR-0003): a pending grant lives in the D1 `pending_grant` table as JSON (userId, purpose, optional identityId), expiring after 10 minutes, consumed once with DELETE ... RETURNING. The callback resolves the grant from state alone, with no Recap session required. The consent URL is a bearer capability, accepted with mitigations: the connected email is shown on the post-connect redirect and in the identity list, and Google-sourced consents are rejected when the returned sub differs from the identity's google_sub. State must never be bound to the web session; that would silently break the cross-profile flow.
- API surface: one identity module in the api package, dependencies injected per repo conventions, registered in the app factory. The provider registry lives in the identity module's constants and enums files; crypto and OAuth helpers live in api shared code.
  - `GET /identities`: the caller's identities with their connections.
  - `POST /identities/connect`: starts identity creation, returns `{ authorizeUrl }`.
  - `POST /identities/:identityId/connections`: with `{ provider }` returns `{ authorizeUrl }` (OAuth providers); with `{ provider, apiKey }` validates the key with a cheap provider call and connects immediately (Jira additionally requires `{ email, site }` for Basic auth).
  - `DELETE /connections/:connectionId`: disconnects.
  - `GET /api/connect/google/callback`: the single registered Google redirect URI serving both identity-creation and per-source consents, disambiguated by state. Redirects to the web origin's settings page with `?connected=<provider>&email=...` on success or `?error=...` on failure. The web app never sees tokens.
- Providers, first cut: wired are google-calendar (OAuth), jira and linear (API key). Registered but unwired: slack, google-chat, github.
- Web: a `/settings` route renders one SettingsContainer. Identity cards show avatar and email with per-card connect actions; connections show status chips and a disconnect action. The "Add Google account" dialog shows the authorize URL with a copy button and an "Open Google" button, because the cross-profile flow is the point. Completion is picked up by refetchOnWindowFocus on the identities query; no polling. Domain code follows the api/identity layout (keys factory, queries, mutations); routes import only the container; types flow from the Eden contract.

## Testing Decisions

- A good test exercises external behavior only: it drives real HTTP requests at the running app and asserts on responses, database rows and cache state, never on internal call sequences.
- Seams (confirmed with the user):
  - Existing seam, used as-is: the app factory with db, cache and env. Tests run against a local simulated D1 and KV from getPlatformProxy, and real AES-256-GCM encryption with a test key.
  - Exactly one new seam: an outbound provider client, injected into the identity module like the other dependencies, covering authorize-URL construction, code exchange, userinfo fetch and API-key validation. Production wraps the real Google, Jira and Linear endpoints; tests provide a fake. This is the highest point the network boundary can sit at, so it is the only new seam.
- Tested module: the identity module end to end through the app factory, including auth gating, both consent kinds, the sub-mismatch rejection, grant TTL expiry and D1 `DELETE ... RETURNING` consumption, encrypted-at-rest credentials, and disconnect/delete cascades.
- Prior art: none; the repo has no tests yet, and this suite becomes the reference for future modules.
- The web app gets no automated tests in this spec; `/settings` is verified manually.

## Out of Scope

- Connectors: any actual data pulling, digest building or scheduling.
- Background or scheduled token refresh (lazy refresh at first need only).
- `needs_reconnect` transitions caused by failed refreshes (the status value exists now; the pull phase will set it).
- Wiring slack, google-chat and github beyond registry entries.
- `pending_approval` and any approval flow.
- Credential rotation beyond the key-version prefix on ciphertext.
- Changes to sign-in or Better Auth session handling.
- Automated web tests.

## Further Notes

- ADR-0001 through ADR-0003 and GLOSSARY.md govern this area. They are currently uncommitted and should land with a docs commit before implementation starts.
- Suggested ticket split: db schema and migration; api identity module (OAuth machinery, encryption, callback); web settings feature; provider registry wiring.
- The Google OAuth client is the same one used for sign-in; the new callback redirect URI must be registered with Google.
- Next: run ticket creation against this spec, then implementation in parallel worktrees on one integration branch.
