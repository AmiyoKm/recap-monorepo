# Connection grants live in app tables, not Better Auth's account table

Better Auth's `account` table has OAuth token columns sitting unused, but data-read grants get their own `identity` and `connection` tables owned by the app. Mixing data grants into Better Auth would couple read credentials to the sign-in lifecycle (deleting a sign-in method would sever connections) and overload what "account" means. One Google OAuth client serves both flows with separate consents: sign-in requests `openid email profile`; connects request per-source read scopes, and signing in with Google never auto-creates a Work Identity.

Refresh tokens and API keys are stored in Postgres encrypted with AES-256-GCM (key from Secret Manager, key version prefixed for rotation); short-lived access tokens are cached in Redis keyed by connection id.
