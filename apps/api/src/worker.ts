import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { createApp } from "#api/app";
import { DIGEST_WORKFLOW_STEP_CONFIG } from "#api/modules/digest/digest.constants";
import { EDigestStep } from "#api/modules/digest/digest.enums";
import { pullStepName } from "#api/modules/digest/digest.helpers";
import { DigestService } from "#api/modules/digest/digest.service";
import type { TDigestMissingSource } from "#api/modules/digest/digest.types";
import { IdentityService } from "#api/modules/identity/identity.service";
import { PullService } from "#api/modules/pull/pull.service";
import type { IDigestWorkflowParams } from "#api/shared/bindings/bindings.interfaces";

const app = new Elysia({ adapter: CloudflareAdapter }).use(createApp()).compile();

export class DigestWorkflow extends WorkflowEntrypoint<Cloudflare.Env, IDigestWorkflowParams> {
  override async run(
    event: WorkflowEvent<IDigestWorkflowParams>,
    step: WorkflowStep,
  ): Promise<void> {
    const { userId, digestId } = event.payload;
    try {
      const connectionIds = await step.do(
        EDigestStep.PREPARE_PULL,
        DIGEST_WORKFLOW_STEP_CONFIG,
        () => DigestService.preparePull(userId, digestId),
      );
      const missingSources: TDigestMissingSource[] = [];
      for (const connectionId of connectionIds) {
        const missing = await step.do(pullStepName(connectionId), DIGEST_WORKFLOW_STEP_CONFIG, () =>
          DigestService.pullForDigest(connectionId),
        );
        if (missing) {
          missingSources.push(missing);
        }
      }
      await step.do(EDigestStep.SAVE_MISSING_SOURCES, DIGEST_WORKFLOW_STEP_CONFIG, () =>
        DigestService.saveMissingSources(digestId, missingSources),
      );
      await step.do(EDigestStep.WRITE_DIGEST, DIGEST_WORKFLOW_STEP_CONFIG, () =>
        DigestService.writeDigest(digestId),
      );
    } catch (error) {
      await step.do(EDigestStep.FAIL_DIGEST, () => DigestService.failDigest(digestId, error));
      throw error;
    }
  }
}

export default {
  fetch: (request) => app.fetch(request),
  scheduled: (_controller, _env, ctx) => {
    ctx.waitUntil(IdentityService.deleteExpiredPendingGrants());
    ctx.waitUntil(PullService.enqueueActiveConnections());
    ctx.waitUntil(DigestService.startDueDigests());
  },
  queue: async (batch) => {
    await Promise.all(batch.messages.map((message) => PullService.handleMessage(message)));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
