import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { eq } from "drizzle-orm";

import { schema } from "@recap/db";

import { EActivityKind } from "#api/modules/activity/activity.enums";
import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { EPullMessages } from "#api/modules/pull/pull.enums";
import { PullService } from "#api/modules/pull/pull.service";
import { decryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { db } from "#api/shared/db/db.client";
import { ENV } from "#api/shared/env/env.constants";
import type { IJiraIssuePage } from "#api/shared/providers/jira/jira.interfaces";
import { JiraService } from "#api/shared/providers/jira/jira.service";
import type { TJiraComment, TJiraIssue } from "#api/shared/providers/jira/jira.types";
import { JIRA_CLOUD_ID, JIRA_SITE } from "#api-tests/fixtures/fixtures.constants";
import {
  createUser,
  seedJiraConnection,
  uniqueEmail,
  wipeCache,
  wipeDatabase,
} from "#api-tests/fixtures/fixtures.helpers";

const LOOKBACK_DAYS = 7;
const MINUTES_TOLERANCE = 2;
const ROWS_PER_ISSUE = 3;
const REMOTE_COMMENT_AGE_MINUTES = 30;
const ROTATED_REFRESH_TOKEN = "jira-refresh-2";
const REFRESHED_TOKENS = {
  accessToken: "jira-fresh-access",
  refreshToken: ROTATED_REFRESH_TOKEN,
  expiresInSeconds: 3600,
  scopes: [],
};

function issue(key: string, id: string): TJiraIssue {
  const recent = dayjs().subtract(1, "hour");
  return {
    id,
    key,
    fields: {
      summary: `Summary ${key}`,
      created: recent.subtract(1, "day").toDate(),
      comment: {
        comments: [
          {
            id: `c-${id}`,
            created: recent.toDate(),
            author: { displayName: "Sam" },
            body: {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: "Looks good" }] }],
            },
          },
        ],
      },
    },
    changelog: {
      histories: [
        {
          id: `h-${id}`,
          created: recent.toDate(),
          items: [{ field: "status", fromString: "To Do", toString: "In Progress" }],
        },
      ],
    },
  };
}

function page(issues: TJiraIssue[], nextPageToken: string | null = null): IJiraIssuePage {
  return { issues, nextPageToken };
}

async function activityRows(connectionId: string) {
  return await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.connectionId, connectionId));
}

async function connectionRow(connectionId: string) {
  const rows = await db
    .select()
    .from(schema.connection)
    .where(eq(schema.connection.id, connectionId));
  return rows[0];
}

let seeded: Awaited<ReturnType<typeof seedJiraConnection>>;
let userId: string;

beforeEach(async () => {
  await wipeDatabase();
  await wipeCache();
  userId = await createUser(uniqueEmail());
  seeded = await seedJiraConnection(userId, "dev@employer.example");
  spyOn(JiraService, "refreshAccessToken").mockResolvedValue(REFRESHED_TOKENS);
});

afterEach(() => {
  mock.restore();
});

describe("PullService.pullConnection for Jira", () => {
  test("first pull reads 7 days back and saves one row per change with issue links", async () => {
    const search = spyOn(JiraService, "searchIssues").mockResolvedValue(
      page([issue("ERP-1", "1")]),
    );

    await PullService.pullConnection(seeded.connectionId);

    const input = search.mock.calls[0]?.[0];
    expect(input?.accessToken).toBe("jira-fresh-access");
    expect(input?.cloudId).toBe(JIRA_CLOUD_ID);
    expect(input?.pageToken).toBeNull();
    expect(dayjs().subtract(LOOKBACK_DAYS, "day").diff(dayjs(input?.since), "minute")).toBeLessThan(
      MINUTES_TOLERANCE,
    );
    const rows = await activityRows(seeded.connectionId);
    expect(rows.map((row) => row.kind).sort()).toEqual(
      [
        EActivityKind.ISSUE_COMMENTED,
        EActivityKind.ISSUE_CREATED,
        EActivityKind.ISSUE_STATUS_CHANGED,
      ].sort(),
    );
    const comment = rows.find((row) => row.kind === EActivityKind.ISSUE_COMMENTED);
    expect(comment?.url).toBe(`https://${JIRA_SITE}/browse/ERP-1?focusedCommentId=c-1`);
    expect(comment?.detail).toBe("Looks good");
    const status = rows.find((row) => row.kind === EActivityKind.ISSUE_STATUS_CHANGED);
    expect(status?.url).toBe(`https://${JIRA_SITE}/browse/ERP-1`);
    expect(status?.externalId).toBe("h-1:status");
    expect(status?.identityId).toBe(seeded.identityId);
  });

  test("reads from the previous run start on the next pull and does not duplicate rows", async () => {
    const search = spyOn(JiraService, "searchIssues").mockResolvedValue(
      page([issue("ERP-1", "1")]),
    );

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(dayjs().diff(dayjs(search.mock.calls[1]?.[0].since), "minute")).toBeLessThan(
      MINUTES_TOLERANCE,
    );
    expect((await activityRows(seeded.connectionId)).length).toBe(ROWS_PER_ISSUE);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("keeps the run since and passes the page token while pages remain", async () => {
    const search = spyOn(JiraService, "searchIssues")
      .mockResolvedValueOnce(page([], "next-token"))
      .mockResolvedValueOnce(page([]));

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(search.mock.calls[1]?.[0].pageToken).toBe("next-token");
    expect(search.mock.calls[1]?.[0].since).toBe(search.mock.calls[0]?.[0].since);
  });

  test("saves the rotated refresh token encrypted on the Connection", async () => {
    spyOn(JiraService, "searchIssues").mockResolvedValue(page([]));

    await PullService.pullConnection(seeded.connectionId);

    const row = await connectionRow(seeded.connectionId);
    expect(decryptSecret(ENV.connectionEncryptionKey, row?.refreshTokenEnc ?? "")).toBe(
      ROTATED_REFRESH_TOKEN,
    );
  });

  test("gives each Work Identity on the same site its own rows", async () => {
    const second = await seedJiraConnection(userId, "other@employer.example");
    spyOn(JiraService, "searchIssues").mockResolvedValue(page([issue("ERP-1", "1")]));

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(second.connectionId);

    expect((await activityRows(seeded.connectionId)).length).toBe(ROWS_PER_ISSUE);
    expect((await activityRows(second.connectionId)).length).toBe(ROWS_PER_ISSUE);
  });

  test("marks the Connection needs_reconnect when Atlassian rejects the refresh token", async () => {
    spyOn(JiraService, "refreshAccessToken").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);

    expect((await connectionRow(seeded.connectionId))?.status).toBe(
      EConnectionStatus.NEEDS_RECONNECT,
    );
  });

  test("marks the Connection needs_reconnect when Atlassian rejects a fresh access token", async () => {
    spyOn(JiraService, "searchIssues").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);

    expect((await connectionRow(seeded.connectionId))?.status).toBe(
      EConnectionStatus.NEEDS_RECONNECT,
    );
  });

  test("saves lastPullError and throws on other failures", async () => {
    spyOn(JiraService, "searchIssues").mockRejectedValue(new Error("boom"));

    const pull = PullService.pullConnection(seeded.connectionId);

    await expect(pull).rejects.toThrow("boom");
    expect((await connectionRow(seeded.connectionId))?.lastPullError).toContain("boom");
  });
});

function busyIssue(): TJiraIssue {
  const base = issue("ERP-1", "1");
  return {
    ...base,
    fields: {
      ...base.fields,
      comment: { comments: base.fields?.comment?.comments ?? [], total: 3 },
    },
  };
}

function remoteComment(id: string): TJiraComment {
  return {
    id,
    created: dayjs().subtract(REMOTE_COMMENT_AGE_MINUTES, "minute").toDate(),
    author: { displayName: "Sam" },
    body: {
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", content: [{ type: "text", text: `Remote ${id}` }] }],
    },
  };
}

const NO_HISTORIES = { items: [], nextStartAt: null };

describe("PullService.pullConnection for Jira with more comments than the search returned", () => {
  test("reads the remaining comment pages before the pull completes", async () => {
    const search = spyOn(JiraService, "searchIssues").mockResolvedValue(page([busyIssue()]));
    const read = spyOn(JiraService, "readIssuePages")
      .mockResolvedValueOnce({
        pages: {
          comments: { items: [remoteComment("c-2")], nextStartAt: 2 },
          histories: NO_HISTORIES,
        },
      })
      .mockResolvedValueOnce({
        pages: {
          comments: { items: [remoteComment("c-3")], nextStartAt: null },
          histories: NO_HISTORIES,
        },
      });

    await PullService.pullConnection(seeded.connectionId);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).toBeNull();
    await PullService.pullConnection(seeded.connectionId);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).toBeNull();
    await PullService.pullConnection(seeded.connectionId);

    expect(search.mock.calls.length).toBe(1);
    expect(read.mock.calls[0]?.[0]).toMatchObject({
      issueKey: "ERP-1",
      cloudId: JIRA_CLOUD_ID,
      commentsStartAt: 1,
      changelogStartAt: null,
    });
    expect(read.mock.calls[1]?.[0]).toMatchObject({ commentsStartAt: 2 });
    const rows = await activityRows(seeded.connectionId);
    expect(rows.map((row) => row.externalId).sort()).toEqual([
      "c-1",
      "c-2",
      "c-3",
      "created:1",
      "h-1:status",
    ]);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("keeps the run since until every pending issue is read", async () => {
    const search = spyOn(JiraService, "searchIssues").mockResolvedValue(page([busyIssue()]));
    spyOn(JiraService, "readIssuePages").mockResolvedValue({
      pages: {
        comments: { items: [remoteComment("c-2")], nextStartAt: null },
        histories: NO_HISTORIES,
      },
    });

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(search.mock.calls.length).toBe(2);
    expect(dayjs().diff(dayjs(search.mock.calls[1]?.[0].since), "minute")).toBeLessThan(
      MINUTES_TOLERANCE,
    );
  });

  test("drops a pending issue that Jira no longer has and finishes the pull", async () => {
    spyOn(JiraService, "searchIssues").mockResolvedValue(page([busyIssue()]));
    const read = spyOn(JiraService, "readIssuePages").mockResolvedValue({ pages: null });

    await PullService.pullConnection(seeded.connectionId);
    await PullService.pullConnection(seeded.connectionId);

    expect(read.mock.calls.length).toBe(1);
    expect((await connectionRow(seeded.connectionId))?.lastPulledAt).not.toBeNull();
  });

  test("retries with a fresh token when Atlassian rejects the cached token on a pending read", async () => {
    spyOn(JiraService, "searchIssues").mockResolvedValue(page([busyIssue()]));
    spyOn(JiraService, "readIssuePages").mockResolvedValue(null);

    await PullService.pullConnection(seeded.connectionId);
    const second = PullService.pullConnection(seeded.connectionId);

    await expect(second).rejects.toThrow(EPullMessages.CACHED_TOKEN_REJECTED);
  });
});
