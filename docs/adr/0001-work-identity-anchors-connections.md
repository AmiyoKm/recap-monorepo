# Connections hang under a Work Identity

Every Connection — including non-Google ones like Slack, Jira and Linear — belongs to a Work Identity, never directly to the user. The Work Identity is a person's professional identity anchored by one Google account, proven by OAuth consent, unique by Google `sub` per user and owned by exactly one user. Two users may each anchor the same Google account as their own Work Identity; a global uniqueness constraint would leak one user's accounts to another and deny availability. The Gmail is the join key that later turns workspace-wide tool data into one person's work.

## Considered Options

- **Flat connection list under the user**: rejected — it cannot answer "whose work is this?", which is the product's core question.
- **Free-form grouping bucket** ("Client A"): rejected — a label without meaning; the Google account is load-bearing, not incidental.
