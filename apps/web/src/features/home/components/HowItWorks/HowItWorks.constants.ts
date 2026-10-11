import type { IStep } from "@/features/home/home.interfaces";

export const HOW_IT_WORKS_TITLE = "How it works";
export const HOW_IT_WORKS_STEPS: IStep[] = [
  {
    title: "Create an account",
    body: "Use Google or an email address. Nothing is connected yet.",
  },
  {
    title: "Add your work Google account",
    body: "Recap checks that the account is yours. It asks for your email address only.",
  },
  {
    title: "Connect your tools",
    body: "Add Google Calendar, Jira or Linear to that account. You can remove each one later.",
  },
  {
    title: "Read the summary",
    body: "Each work account gets its own section in the summary.",
  },
];
