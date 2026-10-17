import type { calendar_v3 } from "@googleapis/calendar";

export type TGoogleCalendarEvent = calendar_v3.Schema$Event;

export type TGoogleCalendarRange = Pick<
  calendar_v3.Params$Resource$Events$List,
  "syncToken" | "timeMin" | "timeMax"
>;
