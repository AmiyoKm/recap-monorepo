import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { createApp } from "#api/app";
import { DIGEST_WORKFLOW_STEP_CONFIG } from "#api/modules/digest/digest.constants";
import { EDigestStep } from "#api/modules/digest/digest.enums";
import { DigestService } from "#api/modules/digest/digest.service";
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
      await step.do(EDigestStep.PREPARE_DIGEST, DIGEST_WORKFLOW_STEP_CONFIG, () =>
        DigestService.prepareDigest(userId, digestId),
      );
      await step.do(EDigestStep.WRITE_DIGEST, DIGEST_WORKFLOW_STEP_CONFIG, () =>
        DigestService.writeDigest(digestId),
      );
      await step.do(EDigestStep.EMBED_DIGEST, DIGEST_WORKFLOW_STEP_CONFIG, () =>
        DigestService.embedDigest(digestId),
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
