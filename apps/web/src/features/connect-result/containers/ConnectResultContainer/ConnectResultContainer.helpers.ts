import { IDENTITY_CONNECT_UNKNOWN_ERROR } from "@/api/identity/identity.constants";
import { connectErrorMessage, connectedTitle } from "@/api/identity/identity.helpers";
import {
  CONNECT_RESULT_ERROR_TITLE,
  CONNECT_RESULT_SUCCESS_DESCRIPTION,
} from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.constants";
import type { TSettingsButtonVariant } from "@/features/connect-result/containers/ConnectResultContainer/ConnectResultContainer.types";

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

export function connectResultTitle(
  connected: string | undefined,
  error: string | undefined,
): string {
  if (!connected || error) {
    return CONNECT_RESULT_ERROR_TITLE;
  }
  return connectedTitle(connected);
}

export function settingsButtonVariant(isSuccess: boolean): TSettingsButtonVariant {
  if (!isSuccess) {
    return "default";
  }
  return "outline";
}
