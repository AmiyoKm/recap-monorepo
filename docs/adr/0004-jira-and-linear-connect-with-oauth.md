# Jira and Linear connect with OAuth, not API keys

Jira and Linear Connections use the OAuth 2.0 authorization code flow, the same shape as Google Calendar: a pending grant keyed by `state`, a consent URL the user can open in any browser profile (ADR 0003), and one callback per provider (`/api/connect/<provider>/callback`). The user no longer pastes a token, an Atlassian email or a site. Refresh tokens are stored encrypted (ADR 0002). For Jira the callback also stores the site host and its cloud id, taken from the first accessible resource with `read:jira-work`.

- **Jira:** Atlassian OAuth 2.0 (3LO) through the `jira.js` OAuth helpers. Atlassian has no PKCE, so the pending grant stores no code verifier. Access tokens last about 1 hour and refresh tokens rotate on every use, so a future refresher must save the new refresh token each time.
- **Linear:** Linear OAuth with PKCE through the `arctic` generic OAuth client, because `@linear/sdk` has no OAuth helpers. Access tokens last 24 hours and Linear returns a new refresh token on each refresh.

## Consequences

- Migration `0001_oauth_only_connections` rebuilds the `connection` table and drops every existing Connection. Recap has no users yet, so the old API key rows are scrap data and the migration keeps no API key path. Users connect Jira and Linear again with OAuth.
- A Jira grant can reach more than one site. The callback keeps the first site with `read:jira-work` that `accessible-resources` lists. The Atlassian consent screen asks the user to pick a site, so this is normally the site they picked, but Recap does not offer its own site choice yet.
- Each environment needs a registered Atlassian app and a Linear OAuth app, with `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `LINEAR_CLIENT_ID` and `LINEAR_CLIENT_SECRET` in the Worker secrets. These are optional: when a pair is missing, the API still starts and that provider answers as not connectable yet.
