import { t } from "elysia";

import {
  MAX_API_KEY_LENGTH,
  MAX_ID_LENGTH,
  MAX_OAUTH_CODE_LENGTH,
  MAX_STATE_LENGTH,
  MIN_API_KEY_LENGTH,
} from "#api/modules/identity/identity.constants";
import { EIdentityProvider } from "#api/modules/identity/identity.enums";

export const identityIdParams = t.Object({
  identityId: t.String({ maxLength: MAX_ID_LENGTH }),
});

export const connectionIdParams = t.Object({
  connectionId: t.String({ maxLength: MAX_ID_LENGTH }),
});

export const googleCallbackQuery = t.Object({
  code: t.String({ maxLength: MAX_OAUTH_CODE_LENGTH }),
  state: t.String({ maxLength: MAX_STATE_LENGTH }),
});

export const connectApiKeyBody = t.Object({
  provider: t.Union([
    t.Literal(`${EIdentityProvider.JIRA}`),
    t.Literal(`${EIdentityProvider.LINEAR}`),
  ]),
  apiKey: t.String({ minLength: MIN_API_KEY_LENGTH, maxLength: MAX_API_KEY_LENGTH }),
});
