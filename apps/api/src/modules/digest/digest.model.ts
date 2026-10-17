import { t } from "elysia";

import {
  DIGEST_TIME_ZONE_MAX_LENGTH,
  DIGEST_TIME_ZONE_PATTERN,
  DIGEST_TIMESTAMP_MAX_LENGTH,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages } from "#api/modules/digest/digest.enums";

const timeZoneSchema = t.String({
  minLength: 1,
  maxLength: DIGEST_TIME_ZONE_MAX_LENGTH,
  pattern: DIGEST_TIME_ZONE_PATTERN,
});

export const digestSettingsBody = t.Object({
  timeZone: timeZoneSchema,
});

export const digestSettingsResponse = t.Object({
  timeZone: timeZoneSchema,
  nextRunAt: t.String({ maxLength: DIGEST_TIMESTAMP_MAX_LENGTH }),
});

export const digestTimeZoneError = t.Object({
  message: t.Literal(EDigestMessages.TIME_ZONE_INVALID),
});
