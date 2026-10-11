import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useConsentCompletion } from "@/features/settings/components/ConsentDialog/ConsentDialog.hooks";
import type { IConsentDialogProps } from "@/features/settings/components/ConsentDialog/ConsentDialog.interfaces";
import { ConsentLink } from "@/features/settings/components/ConsentDialog/components/ConsentLink";

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
  doneText,
  onDialogOpen,
}: IConsentDialogProps) {
  const [open, setOpen] = useState(false);
  const { markBaseline } = useConsentCompletion({
    isWaiting: open && Boolean(authorizeUrl),
    doneText,
    onDone: () => setOpen(false),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        markBaseline();
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
          <ConsentLink
            url={authorizeUrl}
            copyText={copyText}
            copiedText={copiedText}
            openText={openText}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
