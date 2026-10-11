import { EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider } from "@/api/identity/identity.types";

export const IDENTITY_CONNECTORS: TConnectorProvider[] = [
  EProvider.GOOGLE_CALENDAR,
  EProvider.JIRA,
  EProvider.LINEAR,
];
export const IDENTITY_TOOLS_LABEL = "Tools for this work account";
