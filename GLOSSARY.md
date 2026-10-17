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
