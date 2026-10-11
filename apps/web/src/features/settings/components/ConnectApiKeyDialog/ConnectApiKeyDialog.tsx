import type { FormEvent } from "react";
import { useState } from "react";

import { apiErrorMessage } from "@/api/client/client.helpers";
import { EProvider } from "@/api/identity/identity.enums";
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
  CONNECT_API_KEY_EMAIL_LABEL,
  CONNECT_API_KEY_FIELD_LABEL,
  CONNECT_API_KEY_JIRA_DESCRIPTION,
  CONNECT_API_KEY_LABELS,
  CONNECT_API_KEY_SITE_LABEL,
  CONNECT_API_KEY_SITE_PLACEHOLDER,
  CONNECT_API_KEY_SUBMIT,
  CONNECT_API_KEY_SUBMITTING,
} from "@/features/settings/components/ConnectApiKeyDialog/ConnectApiKeyDialog.constants";
import type { IConnectApiKeyDialogProps } from "@/features/settings/components/ConnectApiKeyDialog/ConnectApiKeyDialog.interfaces";

export function ConnectApiKeyDialog({
  identityId,
  provider,
  triggerLabel,
}: IConnectApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const connect = useConnectApiKeyMutation();
  const isJira = provider === EProvider.JIRA;

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setApiKey("");
      setEmail("");
      setSite("");
      connect.reset();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    connect.mutate(
      {
        identityId,
        provider,
        apiKey,
        email: isJira ? email : undefined,
        site: isJira ? site : undefined,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  const canSubmit =
    apiKey.length > 0 && (!isJira || (email.length > 0 && site.length > 0)) && !connect.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{CONNECT_API_KEY_LABELS[provider]}</DialogTitle>
          <DialogDescription>
            {isJira ? CONNECT_API_KEY_JIRA_DESCRIPTION : CONNECT_API_KEY_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {isJira ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${provider}-email`}>{CONNECT_API_KEY_EMAIL_LABEL}</Label>
              <Input
                id={`${provider}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          ) : null}
          {isJira ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${provider}-site`}>{CONNECT_API_KEY_SITE_LABEL}</Label>
              <Input
                id={`${provider}-site`}
                type="text"
                autoComplete="url"
                placeholder={CONNECT_API_KEY_SITE_PLACEHOLDER}
                value={site}
                onChange={(event) => setSite(event.target.value)}
              />
            </div>
          ) : null}
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
          <Button type="submit" disabled={!canSubmit}>
            {connect.isPending ? CONNECT_API_KEY_SUBMITTING : CONNECT_API_KEY_SUBMIT}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
