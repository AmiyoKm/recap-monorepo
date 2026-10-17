import { ESource } from "#api/modules/activity/activity.enums";
import {
  mapCalendarEvents,
  mapChatMessages,
  mapGmailMessages,
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
  chatSpaceId,
  chatSpacesToRead,
  completedChatCursor,
  gmailMessagesSince,
  isPullableProvider,
  nextCalendarCursor,
  nextGmailBackfillStep,
  nextGmailHistoryStep,
  parseCalendarCursor,
  parseChatCursor,
  parseCursorMap,
  parseGmailCursor,
  readableSources,
  readConnectionId,
  remainingSources,
  restartGmailPage,
  serializeCursorMap,
  startCycle,
} from "#api/modules/pull/pull.helpers";
import type {
  IAccessToken,
  IChatCursor,
  IGmailCursor,
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
import { decryptSecret } from "#api/shared/crypto/crypto.helpers";
import { dayjs } from "#api/shared/date/date.helpers";
import { ENV } from "#api/shared/env/env.constants";
import { describeError, logError } from "#api/shared/logger/logger.helpers";
import { EGmailLabel } from "#api/shared/providers/google/google.enums";
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
    const target = await PullRepository.findPullTarget(connectionId);
    if (!target || target.connection.status !== EConnectionStatus.ACTIVE) {
      return;
    }
    if (!isPullableProvider(target.connection.provider)) {
      return;
    }
    try {
      await PullService.pull(target);
    } catch (error) {
      await PullRepository.saveError(
        connectionId,
        describeError(error).slice(0, PULL_ERROR_MAX_LENGTH),
      );
      throw error;
    }
  }

  private static async pull(target: IPullTarget): Promise<void> {
    const { connection } = target;
    const sources = readableSources(connection);
    const hasSources = sources.length > 0;
    if (!hasSources) {
      await PullRepository.saveComplete(connection.id, dayjs().toISOString());
      return;
    }
    const token = await PullService.resolveAccessToken(connection);
    if (!token) {
      await PullService.markRejected(connection.id);
      return;
    }
    const cursors = parseCursorMap(connection.pullCursor);
    const outcome = await PullService.pullPages({
      target,
      accessToken: token.value,
      now: dayjs().toISOString(),
      cursors,
      queue: startCycle(sources, cursors),
      pagesLeft: PULL_MAX_PAGES_PER_MESSAGE,
    });
    await PullService.finish(connection.id, outcome, token);
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
        await bindings.PULL_QUEUE.send({ connectionId } satisfies IPullMessage);
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
      case ESource.GMAIL:
        return PullService.readGmailPage(input);
      case ESource.CHAT:
        return PullService.readChatPage(input);
      case ESource.DRIVE:
      case ESource.JIRA:
      case ESource.LINEAR:
        throw new Error(EPullMessages.SOURCE_UNSUPPORTED, { cause: source });
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
    const spaces = await providers.google.listChatSpaces(input.accessToken);
    if (!spaces) {
      return null;
    }
    const pending = chatSpacesToRead(spaces, cursor);
    const slice = pending.slice(0, CHAT_SPACES_PER_PAGE);
    const batch: IActivityBatch = { drafts: [], removedExternalIds: [] };
    for (const space of slice) {
      const page = await providers.google.listChatMessages({
        accessToken: input.accessToken,
        spaceId: space.id,
        since: cursor.since,
        pageToken: PullService.chatPageToken(cursor, space.id),
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
      const next = { ...cursor, afterSpace: lastRead.id, resumeSpace: null, pageToken: null };
      return { batch, nextCursor: JSON.stringify(next), hasMore: true };
    }
    return { batch, nextCursor: JSON.stringify(completedChatCursor(cursor)), hasMore: false };
  }

  private static chatPageToken(cursor: IChatCursor, spaceId: string): string | null {
    if (cursor.resumeSpace !== spaceId) {
      return null;
    }
    return cursor.pageToken;
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
    if (connection.provider !== EProvider.GOOGLE) {
      throw new Error(EPullMessages.PROVIDER_UNSUPPORTED, { cause: connection.provider });
    }
    const refreshToken = decryptSecret(ENV.connectionEncryptionKey, connection.refreshTokenEnc);
    return providers.google.refreshAccessToken(refreshToken);
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
