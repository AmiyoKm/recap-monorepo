import type { EProvider } from "@/api/identity/identity.enums";
import type { ESourceAvailability } from "@/features/home/home.enums";

export interface IExampleIdentity {
  email: string;
  role: string;
  sources: EProvider[];
  summary: string[];
}

export interface ISourceRow {
  provider: EProvider;
  detail: string | null;
  method: string;
  availability: ESourceAvailability;
}

export interface IStep {
  title: string;
  body: string;
}
