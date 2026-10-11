import { useState } from "react";

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
import type { IConsentDialogProps } from "@/features/settings/components/ConsentDialog/ConsentDialog.interfaces";

export function ConsentDialog({
  trigger,
  title,
  description,
  isPending,
  isError,
  authorizeUrl,
  pendingText,
  failedText,
  copyText,
  copiedText,
  openText,
  onDialogOpen,
}: IConsentDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAuthorizeUrl(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
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
          onDialogOpen();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {isPending ? <p className="text-sm text-muted-foreground">{pendingText}</p> : null}
        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            {failedText}
          </p>
        ) : null}
        {authorizeUrl ? (
          <div className="flex flex-col gap-3">
            <Input readOnly value={authorizeUrl} />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void copyAuthorizeUrl(authorizeUrl)}>
                {copied ? copiedText : copyText}
              </Button>
              <Button asChild>
                <a href={authorizeUrl} target="_blank" rel="noreferrer">
                  {openText}
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
