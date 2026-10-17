> Spec location: `docs/specs/`. Decisions come from the grill recorded in ADR-0005 (`docs/adr/0005-one-google-connection-for-all-google-sources.md`). This spec replaces the Google Calendar parts of `work-identity-connections.md`.

## Problem Statement

A Recap user works in Google Calendar, Gmail, Google Drive and Google Chat with one Google account. Now Recap can connect only Google Calendar, and it shows Google Chat as a separate provider that does not work. To give Recap all of this activity, the user must connect each Google product separately, which is not possible now. The user does not care how Google splits its products. They want to pick their Google account once and let Recap read what they allow.

## Solution

Each Work Identity gets one "Google" Connection. On the Settings page, the user clicks "Connect Google". A Recap dialog shows four Sources: Calendar, Gmail, Drive and Chat. All four are ticked, and each one has a short line that says what Recap reads. The user unticks what they do not want, then gives one Google consent for the ticked Sources.

The user can untick more Sources on Google's own screen. Recap keeps what Google granted, and it tells the user which Sources it did not get. The Google row shows a badge for each granted Source. To add a Source later, the user clicks "Reconnect" and ticks it. To remove a Source, the user disconnects and connects again. A disconnect removes Recap's access at Google, so Recap no longer appears in the user's Google Account permissions.

## User Stories

1. As a Recap user, I want one "Google" row per Work Identity on the Settings page, so that I connect my Google account once and not once per Google product.
2. As a Recap user, I want the Google row to say only "Google", so that I do not need to know Google's product names for plans or bundles.
3. As a Recap user, I want "Connect Google" to open a Recap dialog before Google's consent, so that I decide what Recap reads in a place that explains it.
4. As a Recap user, I want Calendar, Gmail, Drive and Chat ticked by default on a first connect, so that the common case needs no extra clicks.
5. As a Recap user, I want each Source in the dialog to have one line that says what Recap reads, so that I can decide about each one.
6. As a privacy-minded Recap user, I want the Gmail line to say that Recap reads the subject, recipients and date, and not the message text, so that I can trust Recap with my mail.
7. As a Recap user, I want the Drive line to say that Recap reads file activity such as edits and comments, and not file content, so that I know my documents stay private.
8. As a Recap user, I want to untick any Source before I continue, so that Recap never asks Google for access that I do not want to give.
9. As a Recap user, I want the dialog to stop me from continuing with no Source ticked, so that I do not start a consent that cannot succeed.
10. As a Recap user, I want one Google consent for all the ticked Sources, so that I see Google's screen once.
11. As a Recap user, I want the consent link to work in another browser profile, as it does now, so that I can give consent where my work Google account lives.
12. As a Recap user, I want Recap to accept the consent when I untick some Sources on Google's screen, so that I can still connect the Sources that I allowed.
13. As a Recap user, I want the result page to name each Source that I asked for and Google did not grant, so that I know why a Source is missing.
14. As a Recap user, I want a clear error when I grant no Source at all, so that I know that nothing was connected.
15. As a Recap user, I want a clear error when I give consent with a different Google account than the Work Identity's, so that a pasted link cannot connect the wrong account.
16. As a Recap user, I want the Google row to show a badge for each granted Source, so that I can see at a glance what Recap reads.
17. As a Recap user, I want the Google row to show the Google account email, so that I can check that the right account is connected.
18. As a Recap user, I want a "Reconnect" action on an active Google row, so that I can add a Source that I left out before.
19. As a Recap user, I want the Reconnect dialog to tick the Sources that I have now, so that I add Sources without losing the current ones.
20. As a Recap user, I want a reconnect to replace my Google Connection, so that the row shows the Sources from my latest consent.
21. As a Recap user, I want a Google Connection that needs a reconnect to use the same dialog and flow, so that recovery works like a new connect.
22. As a Recap user, I want my current Google Connection kept when a reconnect fails, so that a failed consent does not remove the Sources I had.
23. As a Recap user, I want a disconnect to remove Recap's access at Google, so that Recap no longer appears in my Google Account third-party access list.
24. As a Recap user, I want a disconnect to work when Google cannot be reached, so that a Google problem never keeps my Connection in Recap.
25. As a Recap user, I want the delete of a Work Identity to remove Recap's Google access for that account too, so that nothing stays granted after I remove the account.
26. As a Recap user, I want to remove one Source by a disconnect and a new connect with that Source unticked, so that I can reduce Recap's access.
27. As a Recap user, I want Google Chat to stay a Source of my Google Connection, so that my chat activity is still part of my recap.
28. As a Recap user, I want the add Work Identity consent to keep asking only for my email address, so that proof of an account still grants Recap nothing more.
29. As a Recap user, I want Jira and Linear to work as they do now, so that this change does not affect my other Connections.
30. As a visitor to the landing page, I want the list of sources to show Google with Calendar, Gmail, Drive and Chat, so that I know what Recap can read before I sign up.
31. As a Recap user on a phone, I want the Source dialog and the badges to fit a 320 px screen, so that I can connect Google from any device.

## Implementation Decisions

### Domain

- New glossary term **Source**: one stream of activity that Recap reads. A Connection grants one or more Sources. Code uses the same word (`EGoogleSource`, `sources`).
- The provider `google-calendar` becomes `google`, with the label "Google". The provider `google-chat` goes away. No UI text says "Workspace" or "GSuite".
- A Work Identity has at most one `google` Connection, as with every other provider.

### Sources and scopes

- `EGoogleSource` has `CALENDAR`, `GMAIL`, `DRIVE` and `CHAT`. The API owns it in the Google provider area. The web mirrors it.
- A lookup `Record<EGoogleSource, string[]>` maps each Source to its scopes. The scope URLs live in `ROUTES.GOOGLE`:

  | Source | Scopes |
  |---|---|
  | Calendar | `calendar.readonly` |
  | Gmail | `gmail.metadata` |
  | Drive | `drive.activity.readonly` |
  | Chat | `chat.spaces.readonly`, `chat.messages.readonly` |

- A Source counts as granted only when Google granted all of its scopes.
- The authorize request always adds `openid` and `email` to the scopes of the ticked Sources, so that the callback can check the account.
- Pure helpers: Sources to scopes, granted scopes to granted Sources, and requested Sources minus granted Sources to denied Sources.

### API contract

- Start connection (`POST /identities/:identityId/connections`): the body gets `sources`, an array of `EGoogleSource` with no duplicates. It is required, with at least one item, when `provider` is `google`. It must be absent for every other provider. A body that breaks this rule returns 400 with a new `EIdentityMessages` member.
- The pending grant payload stores the requested Sources. The payload is JSON, so this needs no migration.
- Google callback:
  - The account check (sub mismatch) stays first.
  - No Source granted: redirect with `SCOPE_DENIED`.
  - At least one Source granted: save the Connection with Google's granted scopes. Then redirect with `connected=google`, the account email, and a `denied` query value that lists the requested Sources that Google did not grant. The value is empty when all were granted.
- Replace rule: a new Google grant replaces an existing `google` Connection, whether it is `active` or `needs_reconnect`. This is the reconnect. Jira and Linear keep the current rule: they replace only a `needs_reconnect` Connection, and they refuse an active one with `ALREADY_CONNECTED`. A failed code exchange keeps the existing Connection.
- The connection response gets `sources`: the granted Sources, which the API builds from the stored scopes. It is an empty array for non-Google providers. The web reads Sources only from this field and does not parse scopes.

### Revoke

- The Google provider service gets `revokeToken(refreshToken)`, built on `OAuth2Client.revokeToken`. It returns with no error when Google rejects the token as invalid or already revoked. It throws for every other failure, which follows the provider service rule.
- Disconnect of a `google` Connection decrypts the refresh token and calls `revokeToken` before it deletes the row. If the call throws, the service logs the error and continues the delete. The response does not change.
- Delete of a Work Identity does the same for its `google` Connection before the cascade delete.
- A reconnect does not revoke. A revoke ends the whole grant for the client, and that includes the new token.

### Web

- The API domain mirrors `EProvider` (`google` replaces `google-calendar`, and `google-chat` is removed) and `EGoogleSource`. Eden derives the types for `sources` on the body and the response.
- Settings: the Google row uses a Google mark (in place of the Calendar mark) and the label "Google".
- A Source picker dialog in the settings feature: one shadcn `Checkbox` field per Source, with the Source label and its description line. The continue button is disabled when no Source is ticked. On continue, it starts the connection with the ticked Sources and moves on to the current consent link step (copy and open).
- Default ticks: on a first connect, all Sources. On a reconnect, the Sources of the current Connection.
- An active Google row shows the granted Sources as `Badge`s, plus a "Reconnect" action that opens the picker. The `needs_reconnect` row uses the same picker.
- Connect result page: when `denied` has items, the page shows the success title plus one line that names each Source that was not granted. The `SCOPE_DENIED` text changes to say that Recap needs at least one Google Source.
- Landing page source lists: merge Google Calendar and Google Chat into one Google entry that names Calendar, Gmail, Drive and Chat.
- Mobile first: the dialog and the badge row wrap at 320 px.

### Docs and setup

- Update `GLOSSARY.md` (done), `PRODUCT.md` (tool landscape and first cut), and the Google parts of `work-identity-connections.md` so that they point to this spec.
- The Google Cloud OAuth consent screen must list the new scopes under Data Access. The app status is Production, unverified (ADR-0005). This is a manual step in the Google Cloud console for the dev and prod clients.

## Testing Decisions

- A good test checks behavior that a caller can see: the HTTP status and body, the redirect URL and its query, the rows that a route call leaves, and the return value of a pure function. It does not check private methods or call order.
- **API routes through Eden** (main seam): extend the identity module integration spec. Its fake Google client already stands in for `createAuthorization` and `exchangeCode` with `spyOn`. Add `revokeToken`, and let the fake return a chosen set of granted scopes. Cases:
  - Start with Sources asks for exactly those scopes plus `openid email`.
  - Start for `google` without Sources, with an empty list, or with Sources on a Jira request returns 400.
  - Full grant, partial grant (with the right `denied` value) and empty grant (`SCOPE_DENIED`).
  - Sub mismatch still wins over the scope check.
  - Reconnect on an active Google Connection replaces it with the new Sources. A failed exchange on reconnect keeps the old row.
  - The connection list returns `sources` for Google and `[]` for Jira.
  - Disconnect and Work Identity delete call `revokeToken` with the stored refresh token, and they finish when the revoke throws.
  - Jira and Linear still refuse a second active Connection.
  - Prior art: the "calendar connections" and "jira and linear connections" blocks, and `test.each` with `PROVIDER_CALLBACK_CASES`.
- **Google provider service unit test**: extend the Google service spec for `revokeToken`. It resolves for an `invalid_token` rejection, and it throws for a network or server failure. Spy on the SDK method, and never reach the network. Prior art: the current `createAuthorization` and `exchangeCode` tests in that spec.
- **API helper unit tests**: Sources to scopes, scopes to granted Sources (none, partial, all, and a Source with only some of its scopes), and denied Sources, with `test.each`. Prior art: the identity helpers spec.
- **Web helper tests** (pure functions, the current pattern): Source labels and descriptions, the default ticks for a first connect and a reconnect, the reading of `denied` into the result line, and the new provider label. Prior art: the `ConnectorRow` and `ConnectResultContainer` tests. Add no component render tests.
- **Manual checks**: the dialog, the badges and the result page in the browser at 320, 768, 1024 and 1440 px, with no horizontal scroll. One real consent on the dev client, to confirm the scope string in Google's token response and what the Chat scopes do for a free `@gmail.com` account.

## Out of Scope

- Connectors that read Calendar, Gmail, Drive or Chat data. This spec covers only the Connection.
- A per-Source on and off switch that does not need a new consent.
- Google incremental authorization (`include_granted_scopes`).
- Google verification and the CASA security assessment. ADR-0005 records the cost.
- Skipping the Chat scopes for free `@gmail.com` accounts.
- Any change to Jira, Linear, Slack or GitHub.

## Further Notes

- Gmail, Drive activity and Chat messages are restricted Google scopes. Until verification is done, users see Google's unverified-app warning, and Recap is capped at 100 users. Do not set the OAuth app to Testing status, because Google then expires refresh tokens after 7 days.
- A Google refresh token can also expire after six months with no use, or after a password change when Gmail scopes are granted. The current `needs_reconnect` status and the reconnect flow cover this.
- Recap has no users, so the rename from `google-calendar` to `google` keeps no old rows (no backward compatibility, per CLAUDE.md). A migration deletes `connection` rows with the provider `google-calendar` or `google-chat`. If they stay, the connection list fails its response schema.
