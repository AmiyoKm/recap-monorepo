import { useDigestSettingsQuery } from "@/api/digest/digest.queries";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { DigestSettingsForm } from "@/features/settings/components/DigestCard/components/DigestSettingsForm";
import {
  DIGEST_DESCRIPTION,
  DIGEST_LOAD_FAILED,
  DIGEST_LOADING,
  DIGEST_RETRY,
  DIGEST_TITLE,
} from "@/features/settings/components/DigestCard/DigestCard.constants";

export function DigestCard() {
  const settings = useDigestSettingsQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {DIGEST_TITLE}
          </Heading>
        </CardTitle>
        <CardDescription>{DIGEST_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent>
        {settings.isPending && (
          <Skeleton aria-label={DIGEST_LOADING} className="h-16 w-full rounded-lg" />
        )}
        {settings.isError && (
          <Alert variant="destructive">
            <AlertTitle>{DIGEST_LOAD_FAILED}</AlertTitle>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => void settings.refetch()}>
                {DIGEST_RETRY}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {settings.data && <DigestSettingsForm settings={settings.data} />}
      </CardContent>
    </Card>
  );
}
