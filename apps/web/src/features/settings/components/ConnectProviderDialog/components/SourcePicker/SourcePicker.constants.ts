import { EGoogleSource } from "@/api/identity/identity.enums";

export const SOURCE_PICKER_ORDER = Object.values(EGoogleSource);
export const SOURCE_PICKER_LABEL = "Google sources for Recap";
export const SOURCE_PICKER_CONTINUE = "Continue to Google";
export const SOURCE_PICKER_DESCRIPTIONS: Record<EGoogleSource, string> = {
  [EGoogleSource.CALENDAR]: "Recap reads your events and meetings.",
  [EGoogleSource.GMAIL]:
    "Recap reads the subject, recipients and date of each email, not the message text.",
  [EGoogleSource.DRIVE]: "Recap reads file activity such as edits and comments, not file content.",
  [EGoogleSource.CHAT]: "Recap reads your spaces and the messages in them.",
};
