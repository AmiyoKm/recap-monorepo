import type { ComponentType } from "react";

import { EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider } from "@/api/identity/identity.types";
import { GoogleMark } from "@/features/auth/components/GoogleSignInButton/components/GoogleMark";
import { JiraMark } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/components/JiraMark";
import { LinearMark } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/components/LinearMark";

export const PROVIDER_MARKS: Record<TConnectorProvider, ComponentType> = {
  [EProvider.GOOGLE]: GoogleMark,
  [EProvider.JIRA]: JiraMark,
  [EProvider.LINEAR]: LinearMark,
};
