import type { ISessionProvider, ISessionUser } from "#api/shared/session/session.interfaces";

export async function fetchSessionUser(
  provider: ISessionProvider,
  headers: Headers,
): Promise<ISessionUser | null> {
  const session = await provider.api.getSession({ headers });
  if (!session) {
    return null;
  }
  return session.user;
}
