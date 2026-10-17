import type { calendar_v3 } from "@googleapis/calendar";
import type { gmail_v1 } from "@googleapis/gmail";

export type TGoogleCalendarEvent = calendar_v3.Schema$Event;

export type TGoogleCalendarRange = Pick<
  calendar_v3.Params$Resource$Events$List,
  "syncToken" | "timeMin" | "timeMax"
>;

export type TGoogleGmailMessage = gmail_v1.Schema$Message;

export type TGoogleGmailHistory = gmail_v1.Schema$History;
