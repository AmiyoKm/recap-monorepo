import type { IStep } from "@/features/home/home.interfaces";

export const PRINCIPLES_TITLE = "What Recap can see";
export const PRINCIPLES_BODY = "Recap sees only the tools you connect.";
export const PRINCIPLES_ITEMS: IStep[] = [
  {
    title: "Each work account is separate",
    body: "If you work for two companies, their calendars and tickets never mix.",
  },
  {
    title: "Two separate consents",
    body: "Recap gets no data when you add a work account. It gets data only when you connect a tool yourself.",
  },
  {
    title: "Keys stay on the server",
    body: "Tokens and API keys are encrypted and never sent to your browser.",
  },
  {
    title: "Your AI key",
    body: "Summaries use your own Anthropic, OpenAI, Gemini or Ollama key.",
  },
];
