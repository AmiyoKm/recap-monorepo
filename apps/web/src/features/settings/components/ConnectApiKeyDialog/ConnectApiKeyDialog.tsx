import type { FormEvent } from "react";
import { useState } from "react";

import { apiErrorMessage } from "@/api/client/client.helpers";
import { useConnectApiKeyMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONNECT_API_KEY_DESCRIPTION,
  CONNECT_API_KEY_FIELD_LABEL,
  CONNECT_API_KEY_LABELS,
  CONNECT_API_KEY_SUBMIT,
  CONNECT_API_KEY_SUBMITTING,
} from "@/features/settings/components/ConnectApiKeyDialog/ConnectApiKeyDialog.constants";
import type { IConnectApiKeyDialogProps } from "@/features/settings/components/ConnectApiKeyDialog/ConnectApiKeyDialog.interfaces";

export function ConnectApiKeyDialog({ identityId, provider }: IConnectApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const connect = useConnectApiKeyMutation();

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setApiKey("");
      connect.reset();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    connect.mutate({ identityId, provider, apiKey }, { onSuccess: () => handleOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {CONNECT_API_KEY_LABELS[provider]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONNECT_API_KEY_LABELS[provider]}</DialogTitle>
          <DialogDescription>{CONNECT_API_KEY_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${provider}-api-key`}>{CONNECT_API_KEY_FIELD_LABEL}</Label>
            <Input
              id={`${provider}-api-key`}
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </div>
          {connect.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(connect.error)}
            </p>
          ) : null}
          <Button type="submit" disabled={apiKey.length === 0 || connect.isPending}>
            {connect.isPending ? CONNECT_API_KEY_SUBMITTING : CONNECT_API_KEY_SUBMIT}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
