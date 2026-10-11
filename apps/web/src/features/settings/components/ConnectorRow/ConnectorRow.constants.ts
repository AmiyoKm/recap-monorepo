import { EConnectorState } from "@/features/settings/components/ConnectorRow/ConnectorRow.enums";

export const CONNECTOR_CONNECT = "Connect";
export const CONNECTOR_RECONNECT = "Reconnect";
export const CONNECTOR_DISCONNECT = "Disconnect";
export const CONNECTOR_DISCONNECTING = "Disconnecting.";
export const CONNECTOR_CONNECTED = "Connected";
export const CONNECTOR_NOT_CONNECTED = "Not connected";
export const CONNECTOR_EXPIRED = "Access expired";
export const CONNECTOR_DOT_CLASSES: Record<EConnectorState, string> = {
  [EConnectorState.NOT_CONNECTED]: "bg-border",
  [EConnectorState.ACTIVE]: "bg-success",
  [EConnectorState.NEEDS_RECONNECT]: "bg-destructive",
};
