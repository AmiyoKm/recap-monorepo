import { t } from "elysia";

import {
  MAX_ACCOUNT_ID_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ID_LENGTH,
  MAX_OAUTH_CODE_LENGTH,
  MAX_OAUTH_ERROR_LENGTH,
  MAX_SCOPES_LENGTH,
  MAX_SITE_LENGTH,
  MAX_STATE_LENGTH,
  MAX_TIMESTAMP_LENGTH,
  MAX_URL_LENGTH,
} from "#api/modules/identity/identity.constants";
import { EConnectionStatus, EIdentityMessages } from "#api/modules/identity/identity.enums";
import { EProvider } from "#api/shared/providers/providers.enums";

export const identityIdParams = t.Object({
  identityId: t.String({ maxLength: MAX_ID_LENGTH }),
});

export const connectionIdParams = t.Object({
  connectionId: t.String({ maxLength: MAX_ID_LENGTH }),
});

export const oauthCallbackQuery = t.Object({
  code: t.Optional(t.String({ maxLength: MAX_OAUTH_CODE_LENGTH })),
  error: t.Optional(t.String({ maxLength: MAX_OAUTH_ERROR_LENGTH })),
  state: t.String({ maxLength: MAX_STATE_LENGTH }),
});

const providerSchema = t.Union([
  t.Literal(`${EProvider.GOOGLE_CALENDAR}`),
  t.Literal(`${EProvider.JIRA}`),
  t.Literal(`${EProvider.LINEAR}`),
  t.Literal(`${EProvider.SLACK}`),
  t.Literal(`${EProvider.GOOGLE_CHAT}`),
  t.Literal(`${EProvider.GITHUB}`),
]);

const connectionStatusSchema = t.Union([
  t.Literal(`${EConnectionStatus.ACTIVE}`),
  t.Literal(`${EConnectionStatus.NEEDS_RECONNECT}`),
]);

export const connectConnectionBody = t.Object({
  provider: providerSchema,
});

export const connectionResponse = t.Object({
  id: t.String({ maxLength: MAX_ID_LENGTH }),
  provider: providerSchema,
  status: connectionStatusSchema,
  scopes: t.Nullable(t.String({ maxLength: MAX_SCOPES_LENGTH })),
  providerAccountId: t.Nullable(t.String({ maxLength: MAX_ACCOUNT_ID_LENGTH })),
  providerAccountEmail: t.Nullable(t.String({ maxLength: MAX_EMAIL_LENGTH })),
  providerSite: t.Nullable(t.String({ maxLength: MAX_SITE_LENGTH })),
  createdAt: t.String({ maxLength: MAX_TIMESTAMP_LENGTH }),
  updatedAt: t.String({ maxLength: MAX_TIMESTAMP_LENGTH }),
});

export const identityResponse = t.Object({
  id: t.String({ maxLength: MAX_ID_LENGTH }),
  email: t.String({ maxLength: MAX_EMAIL_LENGTH }),
  displayName: t.Nullable(t.String({ maxLength: MAX_DISPLAY_NAME_LENGTH })),
  avatarUrl: t.Nullable(t.String({ maxLength: MAX_URL_LENGTH })),
  createdAt: t.String({ maxLength: MAX_TIMESTAMP_LENGTH }),
  updatedAt: t.String({ maxLength: MAX_TIMESTAMP_LENGTH }),
  connections: t.Array(connectionResponse),
});

export const identityListResponse = t.Array(identityResponse);

export const authorizeResponse = t.Object({
  authorizeUrl: t.String({ maxLength: MAX_URL_LENGTH }),
});

export const deleteResponse = t.Object({
  deleted: t.Boolean(),
});

export const identityNotFoundError = t.Object({
  message: t.Literal(EIdentityMessages.IDENTITY_NOT_FOUND),
});

export const connectionNotFoundError = t.Object({
  message: t.Literal(EIdentityMessages.CONNECTION_NOT_FOUND),
});

export const connectBadRequestError = t.Object({
  message: t.Literal(EIdentityMessages.PROVIDER_UNSUPPORTED),
});
