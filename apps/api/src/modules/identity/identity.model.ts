import { t } from "elysia";

import {
  MAX_ID_LENGTH,
  MAX_OAUTH_CODE_LENGTH,
  MAX_STATE_LENGTH,
} from "#api/modules/identity/identity.constants";

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
