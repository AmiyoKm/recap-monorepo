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
  picker,
  isPending,
  isError,
  authorizeUrl,
  pendingText,
  failedText,
  copyText,
  copiedText,
  openText,
  doneText,
  target,
  onDialogOpen,
}: IConsentDialogProps) {
  const { open, isReady, changeOpen } = useConsentCompletion({
    hasAuthorizeUrl: Boolean(authorizeUrl),
    target,
    doneText,
    onDialogOpen,
  });

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild disabled={!isReady}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {picker}
        {isPending && <p className="text-sm text-muted-foreground">{pendingText}</p>}
        {isError && (
          <p role="alert" className="text-sm text-destructive">
            {failedText}
          </p>
        )}
        {authorizeUrl && (
          <ConsentLink
            url={authorizeUrl}
            copyText={copyText}
            copiedText={copiedText}
            openText={openText}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
