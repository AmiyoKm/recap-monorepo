import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { EActivityKind, EActivityMessages, ESource } from "#api/modules/activity/activity.enums";
import { mapDriveActivities } from "#api/modules/activity/activity.helpers";
import type { TGoogleDriveActivity } from "#api/shared/providers/google/google.types";
import { CALENDAR_EMAIL } from "#api-tests/fixtures/fixtures.constants";

const CONTEXT = { identityEmail: CALENDAR_EMAIL, commentedFileIds: new Set<string>() };
const ME = { user: { knownUser: { isCurrentUser: true, personName: "people/me" } } };
const OTHER = { user: { knownUser: { isCurrentUser: false, personName: "people/other" } } };
const DISCUSSION = "https://docs.google.com/document/d/file-1/edit?disco=AAA";

const OWNERS = { me: ME, other: OTHER };

function item(owner: "me" | "other") {
  return {
    name: "items/file-1",
    title: "Q4 plan",
    owner: OWNERS[owner],
  };
}

function created(overrides: TGoogleDriveActivity = {}): TGoogleDriveActivity {
  return {
    timestamp: "2026-10-16T03:00:00.000Z",
    actors: [ME],
    targets: [{ driveItem: item("me") }],
    primaryActionDetail: { create: { new: {} } },
    ...overrides,
  };
}

function edited(overrides: TGoogleDriveActivity = {}): TGoogleDriveActivity {
  return created({ actors: [OTHER], primaryActionDetail: { edit: {} }, ...overrides });
}

function commentTarget(owner: "me" | "other") {
  return { fileComment: { linkToDiscussion: DISCUSSION, parent: item(owner) } };
}

function commented(
  subtype: string,
  overrides: TGoogleDriveActivity = {},
  mentionedUsers: object[] = [],
): TGoogleDriveActivity {
  return {
    timestamp: "2026-10-16T05:00:00.000Z",
    actors: [OTHER],
    targets: [commentTarget("me")],
    primaryActionDetail: { comment: { post: { subtype }, mentionedUsers } },
    ...overrides,
  };
}

describe("mapDriveActivities", () => {
  test("maps a file the user created to a Drive open link with authuser", () => {
    const { drafts } = mapDriveActivities([created()], CONTEXT);

    expect(drafts).toEqual([
      {
        source: ESource.DRIVE,
        kind: EActivityKind.DRIVE_FILE_CREATED,
        externalId: "create:file-1:2026-10-16T03:00:00.000Z:people/me",
        occurredAt: "2026-10-16T03:00:00.000Z",
        endsAt: null,
        title: "Q4 plan",
        url: `https://drive.google.com/open?id=file-1&authuser=${encodeURIComponent(CALENDAR_EMAIL)}`,
        actor: CALENDAR_EMAIL,
        detail: null,
      },
    ]);
  });

  test("skips a file created by someone else", () => {
    const { drafts } = mapDriveActivities(
      [created({ actors: [OTHER], targets: [{ driveItem: item("other") }] })],
      CONTEXT,
    );

    expect(drafts).toEqual([]);
  });

  test("maps an edit by another person on a file the user owns", () => {
    const { drafts } = mapDriveActivities([edited()], CONTEXT);

    expect(drafts[0]?.kind).toBe(EActivityKind.DRIVE_FILE_EDITED);
    expect(drafts[0]?.actor).toBeNull();
    expect(drafts[0]?.externalId).toBe("edit:file-1:2026-10-16T03:00:00.000Z:people/other");
  });

  test("skips the user's own edits and edits on files the user does not own", () => {
    const { drafts } = mapDriveActivities(
      [edited({ actors: [ME] }), edited({ targets: [{ driveItem: item("other") }] })],
      CONTEXT,
    );

    expect(drafts).toEqual([]);
  });

  test("maps a comment on a file the user owns to the discussion link with no text", () => {
    const { drafts } = mapDriveActivities([commented("ADDED")], CONTEXT);

    expect(drafts).toEqual([
      {
        source: ESource.DRIVE,
        kind: EActivityKind.DRIVE_COMMENT,
        externalId: "comment:file-1:2026-10-16T05:00:00.000Z:people/other",
        occurredAt: "2026-10-16T05:00:00.000Z",
        endsAt: null,
        title: "Q4 plan",
        url: `${DISCUSSION}&authuser=${encodeURIComponent(CALENDAR_EMAIL)}`,
        actor: null,
        detail: "Comment",
      },
    ]);
  });

  test("labels a reply and a mention of the user", () => {
    const { drafts } = mapDriveActivities(
      [
        commented("REPLY_ADDED"),
        commented("ADDED", { timestamp: "2026-10-16T06:00:00.000Z" }, [ME.user]),
      ],
      CONTEXT,
    );

    expect(drafts.map((draft) => draft.detail)).toEqual(["Reply", "Mention"]);
  });

  test("keeps a comment by the user and a mention on a file the user does not own", () => {
    const foreign = [commentTarget("other")];
    const { drafts } = mapDriveActivities(
      [
        commented("ADDED", { actors: [ME], targets: foreign }),
        commented("ADDED", { targets: foreign, timestamp: "2026-10-16T07:00:00.000Z" }, [ME.user]),
      ],
      CONTEXT,
    );

    expect(drafts.length).toBe(2);
  });

  test("skips a comment by another person on a foreign file the user did not comment on", () => {
    const { drafts } = mapDriveActivities(
      [commented("ADDED", { targets: [commentTarget("other")] })],
      CONTEXT,
    );

    expect(drafts).toEqual([]);
  });

  test("skips comment deletions, drops items with no link and de-duplicates", () => {
    const noLink = [{ fileComment: { parent: item("me") } }];
    const { drafts } = mapDriveActivities(
      [commented("DELETED"), commented("ADDED", { targets: noLink }), created(), created()],
      CONTEXT,
    );

    expect(drafts.length).toBe(1);
  });

  test("keeps a reply by another person on a foreign file the user commented on in the same page", () => {
    const foreign = [commentTarget("other")];
    const { drafts } = mapDriveActivities(
      [
        commented("REPLY_ADDED", { targets: foreign, timestamp: "2026-10-16T08:00:00.000Z" }),
        commented("ADDED", { actors: [ME], targets: foreign }),
      ],
      CONTEXT,
    );

    expect(drafts.map((draft) => draft.detail)).toEqual(["Reply", "Comment"]);
  });

  test("keeps a reply on a foreign file that the user commented on in an earlier page", () => {
    const foreign = [commentTarget("other")];
    const context = { ...CONTEXT, commentedFileIds: new Set(["file-1"]) };

    const { drafts } = mapDriveActivities(
      [commented("REPLY_ADDED", { targets: foreign })],
      context,
    );

    expect(drafts.map((draft) => draft.detail)).toEqual(["Reply"]);
  });

  test("does not count a deleted comment by the user as a comment on the file", () => {
    const foreign = [commentTarget("other")];
    const { drafts } = mapDriveActivities(
      [
        commented("DELETED", { actors: [ME], targets: foreign }),
        commented("ADDED", { targets: foreign }),
      ],
      CONTEXT,
    );

    expect(drafts).toEqual([]);
  });

  test("reads the time of an edit and a comment from timeRange when there is no timestamp", () => {
    const timeRange = {
      startTime: "2026-10-16T01:00:00.000Z",
      endTime: "2026-10-16T02:00:00.000Z",
    };
    const { drafts } = mapDriveActivities(
      [
        edited({ timestamp: undefined, timeRange }),
        commented("ADDED", { timestamp: undefined, timeRange }),
      ],
      CONTEXT,
    );

    expect(drafts.map((draft) => draft.occurredAt)).toEqual([timeRange.endTime, timeRange.endTime]);
    expect(drafts[0]?.externalId).toBe(`edit:file-1:${timeRange.endTime}:people/other`);
  });

  test("skips an activity with neither timestamp nor timeRange", () => {
    const { drafts } = mapDriveActivities([edited({ timestamp: undefined })], CONTEXT);

    expect(drafts).toEqual([]);
  });

  describe("when the discussion link is missing", () => {
    afterEach(() => {
      mock.restore();
    });

    test("logs the enum message with the file id in the cause", () => {
      const logged = spyOn(console, "error").mockImplementation(() => undefined);
      const noLink = [{ fileComment: { parent: item("me") } }];

      mapDriveActivities([commented("ADDED", { targets: noLink })], CONTEXT);

      expect(logged).toHaveBeenCalledWith(
        EActivityMessages.ITEM_WITHOUT_URL_DROPPED,
        `Error: ${EActivityMessages.ITEM_WITHOUT_URL_DROPPED} (file-1)`,
      );
    });
  });
});
