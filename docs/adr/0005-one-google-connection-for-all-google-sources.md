# One Google Connection for all Google Sources

A Work Identity has one `google` Connection. It grants up to four Sources: Calendar, Gmail, Drive and Chat. The user ticks the Sources in a Recap dialog, and Recap then sends one Google consent for the ticked Sources only. This replaces the separate `google-calendar` and `google-chat` providers. One account then needs one consent, and the user decides about mail access in Recap, where each Source has a line that says what Recap reads.

## Scopes

| Source | Scope | Google class |
|---|---|---|
| Calendar | `calendar.readonly` | sensitive |
| Gmail | `gmail.metadata` | restricted |
| Drive | `drive.activity.readonly` | restricted |
| Chat | `chat.spaces.readonly`, `chat.messages.readonly` | sensitive, restricted |

Recap uses `gmail.metadata` and not `gmail.readonly`. Both are restricted and cost the same to verify. A digest needs only the subject, recipients and date, so Recap does not ask for message text. The cost: `gmail.metadata` does not allow the `q` search filter, so a Gmail Connector must page by label and date.

## Considered Options

- **One Connection per Source**, each with its own consent: four consent screens for one account, and four rows for the same refresh token.
- **Workspace scopes on identity creation**: this saves one consent but breaks ADR-0001, where proof of the account grants nothing.
- **Per-Source connect buttons with incremental auth**: this gives more consent screens and makes it harder to know what the grant holds.

## Consequences

- **Partial grants.** Google lets the user untick single scopes. The callback saves the Connection when at least one Source is granted. It stores the Sources that Google granted, and it reports each requested Source that Google did not grant. A grant with no Source fails with `SCOPE_DENIED`.
- **Reconnect replaces.** To add a Source, the user reconnects. The dialog ticks the current Sources, and the new grant replaces the Connection. Recap does not revoke on reconnect, because a revoke ends the whole grant for Recap, and that includes the new token.
- **Disconnect revokes.** Disconnect, and delete of a Work Identity, revoke the refresh token at Google before the row goes. Without this, Google keeps the old scopes and a Source cannot be removed. A failed revoke does not block the delete.
- **Google verification.** Gmail, Drive activity and Chat messages are restricted scopes. Until Google verification and a CASA security assessment are complete, the OAuth app stays in Production status, unverified: users see Google's unverified-app warning, and Recap is capped at 100 users. Do not use Testing status, because Google expires its refresh tokens after 7 days.
- **Chat on free accounts.** Google documents the Chat API only for Workspace accounts. Recap still asks for the Chat scopes for every account. A later Chat Connector must handle a free `@gmail.com` account that the API rejects.
