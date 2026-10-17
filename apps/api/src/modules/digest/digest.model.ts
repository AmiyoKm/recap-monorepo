import { t } from "elysia";
import { z } from "zod";

import { ESource } from "#api/modules/activity/activity.enums";
import { sourceSchema } from "#api/modules/activity/activity.model";
import {
  DIGEST_DATE_MAX_LENGTH,
  DIGEST_DATE_PATTERN,
  DIGEST_EMAIL_MAX_LENGTH,
  DIGEST_ERROR_MAX_LENGTH,
  DIGEST_ID_MAX_LENGTH,
  DIGEST_ITEM_ACTIVITY_IDS_MAX,
  DIGEST_ITEM_TEXT_MAX_LENGTH,
  DIGEST_ITEMS_MAX,
  DIGEST_LIST_MAX,
  DIGEST_MISSING_SOURCES_MAX,
  DIGEST_PROVIDER_MAX_LENGTH,
  DIGEST_SECTIONS_MAX,
  DIGEST_SOURCES_MAX,
  DIGEST_TIME_ZONE_MAX_LENGTH,
  DIGEST_TIME_ZONE_PATTERN,
  DIGEST_TIMESTAMP_MAX_LENGTH,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages, EDigestStatus } from "#api/modules/digest/digest.enums";

const timeZoneSchema = t.String({
  minLength: 1,
  maxLength: DIGEST_TIME_ZONE_MAX_LENGTH,
  pattern: DIGEST_TIME_ZONE_PATTERN,
});

const timestampSchema = t.String({ maxLength: DIGEST_TIMESTAMP_MAX_LENGTH });
const idSchema = t.String({ maxLength: DIGEST_ID_MAX_LENGTH });
const dateSchema = t.String({ maxLength: DIGEST_DATE_MAX_LENGTH, pattern: DIGEST_DATE_PATTERN });

export const digestSettingsBody = t.Object({
  timeZone: timeZoneSchema,
});

export const digestSettingsResponse = t.Object({
  timeZone: timeZoneSchema,
  nextRunAt: timestampSchema,
});

export const digestTimeZoneError = t.Object({
  message: t.Literal(EDigestMessages.TIME_ZONE_INVALID),
});

export const digestDateParams = t.Object({ date: dateSchema });

export const digestItem = t.Object({
  text: t.String({ maxLength: DIGEST_ITEM_TEXT_MAX_LENGTH }),
  activityIds: t.Array(idSchema, { maxItems: DIGEST_ITEM_ACTIVITY_IDS_MAX }),
});

export const digestSection = t.Object({
  identityId: idSchema,
  identityEmail: t.String({ maxLength: DIGEST_EMAIL_MAX_LENGTH }),
  highlights: t.Array(digestItem, { maxItems: DIGEST_ITEMS_MAX }),
  meetingsAhead: t.Array(digestItem, { maxItems: DIGEST_ITEMS_MAX }),
  needsYou: t.Array(digestItem, { maxItems: DIGEST_ITEMS_MAX }),
});

export const digestContent = t.Object({
  nothingNew: t.Boolean(),
  truncated: t.Boolean(),
  sections: t.Array(digestSection, { maxItems: DIGEST_SECTIONS_MAX }),
});

export const digestMissingSource = t.Object({
  connectionId: idSchema,
  identityEmail: t.String({ maxLength: DIGEST_EMAIL_MAX_LENGTH }),
  provider: t.String({ maxLength: DIGEST_PROVIDER_MAX_LENGTH }),
  sources: t.Array(sourceSchema, { maxItems: DIGEST_SOURCES_MAX }),
});

const digestMissingSources = t.Array(digestMissingSource, {
  maxItems: DIGEST_MISSING_SOURCES_MAX,
});

export const digestResponse = t.Object({
  id: idSchema,
  digestDate: dateSchema,
  status: t.Union([
    t.Literal(`${EDigestStatus.PENDING}`),
    t.Literal(`${EDigestStatus.RUNNING}`),
    t.Literal(`${EDigestStatus.READY}`),
    t.Literal(`${EDigestStatus.FAILED}`),
  ]),
  windowStart: timestampSchema,
  windowEnd: timestampSchema,
  content: t.Nullable(digestContent),
  missingSources: digestMissingSources,
  error: t.Nullable(t.String({ maxLength: DIGEST_ERROR_MAX_LENGTH })),
  updatedAt: timestampSchema,
});

export const digestListResponse = t.Object({
  today: dateSchema,
  dates: t.Array(dateSchema, { maxItems: DIGEST_LIST_MAX }),
});

export const digestNotFoundError = t.Object({
  message: t.Literal(EDigestMessages.DIGEST_NOT_FOUND),
});

export const digestInProgressError = t.Object({
  message: t.Literal(EDigestMessages.DIGEST_IN_PROGRESS),
});

const storedItemSchema = z.object({ text: z.string(), activityIds: z.array(z.string()) });

export const digestStoredContentSchema = z.object({
  nothingNew: z.boolean(),
  truncated: z.boolean(),
  sections: z.array(
    z.object({
      identityId: z.string(),
      identityEmail: z.string(),
      highlights: z.array(storedItemSchema),
      meetingsAhead: z.array(storedItemSchema),
      needsYou: z.array(storedItemSchema),
    }),
  ),
});

export const digestStoredMissingSourcesSchema = z.array(
  z.object({
    connectionId: z.string(),
    identityEmail: z.string(),
    provider: z.string(),
    sources: z.array(z.enum(ESource)),
  }),
);

const aiItemSchema = z.object({
  text: z.string().max(DIGEST_ITEM_TEXT_MAX_LENGTH),
  activityIds: z.array(z.string()),
});

export const digestAiOutputSchema = z.object({
  sections: z.array(
    z.object({
      identityId: z.string(),
      highlights: z.array(aiItemSchema),
      meetingsAhead: z.array(aiItemSchema),
      needsYou: z.array(aiItemSchema),
    }),
  ),
});
