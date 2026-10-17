import type { schema } from "@recap/db";

import type {
  digestSettingsBody,
  digestSettingsResponse,
  digestTimeZoneError,
} from "#api/modules/digest/digest.model";

export type TDigestSettingRow = typeof schema.digestSetting.$inferSelect;
export type TDigestSettingsBody = typeof digestSettingsBody.static;
export type TDigestSettingsResponse = typeof digestSettingsResponse.static;
export type TDigestTimeZoneError = typeof digestTimeZoneError.static;
