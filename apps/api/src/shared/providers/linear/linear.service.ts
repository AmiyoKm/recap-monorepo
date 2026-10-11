import { LinearClient } from "@linear/sdk";

import { LINEAR_REQUEST_TIMEOUT_MS } from "#api/shared/providers/linear/linear.constants";
import { isRejectedLinearCredential } from "#api/shared/providers/linear/linear.helpers";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";

export abstract class LinearService {
  static async verifyApiKey(apiKey: string): Promise<IProviderAccount | null> {
    const linear = new LinearClient({
      apiKey,
      signal: AbortSignal.timeout(LINEAR_REQUEST_TIMEOUT_MS),
    });
    try {
      const viewer = await linear.viewer;
      return { accountId: viewer.id, accountEmail: viewer.email };
    } catch (error) {
      if (isRejectedLinearCredential(error)) {
        return null;
      }
      throw error;
    }
  }
}
