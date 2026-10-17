import { EConsentTarget } from "@/api/identity/identity.enums";
import { Button } from "@/components/ui/button";
import {
  CONNECT_PROVIDER_COPIED,
  CONNECT_PROVIDER_COPY,
  CONNECT_PROVIDER_DESCRIPTIONS,
  CONNECT_PROVIDER_DONE,
  CONNECT_PROVIDER_FAILED,
  CONNECT_PROVIDER_LOADING,
  CONNECT_PROVIDER_OPEN,
  CONNECT_PROVIDER_TITLES,
} from "@/features/settings/components/ConnectProviderDialog/ConnectProviderDialog.constants";
import { useProviderConsent } from "@/features/settings/components/ConnectProviderDialog/ConnectProviderDialog.hooks";
import type { IConnectProviderDialogProps } from "@/features/settings/components/ConnectProviderDialog/ConnectProviderDialog.interfaces";
import { SourcePicker } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker";
import { ConsentDialog } from "@/features/settings/components/ConsentDialog";

export function ConnectProviderDialog({
  identityId,
  provider,
  connection,
  triggerLabel,
}: IConnectProviderDialogProps) {
  const { connect, sources, setSources, isPicking, startConsent, continueWithSources } =
    useProviderConsent({ identityId, provider, connection });

  return (
    <ConsentDialog
      trigger={
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      }
      title={CONNECT_PROVIDER_TITLES[provider]}
      description={CONNECT_PROVIDER_DESCRIPTIONS[provider]}
      picker={
        isPicking && (
          <SourcePicker
            identityId={identityId}
            sources={sources}
            onSourcesChange={setSources}
            onContinue={continueWithSources}
          />
        )
      }
      isPending={connect.isPending}
      isError={connect.isError}
      authorizeUrl={connect.data?.authorizeUrl}
      pendingText={CONNECT_PROVIDER_LOADING[provider]}
      failedText={CONNECT_PROVIDER_FAILED}
      copyText={CONNECT_PROVIDER_COPY}
      copiedText={CONNECT_PROVIDER_COPIED}
      openText={CONNECT_PROVIDER_OPEN[provider]}
      doneText={CONNECT_PROVIDER_DONE[provider]}
      target={{ kind: EConsentTarget.CONNECTION, identityId, provider }}
      onDialogOpen={startConsent}
    />
  );
}
