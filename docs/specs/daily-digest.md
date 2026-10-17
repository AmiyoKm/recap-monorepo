> Spec location: `docs/specs/`. Decisions come from the grill recorded in ADR-0006 (`docs/adr/0006-hourly-pulls-on-queues-digests-on-workflows.md`) and ADR-0007 (`docs/adr/0007-embed-digest-sections-not-activities.md`). Terms come from `GLOSSARY.md`.

## Problem Statement

A Recap user can connect Google, Jira and Linear to each Work Identity, but Recap reads nothing from them. The dashboard shows "Coming soon". Each morning the user must open Calendar, Gmail, Chat, Jira and Linear for each Work Identity to see what happened since yesterday and what comes today. That takes time, and items get lost between tools and identities.

## Solution

Recap reads every active Connection each hour and saves each thing that happened as an Activity. On Monday to Friday at 8:00 in the user's time zone, Recap makes a Digest: an AI summary of the Digest Window, with one section for each Work Identity. Each section has highlights, the meetings still ahead today and the open items that need the user. The dashboard shows today's Digest, past Digests by date and a Regenerate button. A new "Activity" page in the sidebar shows every Activity as a row in a data table, with filters. A "Digest" card in Settings holds the user's time zone and shows the next run time.

## User Stories

1. As a Recap user, I want Recap to read my connected Sources each hour, so that my Activities are current during the day.
2. As a Recap user, I want Recap to read Google Calendar, Gmail, Google Chat, Google Drive, Jira and Linear, so that the Digest covers all the tools I connected.
3. As a Recap user, I want a new Connection to bring in the last 7 days, so that my first Digest and my Activity page are not empty.
4. As a Recap user, I want Recap to read only calendar events that I did not decline, so that cancelled plans do not fill my Digest.
5. As a Recap user, I want Recap to read mail that I sent and mail in my Inbox, and skip Promotions, Social, Spam and Trash, so that mail noise stays out.
6. As a privacy-minded Recap user, I want Recap to read only the subject, recipients and date of mail, so that my message text stays private.
7. As a Recap user, I want Recap to read Chat messages that I sent, that mention me, or that are in a DM, so that I see the conversations that concern me.
8. As a Recap user, I want Recap to read Jira and Linear issues in which I am the assignee, the reporter or a commenter, so that I see the work that is mine.
9. As a Recap user, I want each status change, comment and assignment on an issue to be its own Activity, so that the Digest knows the order of events.
10. As a Recap user, I want a calendar event that moves to a new time to update its Activity, so that I do not see the same meeting twice.
11. As a Recap user with two Work Identities on the same Jira site, I want each Work Identity to get its own Activity for a shared item, so that each Digest section shows that identity's view.
12. As a Recap user, I want a Digest each Monday to Friday at 8:00 in my time zone, so that I can read it at the start of my day.
13. As a Recap user, I want no Digest on Saturday and Sunday, so that Recap does not make Digests on days I do not work.
14. As a Recap user, I want Monday's Digest to cover the weekend, so that nothing from Friday to Monday goes missing.
15. As a Recap user, I want the Digest Window to start at the previous Digest run, so that no Activity falls between two Digests.
16. As a Recap user, I want the Digest to show the meetings still ahead today, so that I can plan my day from it.
17. As a Recap user with more than one Work Identity, I want one Digest with one section per Work Identity, so that I read one page each morning.
18. As a Recap user, I want each Digest section to have highlights, meetings ahead and open items that need me, so that I can scan it fast.
19. As a Recap user, I want the items in a Digest to link to their Activities, so that I can open the source item in one click.
20. As a Recap user, I want today's Digest on the dashboard, so that I see it as soon as I sign in.
21. As a Recap user, I want a date control on the dashboard, so that I can open a past Digest.
22. As a Recap user, I want a clear empty state for a date with no Digest, so that I know Recap made no Digest that day.
23. As a Recap user, I want a "Nothing new" Digest on a day with no Activities, so that I know the run happened.
24. As a Recap user, I want a "Nothing new" Digest to still show today's meetings, so that the morning view stays useful.
25. As a Recap user, I want a Regenerate button on the dashboard, so that I can make today's Digest again after I connect a new Source.
26. As a Recap user, I want Regenerate to replace today's Digest, so that I do not get two Digests for one day.
27. As a Recap user, I want Recap to allow one manual run at a time, so that a double click does not start two runs.
28. As a Recap user, I want Regenerate to work on any day, so that I can get a Digest on a weekend if I want one.
29. As a Recap user, I want to see that a Digest is in progress, so that I know to wait.
30. As a Recap user, I want an error alert with a Regenerate button when a Digest fails, so that I can try again.
31. As a Recap user, I want my Activities to stay saved when the Digest fails, so that a retry needs only the AI step.
32. As a Recap user, I want the Digest to still come when one Source fails, so that one bad Connection does not block my morning.
33. As a Recap user, I want the Digest to say which Sources it did not read, so that I know a part is missing.
34. As a Recap user, I want a Connection that the provider rejects to show "Reconnect" in Settings, so that I can fix it.
35. As a Recap user, I want an "Activity" item in the sidebar, so that I can open all my Activities.
36. As a Recap user, I want the Activity page to show one Activity per row with time, Source, Work Identity, kind, title and actor, so that I can see what happened.
37. As a Recap user, I want each Activity title to link to the item in its tool, so that I can open it.
38. As a Recap user, I want to filter Activities by a date range, so that I can look at one period.
39. As a Recap user, I want to filter Activities by Source, so that I can look at one tool.
40. As a Recap user, I want to filter Activities by Work Identity, so that I can look at one job.
41. As a Recap user, I want to filter Activities by kind, so that I can look at, for example, only comments.
42. As a Recap user, I want to search Activities by text, so that I can find one item fast.
43. As a Recap user, I want the Activity table to page on the server, so that it stays fast as my history grows.
44. As a Recap user, I want the newest Activities first, so that recent work is at the top.
45. As a Recap user on a phone, I want the Activity table to hide its secondary columns, so that it fits the screen.
46. As a Recap user, I want a clear empty state on the Activity page when no Activities match, so that I know the filters are the cause.
47. As a Recap user, I want a "Digest" card in Settings with a time zone select, so that the Digest comes at 8:00 where I live.
48. As a Recap user, I want the time zone to default to Asia/Dhaka, so that I need no setup.
49. As a Recap user, I want the Digest card to show the next run time, so that I know when the next Digest comes.
50. As a Recap user, I want every Activity and every Digest item to link to the exact item in its tool (the Chat message, the Google Doc, the Doc comment, the Linear issue), so that I can open it in one click.
51. As a Recap user with more than one Google account, I want Google links to open in the account of the right Work Identity, so that I do not get an access error.
52. As a Recap user, I want Recap to read the Google Docs and other Drive files that I create, and the comments and edits on them, so that my document work is in the Digest.
53. As a Recap user, I want Recap to keep my Activities with no time limit, so that the Activity page holds my full history.
54. As a Recap operator, I want each pull to run as its own Queue message, so that one Connection's failure or retry does not affect the others.
55. As a Recap operator, I want each Digest to run as a Workflow with retried steps, so that a short AI or provider outage does not lose the Digest.
56. As a Recap operator, I want Recap to stay inside the Workers free plan limits, so that it costs nothing to run.
57. As a Recap operator, I want each Digest section embedded in Vectorize, so that a later "ask my history" feature has data from day one.

## Implementation Decisions

### Sources and scopes

- The Google Connection keeps its four Sources from ADR-0005: Calendar, Gmail, Drive and Chat, with the same scopes. No scope changes.
- Drive reads, through the Drive Activity API (`drive.activity.readonly`): files that the user created, edits by other people on files that the user created, and comments, replies and mentions on those files and on files where the user commented. One Activity per action. Recap does not read the comment text, because that needs `drive.readonly`, which can read every file. A Drive comment Activity holds the file title, the actor, the action and the mentioned users.

### Schema (packages/db)

- **`activity`**: id, identityId (cascade on Work Identity delete), connectionId (cascade on Connection delete), source (Source enum value: `calendar`, `gmail`, `chat`, `drive`, `jira`, `linear`), kind (Activity kind enum), externalId, occurredAt (ISO text), endsAt (ISO text, calendar only), title, url (not null), actor, detail (short text, such as the comment body or the mail recipients), createdAt, updatedAt.
  - Unique index on (connectionId, externalId). A pull upserts on that key. For an issue change, the externalId names the change (for example the Jira changelog id or the Linear history id), so each change is its own row. For a calendar event, a mail or a Chat message, the externalId is the item id, so an edit updates the row in place.
  - Indexes for the Activity page: (identityId, occurredAt) and (source, occurredAt).
- **`connection`**: add `pullCursor` (text, provider-specific: a Gmail history id, a Calendar sync token, or an ISO time for Jira, Linear and Chat), `lastPulledAt` and `lastPullError`.
- **`digest_setting`**: userId (primary key, cascade), timeZone (IANA name, default `Asia/Dhaka`), createdAt, updatedAt. A user with no row uses the default.
- **`digest`**: id, userId (cascade), digestDate (the local date in the user's time zone, text `YYYY-MM-DD`), windowStart, windowEnd (ISO text), status (Digest status enum: `pending`, `running`, `ready`, `failed`), content (JSON text of the structured output, null until `ready`), missingSources (JSON text list of Connection ids and Sources that failed), model, error, createdAt, updatedAt. Unique index on (userId, digestDate).
- Kind and status values are enums in the API and in the DB schema only as text, per the repo rules.

### Activity links

Every Activity has a URL that opens the exact item in its tool. A mapper that cannot build a URL drops the item and logs it, so no row has an empty link. Google links carry the Work Identity email as `authuser`, so the browser opens the right Google account when the user has more than one. Every URL base lives in `ROUTES`.

| Source | Kind | Link |
|---|---|---|
| Calendar | `calendar_event` | the event `htmlLink` from the Calendar API |
| Gmail | `email_sent`, `email_received` | the Gmail web URL for the message thread id |
| Chat | `chat_message`, `chat_mention` | the Chat web URL built from the space, thread and message ids |
| Drive | `drive_file_created`, `drive_file_edited` | the Drive open URL for the file id |
| Drive | `drive_comment` | the `linkToDiscussion` of the comment from the Drive Activity API |
| Jira | `issue_*` | the issue URL on the Jira site; `issue_commented` adds the focused comment id |
| Linear | `issue_*` | the `url` of the issue or the comment from `@linear/sdk` |

Check the Gmail and Chat web URL formats against a real item before you fix them in `ROUTES`, because those APIs do not return a URL.

### Activity kinds

One enum for all Sources: `calendar_event`, `email_sent`, `email_received`, `chat_message`, `chat_mention`, `drive_file_created`, `drive_file_edited`, `drive_comment`, `issue_created`, `issue_status_changed`, `issue_assigned`, `issue_commented`. Each Connector maps its data to these kinds in a `.helpers.ts` mapper.

### Provider services (shared/providers)

- New read methods, each through the provider SDK only:
  - Google: list calendar events since a sync token, list Gmail message metadata by label and history id (no `q` filter, because `gmail.metadata` does not allow it), list Chat spaces and messages since a time, list Drive activity since a time.
  - Jira (`jira.js`): search issues where the user is the assignee, the reporter or a commenter and that changed since a time, with the changelog and comments.
  - Linear (`@linear/sdk`): the same, with issue history and comments.
- An access token method per provider: it returns a cached access token from `CacheService` (key prefix already exists) or refreshes it. Jira and Linear rotate refresh tokens, so the refresh saves the new encrypted refresh token on the Connection each time.
- Each method returns `null` when the provider rejects the credentials and throws on every other failure, per the repo rule. The caller sets the Connection to `needs_reconnect` on `null`.
- Each method takes a page cursor and returns one page plus the next cursor. A pull handles one page per call, because a Queue consumer or Workflow step gets only 10 ms CPU and 50 subrequests on the free plan.

### Activity module (modules/activity)

- **ActivityRepository**: upsert a batch of Activities with `db.batch`, list with filters and paging, read the Activities of one user in a Digest Window grouped by Work Identity.
- **PullService.pullConnection(connectionId)**: the main entry point for one Queue message. It gets an access token, reads pages from the saved cursor (first pull: 7 days back), maps them to Activities, upserts them, then saves the new cursor, `lastPulledAt` and clears `lastPullError`. It stops after a fixed page count per message and sends a follow-up message when more pages remain. On rejected credentials it sets `needs_reconnect` and returns. On other errors it saves `lastPullError` and throws, so the Queue retries the message.
- **Route** `GET /activities`: query has `from`, `to`, `source[]`, `identityId[]`, `kind[]`, `q` (text search on title, actor and detail, with `maxLength`), `page`, `pageSize` (fixed maximum). Response: rows plus total count. Every status is declared in `response`. Only the signed-in user's Work Identities are visible.

### Digest module (modules/digest)

- **Due-user rule** (pure helper): given the current UTC time and a time zone, a user is due when the local hour is 8, the local weekday is Monday to Friday, and no Digest row exists for that local date. The window starts at the previous Digest's `windowEnd`. When there is no previous Digest, it starts 24 hours before (Monday: at Friday 8:00 local).
- **DigestService** entry points that the Workflow steps call:
  - `startDigest(userId, now)`: creates or resets the Digest row for the local date with status `pending`, and fixes the window.
  - `finalPull(userId)`: pulls each active Connection of the user once (the same code as the Queue consumer), and records the failed ones in `missingSources`.
  - `writeDigest(digestId)`: reads the Digest Window Activities and today's remaining calendar Activities, and calls the AI. With no Activities and no meetings ahead, it skips the AI call and saves a "Nothing new" content object. It saves the content with status `ready`.
  - `embedDigest(digestId)`: embeds each section and upserts the vectors into Vectorize.
  - Any step that fails after its retries sets status `failed` and saves the error.
- **AI**: AI SDK (`ai`) with `@ai-sdk/google`, model `gemini-3.5-flash-lite` held in one constant in the Digest module. Structured output with a `t`-free schema that the AI SDK accepts (a Zod or JSON schema at the AI boundary only), validated before save. Follow the latest AI SDK docs through context7 when you write the call. The key is one Worker secret, `GOOGLE_GENERATIVE_AI_API_KEY`, added to `ENV` and required at startup.
- **Digest content shape**: a list of sections, one per Work Identity (identity id, email). Each section has `highlights`, `meetingsAhead` and `needsYou`. Each item is a short text plus the Activity ids it comes from, so the web can link to the Activities. Also a top-level `missingSources` list.
- **Embeddings**: `google.embedding('gemini-embedding-2')` with `outputDimensionality` 768. One vector per section, id built from the Digest id and the identity id, metadata with userId, identityId and digestDate. The Vectorize index uses userId as a metadata index, so a later reader can filter by user. Nothing reads the vectors in this spec.
- **Routes**:
  - `GET /digests/:date` returns the Digest for that local date (any status) or a 404 with an enum message.
  - `GET /digests` returns the dates that have a Digest, for the date control.
  - `POST /digests/regenerate` starts a Workflow for today's local date. It returns 409 when a Digest for today is `pending` or `running`.
  - `GET /digest-settings` and `PUT /digest-settings` read and set the time zone (validated against the IANA list), and return the next run time.

### Worker entry and bindings

- `scheduled` (the hourly cron that exists): delete expired pending grants (as now), send one Queue message per active Connection, and start one Workflow per due user (`createBatch`, at most 100 per call).
- `queue` handler: for each message, call `PullService.pullConnection`, then ack, or retry on throw.
- A `DigestWorkflow` class (Cloudflare Workflows) with one `step.do` per DigestService entry point. The class only calls services.
- `wrangler.jsonc`: a Queue (producer and consumer) named per environment, the Workflow binding, and a Vectorize index binding, for `dev` and `prod`. Run `bun run cf-typegen` after. All bindings are read through `bindings`. Add the new resources to `scripts/provision-workers.sh`.
- Fan-out cost on the free plan is in ADR-0006 (about 20 users on the Queue operations limit).

### Web

- **Dashboard**: replace the "Coming soon" RecapPanel with a Digest panel. States: `Skeleton` while loading, the Digest sections as cards, an `Empty` for a date with no Digest, an in-progress state for `pending` and `running` (the query polls until the status changes), and an `Alert` with Regenerate for `failed`. A date control (shadcn `Calendar` in a `Popover`) enables only the dates that have a Digest. A Regenerate `Button` is disabled while a run is in progress. Missing Sources show as a small alert in the panel.
- **Activity page**: a new `/activity` route under `_app`, an "Activity" `AppSidebarNavItem`, and an `AppPage` with a shadcn `Table` data table. The filters live in the URL search params (TanStack Router `validateSearch`), so a filtered view can be shared and reloaded. Columns: time, Source, Work Identity, kind, title (external link), actor. Hide Work Identity, kind and actor below `sm`. Pagination with shadcn `Pagination`.
- **Settings**: a "Digest" `Card` with a time zone `Combobox` and the next run time.
- New API domains in `src/api/`: `digest` and `activity`, each with keys, queries, mutations, types derived from Eden, and enum mirrors for Source, kind and Digest status.

## Testing Decisions

- A good test checks behaviour that a caller can see: the rows in D1, the route response, the rendered state. It does not check private methods, call order inside a service, or SDK request shapes beyond what the provider fake needs.
- **Pipeline entry points (main seam)**: `PullService.pullConnection` and each `DigestService` step run on the local D1 with `providers.*` read methods and the AI SDK `generateText` and `embedMany` replaced by `spyOn`. Cases: first pull goes 7 days back; the cursor moves on; a second pull upserts and does not duplicate; an issue change makes a new row; a moved event updates its row; rejected credentials set `needs_reconnect` and do not throw; other errors save `lastPullError` and throw; a Digest with one failed Source is `ready` with that Source in `missingSources`; an empty window skips the AI call and saves "Nothing new"; an AI failure sets `failed` and keeps the Activities. Prior art: `identity.repository.spec.ts` (local D1) and the provider service specs (spies).
- **Routes through Eden**: `/activities` filters, text search, paging and the per-user boundary; `/digests/:date` 200 and 404; `/digests/regenerate` 409 while a run is in progress (the Workflow binding is spied); `/digest-settings` validation. Prior art: `identity.module.spec.ts`.
- **Provider services**: one spec per new read method and per token refresh, with a spy on the SDK client, including the rejected-credentials `null` and the rotated refresh token save. Prior art: `google.service.spec.ts`, `jira.service.spec.ts`, `linear.service.spec.ts`.
- **Pure helpers**: the due-user rule with `test.each` (time zones, 8:00 only, Saturday and Sunday skipped, Monday window from Friday, no previous Digest) and the Activity mappers per Source. Each mapper test checks that every kind gets a non-empty URL of the expected form, with `authuser` on Google links, and that an item with no URL is dropped. Prior art: `identity.helpers.spec.ts`, `google.helpers.spec.ts`.
- **Web**: container tests for the Digest panel states and for the Activity page filters writing to the URL. Prior art: `DashboardContainer.test.ts`, `SourcePicker.test.ts`.
- The Queue consumer, the Workflow class and `scheduled` stay thin and have no tests of their own.

## Out of Scope

- Slack and GitHub Connectors.
- A per-user Digest hour or per-user work days. The hour is 8:00 and the days are Monday to Friday.
- Per-user AI keys and other AI providers.
- A reader for the vectors ("ask my history"), and semantic search on the Activity page.
- A retention limit or deletion of old Activities.
- Email or push notifications when a Digest is ready.
- A weekly Digest.
- A choice of Jira site when a grant reaches more than one site (ADR-0004).

## Further Notes

- WARNING: use a paid-tier Gemini key in prod. On the free tier, Google can use prompts to improve its products, and the prompts hold mail subjects and Chat text.
- The Google OAuth app needs verification for the restricted Gmail, Drive activity and Chat scopes (ADR-0005).
- The free-plan limits that shape the pull (10 ms CPU, 50 subrequests and 50 D1 queries per invocation or step; 10,000 Queue operations and 100,000 D1 row writes per day) come from the Cloudflare docs as of October 2026. Check them again before you raise the pull frequency.
- The Activity row count grows with no limit. D1 allows 500 MB per database on the free plan. Watch the size once real Connections run.
