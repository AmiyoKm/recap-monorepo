import type { EGoogleSource } from "@/api/identity/identity.enums";

export interface ISourcePickerProps {
  identityId: string;
  sources: EGoogleSource[];
  onSourcesChange: (sources: EGoogleSource[]) => void;
  onContinue: () => void;
}
