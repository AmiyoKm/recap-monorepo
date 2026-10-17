import { EConnectionStatus, EProvider } from "@/api/identity/identity.enums";
import type { TConnectorProvider, TIdentityConnection } from "@/api/identity/identity.types";
import {
  CONNECTOR_CONNECT,
  CONNECTOR_CONNECTED,
  CONNECTOR_EXPIRED,
  CONNECTOR_NOT_CONNECTED,
  CONNECTOR_RECONNECT,
} from "@/features/settings/components/ConnectorRow/ConnectorRow.constants";
import { EConnectorState } from "@/features/settings/components/ConnectorRow/ConnectorRow.enums";

export function connectorState(connection: TIdentityConnection | undefined): EConnectorState {
  if (!connection) {
    return EConnectorState.NOT_CONNECTED;
  }
  if (connection.status === EConnectionStatus.ACTIVE) {
    return EConnectorState.ACTIVE;
  }
  return EConnectorState.NEEDS_RECONNECT;
}

export function connectorDetail(
  state: EConnectorState,
  accountEmail: string | null | undefined,
): string {
  switch (state) {
    case EConnectorState.NOT_CONNECTED:
      return CONNECTOR_NOT_CONNECTED;
    case EConnectorState.ACTIVE:
      return accountEmail ?? CONNECTOR_CONNECTED;
    case EConnectorState.NEEDS_RECONNECT:
      return CONNECTOR_EXPIRED;
  }
}

export function connectorConnectLabel(state: EConnectorState): string {
  if (state === EConnectorState.NOT_CONNECTED) {
    return CONNECTOR_CONNECT;
  }
  return CONNECTOR_RECONNECT;
}

export function canStartConsent(provider: TConnectorProvider, state: EConnectorState): boolean {
  if (provider === EProvider.GOOGLE) {
    return true;
  }
  return state !== EConnectorState.ACTIVE;
}
