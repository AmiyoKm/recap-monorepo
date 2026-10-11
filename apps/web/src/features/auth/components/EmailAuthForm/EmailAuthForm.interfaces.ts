import type { EAuthMode } from "@/features/auth/auth.enums";

export interface IEmailAuthFormProps {
  mode: EAuthMode;
  onModeChange: (mode: EAuthMode) => void;
}
