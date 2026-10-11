export const SETTINGS_TITLE = "Settings";
export const SETTINGS_DESCRIPTION =
  "Work identities anchor your professional accounts. Connections under each identity let Recap pull your work.";
export const SETTINGS_LOADING = "Loading work identities.";
export const SETTINGS_LOAD_FAILED = "Work identities could not be loaded. Try again.";
export const SETTINGS_EMPTY =
  "No work identities yet. Add your work Google account to get started.";
export const SETTINGS_CONNECTED_PREFIX = "Connected";
export const SETTINGS_UNKNOWN_ERROR = "Something went wrong. Start again.";
export const SETTINGS_CONNECT_ERROR_MESSAGES: Record<string, string> = {
  expired: "That consent link expired. Start again to get a fresh one.",
  already_connected: "That Google account is already a Work Identity.",
  sub_mismatch:
    "That Google account does not match this Work Identity. Consent with the matching account.",
  failed: "Google consent did not complete. Try again.",
  unsupported: "That consent link is for a flow this page does not handle yet.",
};
