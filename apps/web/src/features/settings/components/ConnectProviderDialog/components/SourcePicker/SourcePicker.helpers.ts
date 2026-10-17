import type { EGoogleSource } from "@/api/identity/identity.enums";
import type { TIdentityConnection } from "@/api/identity/identity.types";
import { SOURCE_PICKER_ORDER } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.constants";

export function defaultSources(connection: TIdentityConnection | undefined): EGoogleSource[] {
  const current = connection?.sources ?? [];
  if (current.length === 0) {
    return [...SOURCE_PICKER_ORDER];
  }
  return SOURCE_PICKER_ORDER.filter((source) => current.includes(source));
}

export function toggleSource(
  sources: EGoogleSource[],
  source: EGoogleSource,
  isChecked: boolean,
): EGoogleSource[] {
  const remaining = sources.filter((entry) => entry !== source);
  if (!isChecked) {
    return remaining;
  }
  return SOURCE_PICKER_ORDER.filter((entry) => entry === source || remaining.includes(entry));
}
