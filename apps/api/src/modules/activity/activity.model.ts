import { t } from "elysia";

import {
  ACTIVITY_ACTOR_MAX_LENGTH,
  ACTIVITY_DETAIL_MAX_LENGTH,
  ACTIVITY_EMAIL_MAX_LENGTH,
  ACTIVITY_FILTER_VALUES_MAX,
  ACTIVITY_ID_MAX_LENGTH,
  ACTIVITY_PAGE_MAX,
  ACTIVITY_PAGE_SIZE_MAX,
  ACTIVITY_QUERY_MAX_LENGTH,
  ACTIVITY_TIMESTAMP_MAX_LENGTH,
  ACTIVITY_TITLE_MAX_LENGTH,
  ACTIVITY_URL_MAX_LENGTH,
} from "#api/modules/activity/activity.constants";
import { EActivityKind, ESource } from "#api/modules/activity/activity.enums";

const sourceSchema = t.Union([
  t.Literal(`${ESource.CALENDAR}`),
  t.Literal(`${ESource.GMAIL}`),
  t.Literal(`${ESource.CHAT}`),
  t.Literal(`${ESource.DRIVE}`),
  t.Literal(`${ESource.JIRA}`),
  t.Literal(`${ESource.LINEAR}`),
]);

const activityKindSchema = t.Union([
  t.Literal(`${EActivityKind.CALENDAR_EVENT}`),
  t.Literal(`${EActivityKind.EMAIL_SENT}`),
  t.Literal(`${EActivityKind.EMAIL_RECEIVED}`),
  t.Literal(`${EActivityKind.CHAT_MESSAGE}`),
  t.Literal(`${EActivityKind.CHAT_MENTION}`),
  t.Literal(`${EActivityKind.DRIVE_FILE_CREATED}`),
  t.Literal(`${EActivityKind.DRIVE_FILE_EDITED}`),
  t.Literal(`${EActivityKind.DRIVE_COMMENT}`),
  t.Literal(`${EActivityKind.ISSUE_CREATED}`),
  t.Literal(`${EActivityKind.ISSUE_STATUS_CHANGED}`),
  t.Literal(`${EActivityKind.ISSUE_ASSIGNED}`),
  t.Literal(`${EActivityKind.ISSUE_COMMENTED}`),
]);

export const activityListQuery = t.Object({
  from: t.Optional(t.String({ format: "date-time", maxLength: ACTIVITY_TIMESTAMP_MAX_LENGTH })),
  to: t.Optional(t.String({ format: "date-time", maxLength: ACTIVITY_TIMESTAMP_MAX_LENGTH })),
  source: t.Optional(t.ArrayQuery(sourceSchema, { maxItems: ACTIVITY_FILTER_VALUES_MAX })),
  identityId: t.Optional(
    t.ArrayQuery(t.String({ maxLength: ACTIVITY_ID_MAX_LENGTH }), {
      maxItems: ACTIVITY_FILTER_VALUES_MAX,
    }),
  ),
  kind: t.Optional(t.ArrayQuery(activityKindSchema, { maxItems: ACTIVITY_FILTER_VALUES_MAX })),
  q: t.Optional(t.String({ maxLength: ACTIVITY_QUERY_MAX_LENGTH })),
  page: t.Optional(t.Numeric({ minimum: 1, maximum: ACTIVITY_PAGE_MAX })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: ACTIVITY_PAGE_SIZE_MAX })),
});

export const activityResponse = t.Object({
  id: t.String({ maxLength: ACTIVITY_ID_MAX_LENGTH }),
  identityId: t.String({ maxLength: ACTIVITY_ID_MAX_LENGTH }),
  identityEmail: t.String({ maxLength: ACTIVITY_EMAIL_MAX_LENGTH }),
  source: sourceSchema,
  kind: activityKindSchema,
  occurredAt: t.String({ maxLength: ACTIVITY_TIMESTAMP_MAX_LENGTH }),
  endsAt: t.Nullable(t.String({ maxLength: ACTIVITY_TIMESTAMP_MAX_LENGTH })),
  title: t.String({ maxLength: ACTIVITY_TITLE_MAX_LENGTH }),
  url: t.String({ maxLength: ACTIVITY_URL_MAX_LENGTH }),
  actor: t.Nullable(t.String({ maxLength: ACTIVITY_ACTOR_MAX_LENGTH })),
  detail: t.Nullable(t.String({ maxLength: ACTIVITY_DETAIL_MAX_LENGTH })),
});

export const activityListResponse = t.Object({
  rows: t.Array(activityResponse),
  total: t.Integer({ minimum: 0 }),
  page: t.Integer({ minimum: 1 }),
  pageSize: t.Integer({ minimum: 1 }),
});
