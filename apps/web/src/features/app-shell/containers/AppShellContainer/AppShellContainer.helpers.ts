import { toast } from "sonner";

import { connectErrorMessage, connectedTitle } from "@/api/identity/identity.helpers";
import type { IConnectResultMessage } from "@/api/identity/identity.interfaces";

export function showConnectResultToast(message: IConnectResultMessage): void {
  const connected = message.error ? undefined : message.connected;
  if (!connected) {
    toast.error(connectErrorMessage(message.error ?? ""));
    return;
  }
  toast.success(connectedTitle(connected), { description: message.email });
}
