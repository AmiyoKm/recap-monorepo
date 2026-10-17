import { status } from "elysia";

import { ESource } from "#api/modules/activity/activity.enums";
import { ActivityRepository } from "#api/modules/activity/activity.repository";
import {
  DEFAULT_DIGEST_TIME_ZONE,
  DIGEST_ACTIVITY_LIMIT,
  DIGEST_EMBEDDING_DIMENSIONS,
  DIGEST_EMBEDDING_MODEL,
  DIGEST_ERROR_MAX_LENGTH,
  DIGEST_FINAL_PULL_MAX_STEPS,
  DIGEST_FINAL_PULL_PAGES_PER_STEP,
  DIGEST_LIST_MAX,
  DIGEST_MEETING_LIMIT,
  DIGEST_MODEL,
  DIGEST_SYSTEM_PROMPT,
  DIGEST_WORKFLOW_BATCH_MAX,
} from "#api/modules/digest/digest.constants";
import { EDigestMessages } from "#api/modules/digest/digest.enums";
import {
  buildDigestPrompt,
  buildNothingNewContent,
  buildSectionEmbeddingText,
  capWindowRows,
  defaultWindowStart,
  digestVectorId,
  hasSectionItems,
  isDigestDue,
  isSupportedTimeZone,
  localDigestDate,
  missingSourceStepName,
  nextDigestRunAt,
  parseDigestContent,
  pullStepName,
  requireDigest,
  startOfNextLocalDay,
  toDigestContent,
  toDigestStart,
  toDigestView,
  toMissingSource,
} from "#api/modules/digest/digest.helpers";
import type {
  IDigestLaunchFailure,
  IDigestStepRunner,
} from "#api/modules/digest/digest.interfaces";
import { digestAiOutputSchema } from "#api/modules/digest/digest.model";
import { DigestRepository } from "#api/modules/digest/digest.repository";
import type {
  TDigestContent,
  TDigestInProgressError,
  TDigestListResponse,
  TDigestMissingSource,
  TDigestNotFoundError,
  TDigestResponse,
  TDigestRow,
  TDigestSection,
  TDigestSettingsBody,
  TDigestSettingsResponse,
  TDigestTimeZoneError,
} from "#api/modules/digest/digest.types";
import { EConnectionStatus } from "#api/modules/identity/identity.enums";
import { EPullOutcome } from "#api/modules/pull/pull.enums";
import { isPullableProvider } from "#api/modules/pull/pull.helpers";
import type { IPullTarget } from "#api/modules/pull/pull.interfaces";
import { PullRepository } from "#api/modules/pull/pull.repository";
import { PullService } from "#api/modules/pull/pull.service";
import { AiService } from "#api/shared/ai/ai.service";
import { chunk } from "#api/shared/array/array.helpers";
import { bindings } from "#api/shared/bindings/bindings.client";
import type { IDigestWorkflowParams } from "#api/shared/bindings/bindings.interfaces";
import { dayjs } from "#api/shared/date/date.helpers";
import { describeError, logError } from "#api/shared/logger/logger.helpers";

async function pullOnePage(target: IPullTarget): Promise<EPullOutcome> {
  if (!isPullableProvider(target.connection.provider)) {
    return EPullOutcome.COMPLETE;
  }
  if (target.connection.status !== EConnectionStatus.ACTIVE) {
    return EPullOutcome.REJECTED;
  }
  try {
    return await PullService.pullConnectionUpTo(
      target.connection.id,
      DIGEST_FINAL_PULL_PAGES_PER_STEP,
    );
  } catch (error) {
    logError(EDigestMessages.FINAL_PULL_FAILED, error);
    return EPullOutcome.REJECTED;
  }
}

async function timeZoneOf(userId: string): Promise<string> {
  const setting = await DigestRepository.findSetting(userId);
  return setting?.timeZone ?? DEFAULT_DIGEST_TIME_ZONE;
}

function requireEmbedding(embedding: number[] | undefined, digestId: string): number[] {
  if (!embedding) {
    throw new Error(EDigestMessages.EMBEDDING_MISSING, { cause: digestId });
  }
  return embedding;
}

export abstract class DigestService {
  static async getSettings(userId: string): Promise<TDigestSettingsResponse> {
    const timeZone = await timeZoneOf(userId);
    return { timeZone, nextRunAt: nextDigestRunAt(dayjs().toISOString(), timeZone) };
  }

  static async updateSettings(
    userId: string,
    body: TDigestSettingsBody,
  ): Promise<TDigestSettingsResponse> {
    if (!isSupportedTimeZone(body.timeZone)) {
      throw status("Bad Request", {
        message: EDigestMessages.TIME_ZONE_INVALID,
      } satisfies TDigestTimeZoneError);
    }
    await DigestRepository.upsertSetting(userId, body.timeZone);
    return {
      timeZone: body.timeZone,
      nextRunAt: nextDigestRunAt(dayjs().toISOString(), body.timeZone),
    };
  }

  static async listDigests(userId: string): Promise<TDigestListResponse> {
    const timeZone = await timeZoneOf(userId);
    const dates = await DigestRepository.listDates(userId, DIGEST_LIST_MAX);
    return { today: localDigestDate(dayjs().toISOString(), timeZone), dates };
  }

  static async getDigest(userId: string, date: string): Promise<TDigestResponse> {
    const row = await DigestRepository.findByDate(userId, date);
    if (!row) {
      throw status("Not Found", {
        message: EDigestMessages.DIGEST_NOT_FOUND,
      } satisfies TDigestNotFoundError);
    }
    return toDigestView(row);
  }

  static async regenerate(userId: string): Promise<TDigestResponse> {
    const digestId = await DigestService.startDigest(userId, dayjs().toISOString());
    if (!digestId) {
      throw status("Conflict", {
        message: EDigestMessages.DIGEST_IN_PROGRESS,
      } satisfies TDigestInProgressError);
    }
    await DigestService.startWorkflow({ userId, digestId });
    const row = await DigestRepository.findById(digestId);
    return toDigestView(requireDigest(row, digestId));
  }

  static async startDueDigests(now: string = dayjs().toISOString()): Promise<void> {
    const candidates = await DigestRepository.listCandidates();
    const atRunHour = candidates.filter((candidate) =>
      isDigestDue({ now, timeZone: candidate.timeZone, existingDates: [] }),
    );
    const past = await DigestRepository.listPastDigests(
      atRunHour.map((candidate) => candidate.userId),
    );
    const starts = atRunHour
      .map((candidate) => toDigestStart(candidate, now, past))
      .filter((start) => start !== null);
    const started = await DigestRepository.startMany(starts);
    await DigestService.launchWorkflows(
      started.map((row) => ({ userId: row.userId, digestId: row.id })),
    );
  }

  static async startDigest(userId: string, now: string): Promise<string | null> {
    const timeZone = await timeZoneOf(userId);
    const digestDate = localDigestDate(now, timeZone);
    const previousEnd = await DigestRepository.findPreviousWindowEnd(userId, digestDate);
    return await DigestRepository.start({
      userId,
      digestDate,
      windowStart: previousEnd ?? defaultWindowStart(now, timeZone),
      windowEnd: now,
    });
  }

  static async preparePull(userId: string, digestId: string): Promise<string[]> {
    await DigestRepository.markRunning(digestId);
    const targets = await PullRepository.listUserTargets(userId);
    return targets.map((target) => target.connection.id);
  }

  static async pullForDigest(
    connectionId: string,
    runner: IDigestStepRunner,
  ): Promise<TDigestMissingSource | null> {
    let outcome = EPullOutcome.MORE_PAGES;
    for (let index = 0; index < DIGEST_FINAL_PULL_MAX_STEPS; index++) {
      if (outcome !== EPullOutcome.MORE_PAGES) {
        break;
      }
      outcome = await runner.pullOutcome(pullStepName(connectionId, index), () =>
        DigestService.pullPage(connectionId),
      );
    }
    if (outcome === EPullOutcome.COMPLETE) {
      return null;
    }
    return await runner.missingSource(missingSourceStepName(connectionId), () =>
      DigestService.describeMissingSource(connectionId),
    );
  }

  static async pullPage(connectionId: string): Promise<EPullOutcome> {
    const target = await PullRepository.findPullTarget(connectionId);
    if (!target) {
      return EPullOutcome.COMPLETE;
    }
    return await pullOnePage(target);
  }

  static async describeMissingSource(connectionId: string): Promise<TDigestMissingSource | null> {
    const target = await PullRepository.findPullTarget(connectionId);
    if (!target) {
      return null;
    }
    return toMissingSource(target);
  }

  static async saveMissingSources(
    digestId: string,
    missingSources: TDigestMissingSource[],
  ): Promise<void> {
    await DigestRepository.saveMissingSources(digestId, JSON.stringify(missingSources));
  }

  static async writeDigest(digestId: string): Promise<void> {
    const digest = requireDigest(await DigestRepository.findById(digestId), digestId);
    const timeZone = await timeZoneOf(digest.userId);
    const identities = await DigestRepository.listIdentities(digest.userId);
    const [newestRows, aheadRows] = await Promise.all([
      ActivityRepository.listInWindow({
        userId: digest.userId,
        from: digest.windowStart,
        to: digest.windowEnd,
        sources: undefined,
        limit: DIGEST_ACTIVITY_LIMIT + 1,
        isNewestFirst: true,
      }),
      ActivityRepository.listInWindow({
        userId: digest.userId,
        from: digest.windowEnd,
        to: startOfNextLocalDay(digest.digestDate, timeZone),
        sources: [ESource.CALENDAR],
        limit: DIGEST_MEETING_LIMIT,
        isNewestFirst: false,
      }),
    ]);
    const { windowRows, isTruncated } = capWindowRows(newestRows, DIGEST_ACTIVITY_LIMIT);
    const contentInput = { identities, windowRows, aheadRows, timeZone, isTruncated };
    if (windowRows.length === 0) {
      return DigestService.saveContent(digestId, buildNothingNewContent(contentInput), null);
    }
    const output = await AiService.generateObject({
      model: DIGEST_MODEL,
      system: DIGEST_SYSTEM_PROMPT,
      prompt: buildDigestPrompt({
        identities,
        windowRows,
        aheadRows,
        windowStart: digest.windowStart,
        windowEnd: digest.windowEnd,
        timeZone,
      }),
      schema: digestAiOutputSchema,
    });
    await DigestService.saveContent(digestId, toDigestContent(output, contentInput), DIGEST_MODEL);
  }

  static async embedDigest(digestId: string): Promise<void> {
    const digest = requireDigest(await DigestRepository.findById(digestId), digestId);
    const sections = (parseDigestContent(digest.content)?.sections ?? []).filter(hasSectionItems);
    const upsertedIds = await DigestService.upsertSectionVectors(digest, sections);
    const identities = await DigestRepository.listIdentities(digest.userId);
    const staleIds = identities
      .map((identity) => digestVectorId(digest.userId, digest.digestDate, identity.id))
      .filter((id) => !upsertedIds.includes(id));
    if (staleIds.length > 0) {
      await bindings.DIGEST_VECTORS.deleteByIds(staleIds);
    }
    await DigestRepository.markReady(digestId);
  }

  private static async upsertSectionVectors(
    digest: TDigestRow,
    sections: TDigestSection[],
  ): Promise<string[]> {
    if (sections.length === 0) {
      return [];
    }
    const embeddings = await AiService.embedMany({
      model: DIGEST_EMBEDDING_MODEL,
      values: sections.map((section) => buildSectionEmbeddingText(section, digest.digestDate)),
      dimensions: DIGEST_EMBEDDING_DIMENSIONS,
    });
    const vectors = sections.map((section, index) => ({
      id: digestVectorId(digest.userId, digest.digestDate, section.identityId),
      values: requireEmbedding(embeddings[index], digest.id),
      metadata: {
        userId: digest.userId,
        identityId: section.identityId,
        digestDate: digest.digestDate,
      },
    }));
    await bindings.DIGEST_VECTORS.upsert(vectors);
    return vectors.map((vector) => vector.id);
  }

  static async failDigest(digestId: string, error: unknown): Promise<void> {
    await DigestRepository.saveFailed(
      digestId,
      describeError(error).slice(0, DIGEST_ERROR_MAX_LENGTH),
    );
  }

  private static async saveContent(
    digestId: string,
    content: TDigestContent,
    model: string | null,
  ): Promise<void> {
    await DigestRepository.saveContent({ digestId, content: JSON.stringify(content), model });
  }

  private static async launchWorkflows(params: IDigestWorkflowParams[]): Promise<void> {
    const batches = chunk(params, DIGEST_WORKFLOW_BATCH_MAX);
    const outcomes = await Promise.all(batches.map((batch) => DigestService.launchBatch(batch)));
    const failures = outcomes.filter((outcome) => outcome !== null);
    await Promise.all(
      failures.map((failure) =>
        DigestRepository.saveFailedMany(
          failure.digestIds,
          describeError(failure.error).slice(0, DIGEST_ERROR_MAX_LENGTH),
        ),
      ),
    );
    const [firstFailure] = failures;
    if (firstFailure) {
      throw firstFailure.error;
    }
  }

  private static async launchBatch(
    batch: IDigestWorkflowParams[],
  ): Promise<IDigestLaunchFailure | null> {
    try {
      await bindings.DIGEST_WORKFLOW.createBatch(batch.map((entry) => ({ params: entry })));
      return null;
    } catch (error) {
      return { digestIds: batch.map((entry) => entry.digestId), error };
    }
  }

  private static async startWorkflow(params: IDigestWorkflowParams): Promise<void> {
    try {
      await bindings.DIGEST_WORKFLOW.create({ params });
    } catch (error) {
      await DigestService.failDigest(params.digestId, error);
      throw error;
    }
  }
}
