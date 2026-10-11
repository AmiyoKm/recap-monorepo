import type { TIdentity } from "@/api/identity/identity.types";
import type { ESetupStep } from "@/features/dashboard/dashboard.enums";

export interface ISetupChecklistProps {
  identities: TIdentity[] | undefined;
  isPending: boolean;
}

export interface ISetupStep {
  step: ESetupStep;
  done: boolean;
  available: boolean;
}
