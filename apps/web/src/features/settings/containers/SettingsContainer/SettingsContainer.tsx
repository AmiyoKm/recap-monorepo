import { useIdentitiesQuery } from "@/api/identity/identity.queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddIdentityDialog } from "@/features/settings/components/AddIdentityDialog";
import { IdentityCard } from "@/features/settings/components/IdentityCard";
import {
  SETTINGS_CONNECT_ERROR_MESSAGES,
  SETTINGS_CONNECTED_PREFIX,
  SETTINGS_DESCRIPTION,
  SETTINGS_EMPTY,
  SETTINGS_LOAD_FAILED,
  SETTINGS_LOADING,
  SETTINGS_TITLE,
  SETTINGS_UNKNOWN_ERROR,
} from "@/features/settings/containers/SettingsContainer/SettingsContainer.constants";
import type { ISettingsContainerProps } from "@/features/settings/containers/SettingsContainer/SettingsContainer.interfaces";

export function SettingsContainer({
  connectedProvider,
  connectedEmail,
  connectError,
}: ISettingsContainerProps) {
  const identities = useIdentitiesQuery();
  const errorMessage = connectError
    ? (SETTINGS_CONNECT_ERROR_MESSAGES[connectError] ?? SETTINGS_UNKNOWN_ERROR)
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl">{SETTINGS_TITLE}</h1>
          <p className="text-sm text-muted-foreground">{SETTINGS_DESCRIPTION}</p>
        </div>
        <AddIdentityDialog />
      </div>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>{errorMessage}</AlertTitle>
        </Alert>
      ) : null}
      {!errorMessage && connectedProvider ? (
        <Alert>
          <AlertTitle>
            {SETTINGS_CONNECTED_PREFIX} {connectedProvider}
          </AlertTitle>
          {connectedEmail ? <AlertDescription>{connectedEmail}</AlertDescription> : null}
        </Alert>
      ) : null}
      {identities.isPending ? (
        <p className="text-sm text-muted-foreground">{SETTINGS_LOADING}</p>
      ) : null}
      {identities.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{SETTINGS_LOAD_FAILED}</AlertTitle>
        </Alert>
      ) : null}
      {identities.data && identities.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{SETTINGS_EMPTY}</p>
      ) : null}
      {identities.data?.map((identity) => (
        <IdentityCard key={identity.id} identity={identity} />
      ))}
    </main>
  );
}
