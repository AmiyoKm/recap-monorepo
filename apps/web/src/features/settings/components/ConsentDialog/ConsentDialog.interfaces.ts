import type { ReactNode } from "react";

import type { TConsentTarget } from "@/api/identity/identity.types";

export interface IConsentDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  picker?: ReactNode;
  isPending: boolean;
  isError: boolean;
  authorizeUrl: string | undefined;
  pendingText: string;
  failedText: string;
  copyText: string;
  copiedText: string;
  openText: string;
  doneText: string;
  target: TConsentTarget;
  onDialogOpen: () => void;
}

export interface IConsentCompletionOptions {
  hasAuthorizeUrl: boolean;
  target: TConsentTarget;
  doneText: string;
  onDialogOpen: () => void;
}
