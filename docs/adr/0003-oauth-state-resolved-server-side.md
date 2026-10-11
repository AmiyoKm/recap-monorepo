# OAuth connect state is resolved server-side, not from the session

Connect flows store a pending grant in Redis keyed by a high-entropy `state`, and the callback resolves the grant from `state` alone, with no Recap session required. This is what lets a user copy the consent URL into a different Chrome profile — where their work Google account lives — and complete the consent there.

## Consequences

- The consent URL is a bearer capability: whoever completes it binds their Google account to the pending grant. Accepted knowingly — same trust model as Slack connect links — and mitigated by showing the connected email on the post-connect page and in the identity list, and by rejecting Google consents whose `sub` does not match the identity being connected.
- Binding `state` to the web session later would silently break the cross-profile requirement; do not "fix" this.
