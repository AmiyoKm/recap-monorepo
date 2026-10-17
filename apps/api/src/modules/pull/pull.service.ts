import { ESource } from "#api/modules/activity/activity.enums";
import {
  mapCalendarEvents,
  mapChatMessages,
  mapDriveActivities,
  mapGmailMessages,
  mapJiraIssuePages,
  mapJiraIssues,
  mapLinearIssues,
} from "#api/modules/activity/activity.helpers";
import type { IActivityBatch } from "#api/modules/activity/activity.interfaces";
import { ActivityRepository } from "#api/modules/activity/activity.repository";
import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { connectionTokenKey } from "#api/modules/identity/identity.helpers";
import {
  CHAT_SPACES_PER_PAGE,
  PULL_ERROR_MAX_LENGTH,
  PULL_MAX_PAGES_PER_MESSAGE,
  PULLABLE_PROVIDERS,
  QUEUE_SEND_BATCH_MAX,
} from "#api/modules/pull/pull.constants";
import { EPullMessages, EPullOutcome } from "#api/modules/pull/pull.enums";
import {
  accessTokenTtlSeconds,
  chatPageToken,
  chatSpaceId,
  chatSpacesToRead,
  completedChatCursor,
  gmailMessagesSince,
  isPullableProvider,
  jiraGoneCursor,
  jiraSourcePage,
  linearGoneStep,
  linearListStep,
  linearNestedStep,
  linearStepHasMore,
  nextCalendarCursor,
  nextChatSpaceCursor,
  nextChatSpacesPageCursor,
  nextDriveCursor,
  nextGmailBackfillStep,
  nextGmailHistoryStep,
  nextJiraCursor,
  nextJiraPendingCursor,
  nextLinearCursor,
  parseCalendarCursor,
  parseChatCursor,
  parseCursorMap,
  parseDriveCursor,
  parseGmailCursor,
  parseJiraCursor,
  parseLinearCursor,
  readableSources,
  readConnectionId,
  remainingSources,
  restartGmailPage,
  serializeCursorMap,
  startCycle,
} from "#api/modules/pull/pull.helpers";
import type {
  IAccessToken,
  IGmailCursor,
  IJiraCursor,
  ILinearCursor,
  ILinearStep,
  IPullState,
  IPullTarget,
  ISourcePage,
  ISourceReadInput,
} from "#api/modules/pull/pull.interfaces";
import { PullRepository } from "#api/modules/pull/pull.repository";
import type { TConnectionRow } from "#api/modules/pull/pull.types";
import { chunk } from "#api/shared/array/array.helpers";
import { bindings } from "#api/shared/bindings/bindings.client";
import type { IPullMessage } from "#api/shared/bindings/bindings.interfaces";
import { CacheService } from "#api/shared/cache/cache.service";
import { decryptSecret, encryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { ENV } from "#api/shared/env/env.constants";
import { describeError, logError } from "#api/shared/logger/logger.helpers";
import { EGmailLabel } from "#api/shared/providers/google/google.enums";
import type { IJiraPendingCursor } from "#api/shared/providers/jira/jira.interfaces";
import type { ILinearNestedCursor } from "#api/shared/providers/linear/linear.interfaces";
import { providers } from "#api/shared/providers/providers.client";
import { EProvider } from "#api/shared/providers/providers.enums";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

export abstract class PullService {
  static async enqueueActiveConnections(): Promise<void> {
    const ids = await PullRepository.listActiveConnectionIds(PULLABLE_PROVIDERS);
    const batches = chunk(ids, QUEUE_SEND_BATCH_MAX);
    await Promise.all(
      batches.map((batch) =>
        bindings.PULL_QUEUE.sendBatch(
          batch.map((connectionId) => ({ body: { connectionId } satisfies IPullMessage })),
        ),
      ),
    );
  }

  static async handleMessage(message: Message<unknown>): Promise<void> {
    const connectionId = readConnectionId(message.body);
    if (!connectionId) {
      logError(EPullMessages.MESSAGE_INVALID, new Error(message.id));
      message.ack();
      return;
    }
    try {
      await PullService.pullConnection(connectionId);
      message.ack();
    } catch (error) {
      logError(EPullMessages.PULL_FAILED, error);
      message.retry();
    }
  }

  static async pullConnection(connectionId: string): Promise<void> {
    const outcome = await PullService.pullConnectionUpTo(connectionId, PULL_MAX_PAGES_PER_MESSAGE);
    if (outcome !== EPullOutcome.MORE_PAGES) {
      return;
    }
    await bindings.PULL_QUEUE.send({ connectionId } satisfies IPullMessage);
  }

  static async pullConnectionUpTo(connectionId: string, maxPages: number): Promise<EPullOutcome> {
    const target = await PullRepository.findPullTarget(connectionId);
    if (!target || target.connection.status !== EConnectionStatus.ACTIVE) {
      return EPullOutcome.COMPLETE;
    }
    if (!isPullableProvider(target.connection.provider)) {
      return EPullOutcome.COMPLETE;
    }
    try {
      return await PullService.pull(target, maxPages);
    } catch (error) {
      await PullRepository.saveError(
        connectionId,
        describeError(error).slice(0, PULL_ERROR_MAX_LENGTH),
      );
      throw error;
    }
  }

  private static async pull(target: IPullTarget, maxPages: number): Promise<EPullOutcome> {
    const { connection } = target;
    const sources = readableSources(connection);
    const hasSources = sources.length > 0;
    if (!hasSources) {
      await PullRepository.saveComplete(connection.id, dayjs().toISOString());
      return EPullOutcome.COMPLETE;
    }
    const token = await PullService.resolveAccessToken(connection);
    if (!token) {
      await PullService.markRejected(connection.id);
      return EPullOutcome.REJECTED;
    }
    const cursors = parseCursorMap(connection.pullCursor);
    const outcome = await PullService.pullPages({
      target,
      accessToken: token.value,
      now: dayjs().toISOString(),
      cursors,
      queue: startCycle(sources, cursors),
      pagesLeft: maxPages,
    });
    await PullService.finish(connection.id, outcome, token);
    return outcome;
  }

  private static async finish(
    connectionId: string,
    outcome: EPullOutcome,
    token: IAccessToken,
  ): Promise<void> {
    switch (outcome) {
      case EPullOutcome.COMPLETE:
        await PullRepository.saveComplete(connectionId, dayjs().toISOString());
        return;
      case EPullOutcome.MORE_PAGES:
        return;
      case EPullOutcome.REJECTED:
        await PullService.handleRejected(connectionId, token);
        return;
    }
  }

  private static async handleRejected(connectionId: string, token: IAccessToken): Promise<void> {
    if (!token.isCached) {
      await PullService.markRejected(connectionId);
      return;
    }
    await PullService.dropCachedToken(connectionId);
    throw new Error(EPullMessages.CACHED_TOKEN_REJECTED);
  }

  private static async markRejected(connectionId: string): Promise<void> {
    await PullService.dropCachedToken(connectionId);
    await PullRepository.markNeedsReconnect(
      connectionId,
      dayjs().toISOString(),
      EPullMessages.CREDENTIALS_REJECTED,
    );
  }

  private static async pullPages(state: IPullState): Promise<EPullOutcome> {
    const [source] = state.queue;
    if (!source) {
      return EPullOutcome.COMPLETE;
    }
    if (state.pagesLeft === 0) {
      return EPullOutcome.MORE_PAGES;
    }
    const page = await PullService.readSourcePage(source, {
      target: state.target,
      accessToken: state.accessToken,
      cursor: state.cursors.get(source)?.value ?? null,
      now: state.now,
    });
    if (!page) {
      return EPullOutcome.REJECTED;
    }
    await PullService.savePage(state, source, page);
    return PullService.pullPages({
      ...state,
      queue: remainingSources(state.queue, page.hasMore),
      pagesLeft: state.pagesLeft - 1,
    });
  }

  private static async savePage(
    state: IPullState,
    source: ESource,
    page: ISourcePage,
  ): Promise<void> {
    const { connection } = state.target;
    await ActivityRepository.upsertAndRemove({
      ...page.batch,
      identityId: connection.identityId,
      connectionId: connection.id,
    });
    state.cursors.set(source, { value: page.nextCursor, isPending: page.hasMore });
    await PullRepository.saveProgress(connection.id, serializeCursorMap(state.cursors));
  }

  private static readSourcePage(
    source: ESource,
    input: ISourceReadInput,
  ): Promise<ISourcePage | null> {
    switch (source) {
      case ESource.CALENDAR:
        return PullService.readCalendarPage(input);
      case ESource.DRIVE:
        return PullService.readDrivePage(input);
      case ESource.GMAIL:
        return PullService.readGmailPage(input);
      case ESource.CHAT:
        return PullService.readChatPage(input);
      case ESource.JIRA:
        return PullService.readJiraPage(input);
      case ESource.LINEAR:
        return PullService.readLinearPage(input);
    }
  }

  private static async readGmailPage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const cursor = parseGmailCursor(input.cursor, input.now);
    if (cursor.label === null && cursor.historyId !== null) {
      return PullService.readGmailHistoryPage(input, cursor, cursor.historyId);
    }
    const page = await providers.google.listGmailMessages({
      accessToken: input.accessToken,
      label: cursor.label ?? EGmailLabel.SENT,
      pageToken: cursor.pageToken,
    });
    if (!page) {
      return null;
    }
    const step = nextGmailBackfillStep(cursor, page);
    return {
      batch: mapGmailMessages(gmailMessagesSince(page.messages, cursor.cutoff), {
        identityEmail: input.target.identityEmail,
      }),
      nextCursor: JSON.stringify(step.cursor),
      hasMore: step.hasMore,
    };
  }

  private static async readGmailHistoryPage(
    input: ISourceReadInput,
    cursor: IGmailCursor,
    startHistoryId: string,
  ): Promise<ISourcePage | null> {
    const page = await providers.google.listGmailHistory({
      accessToken: input.accessToken,
      startHistoryId,
      pageToken: cursor.pageToken,
    });
    if (!page) {
      return null;
    }
    if (page.isHistoryExpired) {
      return restartGmailPage(input.now);
    }
    const step = nextGmailHistoryStep(cursor, page);
    return {
      batch: mapGmailMessages(page.messages, { identityEmail: input.target.identityEmail }),
      nextCursor: JSON.stringify(step.cursor),
      hasMore: step.hasMore,
    };
  }

  private static async readCalendarPage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const cursor = parseCalendarCursor(input.cursor, input.now);
    const page = await providers.google.listCalendarEvents({
      accessToken: input.accessToken,
      syncToken: cursor.syncToken,
      pageToken: cursor.pageToken,
      timeMin: cursor.timeMin,
      timeMax: cursor.timeMax,
    });
    if (!page) {
      return null;
    }
    return {
      batch: mapCalendarEvents(page.events, {
        identityEmail: input.target.identityEmail,
        timeZone: page.timeZone,
      }),
      nextCursor: nextCalendarCursor(cursor, page),
      hasMore: page.nextPageToken !== null,
    };
  }

  private static async readChatPage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const userId = input.target.connection.providerAccountId;
    if (!userId) {
      throw new Error(EPullMessages.ACCOUNT_ID_MISSING, { cause: input.target.connection.id });
    }
    const cursor = parseChatCursor(input.cursor, input.now);
    const spacesPage = await providers.google.listChatSpaces({
      accessToken: input.accessToken,
      pageToken: cursor.spacesPageToken,
    });
    if (!spacesPage) {
      return null;
    }
    const pending = chatSpacesToRead(spacesPage.spaces, cursor);
    const slice = pending.slice(0, CHAT_SPACES_PER_PAGE);
    const batch: IActivityBatch = { drafts: [], removedExternalIds: [] };
    for (const space of slice) {
      const page = await providers.google.listChatMessages({
        accessToken: input.accessToken,
        spaceId: space.id,
        since: cursor.since,
        pageToken: chatPageToken(cursor, space.id),
      });
      if (!page) {
        return null;
      }
      const mapped = mapChatMessages(page.messages, {
        identityEmail: input.target.identityEmail,
        userId,
        spaceId: chatSpaceId(space.id),
        isDirectMessage: space.isDirectMessage,
      });
      batch.drafts.push(...mapped.drafts);
      if (page.nextPageToken) {
        const next = { ...cursor, resumeSpace: space.id, pageToken: page.nextPageToken };
        return { batch, nextCursor: JSON.stringify(next), hasMore: true };
      }
    }
    const lastRead = slice.at(-1);
    if (lastRead && pending.length > slice.length) {
      const next = nextChatSpaceCursor(cursor, lastRead.id);
      return { batch, nextCursor: JSON.stringify(next), hasMore: true };
    }
    if (spacesPage.nextPageToken) {
      const next = nextChatSpacesPageCursor(cursor, spacesPage.nextPageToken);
      return { batch, nextCursor: JSON.stringify(next), hasMore: true };
    }
    return { batch, nextCursor: JSON.stringify(completedChatCursor(cursor)), hasMore: false };
  }

  private static async readDrivePage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const cursor = parseDriveCursor(input.cursor, input.now);
    const page = await providers.google.listDriveActivity({
      accessToken: input.accessToken,
      timeMin: cursor.timeMin,
      pageToken: cursor.pageToken,
    });
    if (!page) {
      return null;
    }
    const commentedFileIds = await ActivityRepository.listCommentedDriveFileIds(
      input.target.connection.id,
    );
    return {
      batch: mapDriveActivities(page.activities, {
        identityEmail: input.target.identityEmail,
        commentedFileIds: new Set(commentedFileIds),
      }),
      nextCursor: nextDriveCursor(cursor, page),
      hasMore: page.nextPageToken !== null,
    };
  }

  private static async readJiraPage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const { providerSite, providerResourceId } = input.target.connection;
    if (!(providerSite && providerResourceId)) {
      throw new Error(EPullMessages.JIRA_SITE_MISSING);
    }
    const cursor = parseJiraCursor(input.cursor, input.now);
    const [pending] = cursor.pending;
    if (pending) {
      return PullService.readJiraPendingPage(input, cursor, pending);
    }
    const page = await providers.jira.searchIssues({
      accessToken: input.accessToken,
      cloudId: providerResourceId,
      since: cursor.since,
      pageToken: cursor.pageToken,
    });
    if (!page) {
      return null;
    }
    const { overflow, ...batch } = mapJiraIssues(page.issues, {
      site: providerSite,
      since: cursor.since,
      offset: cursor.offset,
    });
    return jiraSourcePage(batch, nextJiraCursor(cursor, page, overflow));
  }

  private static async readJiraPendingPage(
    input: ISourceReadInput,
    cursor: IJiraCursor,
    pending: IJiraPendingCursor,
  ): Promise<ISourcePage | null> {
    const { providerSite, providerResourceId } = input.target.connection;
    if (!(providerSite && providerResourceId)) {
      throw new Error(EPullMessages.JIRA_SITE_MISSING);
    }
    const read = await providers.jira.readIssuePages({
      ...pending,
      accessToken: input.accessToken,
      cloudId: providerResourceId,
    });
    if (!read) {
      return null;
    }
    if (!read.pages) {
      return jiraSourcePage({ drafts: [], removedExternalIds: [] }, jiraGoneCursor(cursor));
    }
    return jiraSourcePage(
      mapJiraIssuePages(read.pages, pending, {
        site: providerSite,
        since: cursor.since,
        offset: 0,
      }),
      nextJiraPendingCursor(cursor, pending, read.pages),
    );
  }

  private static async readLinearPage(input: ISourceReadInput): Promise<ISourcePage | null> {
    const cursor = parseLinearCursor(input.cursor, input.now);
    const [nested] = cursor.pending;
    if (nested) {
      return PullService.readLinearNestedPage(input, cursor, nested);
    }
    const page = await providers.linear.listIssues({
      accessToken: input.accessToken,
      since: cursor.since,
      after: cursor.after,
    });
    if (!page) {
      return null;
    }
    return PullService.linearSourcePage(
      cursor,
      mapLinearIssues(page.issues, { since: cursor.since }),
      linearListStep(page, cursor.since),
    );
  }

  private static async readLinearNestedPage(
    input: ISourceReadInput,
    cursor: ILinearCursor,
    nested: ILinearNestedCursor,
  ): Promise<ISourcePage | null> {
    const read = await providers.linear.readIssue({
      ...nested,
      accessToken: input.accessToken,
      since: cursor.since,
    });
    if (!read) {
      return null;
    }
    if (!read.issue) {
      return PullService.linearSourcePage(
        cursor,
        { drafts: [], removedExternalIds: [] },
        linearGoneStep(cursor),
      );
    }
    return PullService.linearSourcePage(
      cursor,
      mapLinearIssues([read.issue], { since: cursor.since }),
      linearNestedStep(cursor, read.issue, cursor.since),
    );
  }

  private static linearSourcePage(
    cursor: ILinearCursor,
    batch: IActivityBatch,
    step: ILinearStep,
  ): ISourcePage {
    return {
      batch,
      nextCursor: nextLinearCursor(cursor, step),
      hasMore: linearStepHasMore(step),
    };
  }

  private static async resolveAccessToken(
    connection: TConnectionRow,
  ): Promise<IAccessToken | null> {
    const cached = await CacheService.get(connectionTokenKey(connection.id));
    if (cached) {
      return { value: cached, isCached: true };
    }
    const tokens = await PullService.refreshAccessToken(connection);
    if (!tokens) {
      return null;
    }
    await PullService.cacheToken(connection.id, tokens.accessToken, tokens.expiresInSeconds);
    return { value: tokens.accessToken, isCached: false };
  }

  private static refreshAccessToken(connection: TConnectionRow): Promise<IProviderTokens | null> {
    const refreshToken = decryptSecret(ENV.connectionEncryptionKey, connection.refreshTokenEnc);
    switch (connection.provider) {
      case EProvider.GOOGLE:
        return providers.google.refreshAccessToken(refreshToken);
      case EProvider.JIRA:
        return PullService.saveRotatedToken(
          connection.id,
          providers.jira.refreshAccessToken(refreshToken),
        );
      case EProvider.LINEAR:
        return PullService.saveRotatedToken(
          connection.id,
          providers.linear.refreshAccessToken(refreshToken),
        );
      default:
        throw new Error(EPullMessages.PROVIDER_UNSUPPORTED, { cause: connection.provider });
    }
  }

  private static async saveRotatedToken(
    connectionId: string,
    refreshing: Promise<IProviderTokens | null>,
  ): Promise<IProviderTokens | null> {
    const tokens = await refreshing;
    if (!tokens?.refreshToken) {
      return tokens;
    }
    await PullRepository.saveRefreshToken(
      connectionId,
      encryptSecret(ENV.connectionEncryptionKey, tokens.refreshToken),
      dayjs().toISOString(),
    );
    return tokens;
  }

  private static async cacheToken(
    connectionId: string,
    accessToken: string,
    expiresInSeconds: number | undefined,
  ): Promise<void> {
    try {
      await CacheService.put({
        key: connectionTokenKey(connectionId),
        value: accessToken,
        ttlSeconds: accessTokenTtlSeconds(expiresInSeconds),
      });
    } catch (error) {
      logError(EPullMessages.TOKEN_CACHE_FAILED, error);
    }
  }

  private static async dropCachedToken(connectionId: string): Promise<void> {
    try {
      await CacheService.delete([connectionTokenKey(connectionId)]);
    } catch (error) {
      logError(EPullMessages.TOKEN_CACHE_FAILED, error);
    }
  }
}
