import type { TIdentity } from "@/api/identity/identity.types";
import { SETUP_PERCENT } from "@/features/dashboard/components/SetupChecklist/SetupChecklist.constants";
import type { ISetupStep } from "@/features/dashboard/components/SetupChecklist/SetupChecklist.interfaces";
import { ESetupStep } from "@/features/dashboard/dashboard.enums";

export function buildSetupSteps(identities: TIdentity[]): ISetupStep[] {
  const hasIdentity = identities.length > 0;
  const hasConnection = identities.some((identity) => identity.connections.length > 0);
  return [
    { step: ESetupStep.ACCOUNT, done: true, available: true },
    { step: ESetupStep.IDENTITY, done: hasIdentity, available: true },
    { step: ESetupStep.CONNECTION, done: hasConnection, available: hasIdentity },
  ];
}

export function completedPercent(steps: ISetupStep[]): number {
  if (steps.length === 0) {
    return 0;
  }
  const done = steps.filter((step) => step.done).length;
  return Math.round((done / steps.length) * SETUP_PERCENT);
}
