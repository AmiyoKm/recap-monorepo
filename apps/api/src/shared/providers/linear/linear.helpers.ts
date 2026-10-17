import type { OAuth2Tokens } from "arctic";

import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

function linearRefreshToken(tokens: OAuth2Tokens): string | undefined {
  if (!tokens.hasRefreshToken()) {
    return undefined;
  }
  return tokens.refreshToken();
}

function linearScopes(tokens: OAuth2Tokens): string[] {
  if (!tokens.hasScopes()) {
    return [];
  }
  return tokens.scopes();
}

export function toLinearTokens(tokens: OAuth2Tokens): IProviderTokens {
  return {
    accessToken: tokens.accessToken(),
    refreshToken: linearRefreshToken(tokens),
    expiresInSeconds: tokens.accessTokenExpiresInSeconds(),
    scopes: linearScopes(tokens),
  };
}
