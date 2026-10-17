import { EProvider } from "@/api/identity/identity.enums";
import type { IExampleIdentity } from "@/features/home/home.interfaces";

export const MECHANISM_LABEL = "Example: two work accounts and the summary Recap writes from them";
export const MECHANISM_EXAMPLE = "Example";
export const MECHANISM_ACCOUNTS_TITLE = "Work accounts";
export const MECHANISM_IDENTITIES: IExampleIdentity[] = [
  {
    email: "maya@northwind.example",
    role: "Northwind",
    sources: [EProvider.GOOGLE, EProvider.JIRA],
    summary: [
      "Closed 6 Jira issues on the billing export.",
      "9 meetings. Wednesday was mostly the export review.",
    ],
  },
  {
    email: "maya@fernstudio.example",
    role: "Fern Studio",
    sources: [EProvider.GOOGLE, EProvider.LINEAR],
    summary: ["Finished 4 Linear issues.", "3 client calls."],
  },
];
export const MECHANISM_RECAP_TITLE = "This week";
export const MECHANISM_RECAP_RANGE = "Mon 5 to Fri 9 October";
