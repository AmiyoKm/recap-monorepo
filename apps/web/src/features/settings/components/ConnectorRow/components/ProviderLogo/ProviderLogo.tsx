import { PROVIDER_MARKS } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/ProviderLogo.constants";
import type { IProviderLogoProps } from "@/features/settings/components/ConnectorRow/components/ProviderLogo/ProviderLogo.interfaces";

export function ProviderLogo({ provider }: IProviderLogoProps) {
  const Mark = PROVIDER_MARKS[provider];

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card">
      <Mark />
    </span>
  );
}
