import { createCloudClient } from "jira.js";

import { JIRA_REQUEST_TIMEOUT_MS } from "#api/shared/providers/jira/jira.constants";
import {
  isRejectedJiraCredential,
  normalizeJiraSite,
  toJiraAccount,
} from "#api/shared/providers/jira/jira.helpers";
import type { IJiraCredentials } from "#api/shared/providers/jira/jira.interfaces";
import type { IProviderAccount } from "#api/shared/providers/providers.interfaces";
import { ROUTES } from "#api/shared/routes/routes.constants";

export abstract class JiraService {
  static async verifyApiKey(credentials: IJiraCredentials): Promise<IProviderAccount | null> {
    const site = normalizeJiraSite(credentials.site);
    if (!site) {
      return null;
    }
    const jira = createCloudClient({
      host: ROUTES.JIRA.SITE(site),
      auth: { type: "basic", email: credentials.email, apiToken: credentials.apiToken },
    });
    try {
      const user = await jira.myself.getCurrentUser(
        {},
        { signal: AbortSignal.timeout(JIRA_REQUEST_TIMEOUT_MS) },
      );
      return toJiraAccount(user.accountId, user.emailAddress);
    } catch (error) {
      if (isRejectedJiraCredential(error)) {
        return null;
      }
      throw error;
    }
  }
}
