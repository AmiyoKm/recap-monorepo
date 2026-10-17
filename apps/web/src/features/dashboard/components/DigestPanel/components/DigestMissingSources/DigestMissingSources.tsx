import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DIGEST_MISSING_TITLE } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources/DigestMissingSources.constants";
import { describeMissingSource } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources/DigestMissingSources.helpers";
import type { IDigestMissingSourcesProps } from "@/features/dashboard/components/DigestPanel/components/DigestMissingSources/DigestMissingSources.interfaces";

export function DigestMissingSources({ missingSources }: IDigestMissingSourcesProps) {
  if (missingSources.length === 0) {
    return null;
  }

  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>{DIGEST_MISSING_TITLE}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-0.5">
          {missingSources.map((missing) => (
            <li key={missing.connectionId}>{describeMissingSource(missing)}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
