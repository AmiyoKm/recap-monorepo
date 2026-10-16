import { toast } from "sonner";

import { connectErrorMessage, connectedTitle } from "@/api/identity/identity.helpers";
import type { IConnectResultMessage } from "@/api/identity/identity.interfaces";

function successfulConnection(message: IConnectResultMessage): string | undefined {
  if (message.error) {
    return undefined;
  }
  return message.connected;
}

export function showConnectResultToast(message: IConnectResultMessage): void {
  const connected = successfulConnection(message);
  if (!connected) {
    toast.error(connectErrorMessage(message.error ?? ""));
    return;
  }
  toast.success(connectedTitle(connected), { description: message.email });
}
