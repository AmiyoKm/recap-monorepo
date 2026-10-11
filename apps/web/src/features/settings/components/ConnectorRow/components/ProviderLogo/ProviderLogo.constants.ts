import type { ComponentType } from "react";

import { EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider } from "@/api/identity/identity.types";
import { GoogleCalendarMark } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/components/GoogleCalendarMark";
import { JiraMark } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/components/JiraMark";
import { LinearMark } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/components/LinearMark";

export const PROVIDER_MARKS: Record<TConnectorProvider, ComponentType> = {
  [EProvider.GOOGLE_CALENDAR]: GoogleCalendarMark,
  [EProvider.JIRA]: JiraMark,
  [EProvider.LINEAR]: LinearMark,
};
