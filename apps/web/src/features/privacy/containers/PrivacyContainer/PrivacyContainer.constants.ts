import type { IPrivacySection } from "@/features/privacy/privacy.interfaces";

export const PRIVACY_TITLE = "Privacy policy";
export const PRIVACY_DESCRIPTION =
  "This policy tells you what data Recap stores, why Recap stores it and how you delete it.";
export const PRIVACY_EFFECTIVE_DATE = "Effective date: October 17, 2026";
export const PRIVACY_CONTACT_EMAIL = "amiyo@lunedata.io";
export const PRIVACY_CONTACT_LABEL = "Privacy contact";
export const PRIVACY_CONTACT_BODY = "Send questions about your data or this policy to";
export const PRIVACY_SECTIONS: IPrivacySection[] = [
  {
    title: "What Recap stores",
    body: [
      "Your Google profile when you sign in with Google or add a work account: your Google account ID (sub), email, name and avatar.",
      "Your email, name and a hashed password when you sign up with email.",
      "For each Jira connection: your Atlassian account ID, your email and the Jira site you connect.",
      "For each Linear connection: your Linear account ID and your email.",
      "An OAuth refresh token for each connection. Recap encrypts each token before it stores it and never sends it to your browser.",
      "Session data that keeps you signed in, such as your IP address and browser user agent.",
    ],
  },
  {
    title: "Why Recap stores it",
    body: [
      "Recap uses this data only to build your work recap. It reads your own work from the tools you connect and shows you what you did.",
      "Recap does not use your data for ads.",
    ],
  },
  {
    title: "Who gets your data",
    body: [
      "Recap does not sell your data and does not share it with third parties.",
      "Recap sends requests only to the providers you connect (Google, Atlassian and Linear), and only to read your own work.",
      "Recap runs on Cloudflare, which hosts the database for Recap.",
    ],
  },
  {
    title: "How to delete your data",
    body: [
      "To remove a tool, disconnect its connection in Settings. Recap deletes the stored token and account details for that connection.",
      "To remove a work account, delete its identity in Settings. Recap deletes the identity and all of its connections.",
      "To delete your whole Recap account, email the privacy contact below.",
    ],
  },
  {
    title: "Changes to this policy",
    body: ["When this policy changes, Recap updates the effective date on this page."],
  },
];
