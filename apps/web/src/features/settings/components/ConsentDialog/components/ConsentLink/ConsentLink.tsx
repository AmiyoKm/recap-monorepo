import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCopyText } from "@/features/settings/components/ConsentDialog/components/ConsentLink/ConsentLink.hooks";
import type { IConsentLinkProps } from "@/features/settings/components/ConsentDialog/components/ConsentLink/ConsentLink.interfaces";

export function ConsentLink({ url, copyText, copiedText, openText }: IConsentLinkProps) {
  const { copied, copy } = useCopyText();

  return (
    <div className="flex flex-col gap-3">
      <Input readOnly value={url} />
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => void copy(url)}>
          {copied && copiedText}
          {!copied && copyText}
        </Button>
        <Button asChild>
          <a href={url} target="_blank" rel="noreferrer">
            {openText}
          </a>
        </Button>
      </div>
    </div>
  );
}
