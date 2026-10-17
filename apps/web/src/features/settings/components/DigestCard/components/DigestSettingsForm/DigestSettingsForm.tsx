import { useMemo } from "react";

import { listTimeZones } from "@/api/digest/digest.helpers";
import { useUpdateDigestSettingsMutation } from "@/api/digest/digest.mutations";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  DIGEST_NEXT_RUN_LABEL,
  DIGEST_SAVE_FAILED,
  DIGEST_TIME_ZONE_EMPTY,
  DIGEST_TIME_ZONE_LABEL,
  DIGEST_TIME_ZONE_PLACEHOLDER,
} from "@/features/settings/components/DigestCard/components/DigestSettingsForm/DigestSettingsForm.constants";
import { formatNextRun } from "@/features/settings/components/DigestCard/components/DigestSettingsForm/DigestSettingsForm.helpers";
import type { IDigestSettingsFormProps } from "@/features/settings/components/DigestCard/components/DigestSettingsForm/DigestSettingsForm.interfaces";

export function DigestSettingsForm({ settings }: IDigestSettingsFormProps) {
  const update = useUpdateDigestSettingsMutation();
  const timeZones = useMemo(() => listTimeZones(), []);

  function handleChange(timeZone: string | null) {
    if (!timeZone || timeZone === settings.timeZone) {
      return;
    }
    update.mutate(timeZone);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{DIGEST_TIME_ZONE_LABEL}</FieldLabel>
        <Combobox
          items={timeZones}
          value={settings.timeZone}
          onValueChange={handleChange}
          disabled={update.isPending}
        >
          <ComboboxInput placeholder={DIGEST_TIME_ZONE_PLACEHOLDER} className="w-full max-w-sm" />
          <ComboboxContent>
            <ComboboxEmpty>{DIGEST_TIME_ZONE_EMPTY}</ComboboxEmpty>
            <ComboboxList>
              {(zone: string) => (
                <ComboboxItem key={zone} value={zone}>
                  {zone}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <FieldDescription>
          {DIGEST_NEXT_RUN_LABEL}: {formatNextRun(settings.nextRunAt, settings.timeZone)}
        </FieldDescription>
      </Field>
      {update.isError && (
        <Alert variant="destructive">
          <AlertTitle>{DIGEST_SAVE_FAILED}</AlertTitle>
        </Alert>
      )}
    </div>
  );
}
