# Recap

Recap builds a personal work overview by pulling a person's activity from the tools they work in.

## Language

**Connection**:
A user's authorized grant to an external provider, holding the credentials and scopes that data pulling runs on.
_Avoid_: integration, linked account, account

**Connector**:
The code that pulls data from an external provider through a Connection.
_Avoid_: integration, sync, importer

**Source**:
One stream of activity that Recap reads, such as Gmail, Google Calendar or Jira. A Connection grants one or more Sources.
_Avoid_: service, product, app, scope

**Work Identity**:
A person's professional identity anchored by one Google account. Owns Connections.
_Avoid_: linked account, persona, account, integration account

**Activity**:
One thing that happened in one Source for a Work Identity, such as a calendar event, an email, an issue change, a Chat message or a Drive comment.
_Avoid_: event, record, item, entry, log

**Digest**:
The AI summary of one user's day, with one section for each of their Work Identities.
_Avoid_: recap, summary, report, briefing

**Digest Window**:
The span of Activities that one Digest covers: from the previous Digest run to this one, plus the calendar events still ahead today. Monday's Digest Window starts at Friday's run.
_Avoid_: day, period, range
