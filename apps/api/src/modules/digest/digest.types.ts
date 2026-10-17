import type { z } from "zod";

import type { schema } from "@recap/db";

import type {
  digestAiOutputSchema,
  digestContent,
  digestInProgressError,
  digestItem,
  digestListResponse,
  digestMissingSource,
  digestNotFoundError,
  digestResponse,
  digestSection,
  digestSettingsBody,
  digestSettingsResponse,
  digestTimeZoneError,
} from "#api/modules/digest/digest.model";

export type TDigestSettingRow = typeof schema.digestSetting.$inferSelect;
export type TDigestRow = typeof schema.digest.$inferSelect;
export type TDigestSettingsBody = typeof digestSettingsBody.static;
export type TDigestSettingsResponse = typeof digestSettingsResponse.static;
export type TDigestTimeZoneError = typeof digestTimeZoneError.static;
export type TDigestItem = typeof digestItem.static;
export type TDigestSection = typeof digestSection.static;
export type TDigestContent = typeof digestContent.static;
export type TDigestMissingSource = typeof digestMissingSource.static;
export type TDigestResponse = typeof digestResponse.static;
export type TDigestListResponse = typeof digestListResponse.static;
export type TDigestNotFoundError = typeof digestNotFoundError.static;
export type TDigestInProgressError = typeof digestInProgressError.static;
export type TDigestAiOutput = z.infer<typeof digestAiOutputSchema>;
