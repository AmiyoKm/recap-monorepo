import type { ISetupStep } from "@/features/dashboard/components/SetupChecklist/SetupChecklist.interfaces";

export interface ISetupStepItemProps {
  item: ISetupStep;
  position: number;
}
