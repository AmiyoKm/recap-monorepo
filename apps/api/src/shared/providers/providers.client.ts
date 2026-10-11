import { GoogleService } from "#api/shared/providers/google/google.service";
import { JiraService } from "#api/shared/providers/jira/jira.service";
import { LinearService } from "#api/shared/providers/linear/linear.service";

export const providers = {
  google: GoogleService,
  jira: JiraService,
  linear: LinearService,
} as const;
