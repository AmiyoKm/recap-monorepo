import type { EGmailLabel, EGoogleSource } from "#api/shared/providers/google/google.enums";
import type {
  TGoogleCalendarEvent,
  TGoogleChatMessage,
  TGoogleGmailMessage,
} from "#api/shared/providers/google/google.types";
import type { IProviderTokens } from "#api/shared/providers/providers.interfaces";

export interface IGoogleProfile {
  sub: string;
  email: string;
  name: string | undefined;
  picture: string | undefined;
}

export interface IGoogleAuthorizeInput {
  state: string;
  redirectUri: string;
  scopes: string[];
}

export interface IGoogleAuthorization {
  authorizeUrl: string;
  codeVerifier: string;
}

export interface IGoogleCodeExchangeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface IGoogleGrant {
  tokens: IProviderTokens;
  profile: IGoogleProfile;
}

export interface ISourceGrantResult {
  requested: EGoogleSource[];
  granted: EGoogleSource[];
}

export interface IGoogleCalendarReadInput {
  accessToken: string;
  syncToken: string | null;
  pageToken: string | null;
  timeMin: string;
  timeMax: string;
}

export interface IGoogleCalendarPage {
  events: TGoogleCalendarEvent[];
  nextPageToken: string | null;
  nextSyncToken: string | null;
  usedSyncToken: boolean;
  timeZone: string | null;
}

export interface IGoogleGmailListInput {
  accessToken: string;
  label: EGmailLabel;
  pageToken: string | null;
}

export interface IGoogleGmailHistoryInput {
  accessToken: string;
  startHistoryId: string;
  pageToken: string | null;
}

export interface IGoogleGmailPage {
  messages: TGoogleGmailMessage[];
  nextPageToken: string | null;
  historyId: string | null;
  isHistoryExpired: boolean;
}

export interface IGoogleChatSpace {
  id: string;
  isDirectMessage: boolean;
}

export interface IGoogleChatSpacesInput {
  accessToken: string;
  pageToken: string | null;
}

export interface IGoogleChatSpacesPage {
  spaces: IGoogleChatSpace[];
  nextPageToken: string | null;
}

export interface IGoogleChatMessagesInput {
  accessToken: string;
  spaceId: string;
  since: string;
  pageToken: string | null;
}

export interface IGoogleChatMessagesPage {
  messages: TGoogleChatMessage[];
  nextPageToken: string | null;
}
