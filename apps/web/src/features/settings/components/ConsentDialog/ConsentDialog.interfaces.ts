import type { ReactNode } from "react";

export interface IConsentDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  isPending: boolean;
  isError: boolean;
  authorizeUrl: string | undefined;
  pendingText: string;
  failedText: string;
  copyText: string;
  copiedText: string;
  openText: string;
  doneText: string;
  onDialogOpen: () => void;
}

export interface IConsentCompletionOptions {
  isWaiting: boolean;
  doneText: string;
  onDone: () => void;
}
