# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Knowledge workers whose work is spread across tools (Google Calendar, Google Chat, Jira, Linear, Slack, GitHub) and who want one daily/weekly overview of what they did, without manual bookkeeping. Recap ships as a public product from day one (confirmed 2026-10-11); the first real users are the developer's own two work profiles (one on Jira/Google, one on Linear/Slack), so real data exists but onboarding polish must assume strangers.

## Product Purpose

Recap builds a personal work overview: it pulls a person's activity from the tools they work in and turns it into a daily and weekly digest with an AI summary. The user brings their own AI API key (Anthropic, OpenAI, Gemini or Ollama) and configures the digests. Success means: a user connects their tools once and thereafter gets a trustworthy overview of their work.

## Positioning

Activity is anchored to professional identities, not to a login. A user proves ownership of each Google account they work under (a Work Identity) and hangs tool Connections off it, so data from tickets, calendars, chats and code joins up per employer or role. The user brings their own AI key, so the digest belongs to them. A neighbouring digest tool could copy the summary; it cannot copy the identity-anchored connection model without re-architecting its data model.

## Operating Context

- Sources are connected once from the Settings page. The Google consent URL is explicitly designed to be completed in a different browser profile, where the work Google account actually lives; the cross-profile flow is a core workflow, not an edge case, and the UI must make copy-and-paste of the consent URL a first-class action.
- Tool landscape: Google Calendar, Google Chat, Jira, Linear, Slack, GitHub.
- Digests: daily and weekly, AI-summarized with the user's own key.
- Deployment: web on Cloudflare Workers, API on GCP Cloud Run (dev and prod).

## Capabilities and Constraints

- Binding terminology (GLOSSARY.md): Work Identity (professional identity anchored by one Google account; owns Connections), Connection (authorized grant to an external provider, holding credentials and scopes), Connector (code that pulls data through a Connection).
- Sign-in (Better Auth, Google) never auto-creates a Work Identity. Identity creation is a separate, explicit consent that requests only the email scope and stores no token.
- Credentials (refresh tokens, API keys) live server-side, encrypted with AES-256-GCM, and are never sent to the web app.
- First cut of connectable sources: Google Calendar (OAuth), Jira and Linear (API key). Slack, Google Chat and GitHub are registered providers that are not wired yet.
- Not built yet (as of 2026-10-11): data pulling, digest building, scheduling. Settings ships identities and connections only.

## Brand Commitments

- Name: Recap.
- Visual world: the incumbent shadcn/ui implementation with the owner's custom Tailwind theme in `apps/web/src/index.css` is the binding visual world for app surfaces (confirmed 2026-10-11). No separate logo or brand assets exist yet.

## Evidence on Hand

- Repo docs: HANDOFF.md (stack and current state), GLOSSARY.md, docs/adr/0001-0003, docs/specs/work-identity-connections.md.
- No marketing copy, testimonials, screenshots of digests, or customer material exists; none may be invented. Digest UI does not exist yet.

## Product Principles

1. Identity before data: every pull is attributed to a proven Work Identity; nothing connects to a bare user.
2. Overview over surveillance: show what was done, calmly; status is visible, never alarming.
3. Provenance by default: every claim Recap makes must trace back to a source the user can see and revoke.
4. Credentials are the user's: server-side and encrypted, never exposed to the client, revocable in one action.
5. Consent is explicit and separate: proving an identity and granting data access are distinct consents.
