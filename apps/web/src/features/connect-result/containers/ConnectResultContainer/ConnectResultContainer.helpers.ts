import { IDENTITY_CONNECT_UNKNOWN_ERROR } from "@/api/identity/identity.constants";
import { connectErrorMessage } from "@/api/identity/identity.helpers";
import { CONNECT_RESULT_SUCCESS_DESCRIPTION } from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.constants";

export function connectResultDescription(
  connected: string | undefined,
  error: string | undefined,
): string {
  if (error) {
    return connectErrorMessage(error);
  }
  if (!connected) {
    return IDENTITY_CONNECT_UNKNOWN_ERROR;
  }
  return CONNECT_RESULT_SUCCESS_DESCRIPTION;
}
