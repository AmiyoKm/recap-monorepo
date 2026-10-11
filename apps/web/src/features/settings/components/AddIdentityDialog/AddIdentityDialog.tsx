import { useState } from "react";

import { useConnectIdentityMutation } from "@/api/identity/identity.mutations";
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
import {
  ADD_IDENTITY_COPIED,
  ADD_IDENTITY_COPY,
  ADD_IDENTITY_DESCRIPTION,
  ADD_IDENTITY_FAILED,
  ADD_IDENTITY_LOADING,
  ADD_IDENTITY_OPEN_GOOGLE,
  ADD_IDENTITY_TITLE,
  ADD_IDENTITY_TRIGGER,
} from "@/features/settings/components/AddIdentityDialog/AddIdentityDialog.constants";

export function AddIdentityDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const connect = useConnectIdentityMutation();

  async function copyAuthorizeUrl(authorizeUrl: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(authorizeUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setCopied(false);
        if (next) {
          connect.mutate();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>{ADD_IDENTITY_TRIGGER}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ADD_IDENTITY_TITLE}</DialogTitle>
          <DialogDescription>{ADD_IDENTITY_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {connect.isPending ? (
          <p className="text-sm text-muted-foreground">{ADD_IDENTITY_LOADING}</p>
        ) : null}
        {connect.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {ADD_IDENTITY_FAILED}
          </p>
        ) : null}
        {connect.data ? (
          <div className="flex flex-col gap-3">
            <Input readOnly value={connect.data.authorizeUrl} />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void copyAuthorizeUrl(connect.data.authorizeUrl)}
              >
                {copied ? ADD_IDENTITY_COPIED : ADD_IDENTITY_COPY}
              </Button>
              <Button asChild>
                <a href={connect.data.authorizeUrl} target="_blank" rel="noreferrer">
                  {ADD_IDENTITY_OPEN_GOOGLE}
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
