import { toStringRecord } from "#api/shared/json/json.helpers";
import {
  GOOGLE_AUTHORIZATION_CODE_GRANT,
  GOOGLE_AUTHORIZE_ENDPOINT,
  GOOGLE_CODE_RESPONSE_TYPE,
  GOOGLE_CONSENT_PROMPT,
  GOOGLE_OFFLINE_ACCESS_TYPE,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
} from "#api/shared/provider/provider.constants";
import { EProviderMessages } from "#api/shared/provider/provider.enums";
import type {
  IAuthorizeUrlInput,
  ICodeExchangeInput,
  IGoogleOAuthConfig,
  IGoogleUserinfo,
  IProviderClient,
  ITokenSet,
} from "#api/shared/provider/provider.interfaces";

function requireGoogleConfig(config: IGoogleOAuthConfig): {
  clientId: string;
  clientSecret: string;
} {
  if (!(config.clientId && config.clientSecret)) {
    throw new Error(EProviderMessages.GOOGLE_NOT_CONFIGURED);
  }
  return { clientId: config.clientId, clientSecret: config.clientSecret };
}

function readStringField(body: unknown, field: string): string | undefined {
  const record = toStringRecord(body);
  if (!record) {
    return undefined;
  }
  const value = record[field];
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function readNumberField(body: unknown, field: string): number | undefined {
  const record = toStringRecord(body);
  if (!record) {
    return undefined;
  }
  const value = record[field];
  if (typeof value === "number") {
    return value;
  }
  return undefined;
}

function parseUserinfo(body: unknown): IGoogleUserinfo {
  const sub = readStringField(body, "sub");
  const email = readStringField(body, "email");
  if (!(sub && email)) {
    throw new Error(EProviderMessages.INVALID_USERINFO);
  }
  return {
    sub,
    email,
    name: readStringField(body, "name"),
    picture: readStringField(body, "picture"),
  };
}

export function createGoogleProviderClient(config: IGoogleOAuthConfig): IProviderClient {
  return {
    buildAuthorizeUrl(input: IAuthorizeUrlInput): string {
      const { clientId } = requireGoogleConfig(config);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: input.redirectUri,
        response_type: GOOGLE_CODE_RESPONSE_TYPE,
        scope: input.scopes.join(" "),
        state: input.state,
        access_type: GOOGLE_OFFLINE_ACCESS_TYPE,
        prompt: GOOGLE_CONSENT_PROMPT,
      });
      return `${GOOGLE_AUTHORIZE_ENDPOINT}?${params.toString()}`;
    },

    async exchangeCode(input: ICodeExchangeInput): Promise<ITokenSet> {
      const { clientId, clientSecret } = requireGoogleConfig(config);
      const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: input.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: input.redirectUri,
          grant_type: GOOGLE_AUTHORIZATION_CODE_GRANT,
        }).toString(),
      });
      if (!response.ok) {
        throw new Error(EProviderMessages.TOKEN_EXCHANGE_FAILED, { cause: response.status });
      }
      const body: unknown = await response.json();
      const accessToken = readStringField(body, "access_token");
      if (!accessToken) {
        throw new Error(EProviderMessages.TOKEN_EXCHANGE_FAILED);
      }
      return {
        accessToken,
        refreshToken: readStringField(body, "refresh_token"),
        expiresInSeconds: readNumberField(body, "expires_in"),
      };
    },

    async fetchGoogleUserinfo(accessToken: string): Promise<IGoogleUserinfo> {
      requireGoogleConfig(config);
      const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(EProviderMessages.USERINFO_FAILED, { cause: response.status });
      }
      return parseUserinfo(await response.json());
    },

    validateApiKey(): Promise<never> {
      return Promise.reject(new Error(EProviderMessages.API_KEY_VALIDATION_UNSUPPORTED));
    },
  };
}
