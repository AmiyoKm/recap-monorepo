import type { IProviderGrant } from "#api/shared/providers/providers.interfaces";

export interface ICalendarConnectCodes {
  identityCode: string;
  identitySub: string;
  calendarCode: string;
}

export interface IProviderCallbackCase {
  provider: "jira" | "linear";
  grant: IProviderGrant;
  complete: (code: string, state: string) => Promise<{ status: number; response: Response }>;
  hasPkce: boolean;
}
