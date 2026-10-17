import { sourceLabel } from "@/api/identity/identity.helpers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  SOURCE_PICKER_CONTINUE,
  SOURCE_PICKER_DESCRIPTIONS,
  SOURCE_PICKER_LABEL,
  SOURCE_PICKER_ORDER,
} from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.constants";
import { toggleSource } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.helpers";
import type { ISourcePickerProps } from "@/features/settings/components/ConnectProviderDialog/components/SourcePicker/SourcePicker.interfaces";

export function SourcePicker({
  identityId,
  sources,
  onSourcesChange,
  onContinue,
}: ISourcePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <FieldSet>
        <FieldLegend className="sr-only">{SOURCE_PICKER_LABEL}</FieldLegend>
        <FieldGroup className="gap-2">
          {SOURCE_PICKER_ORDER.map((source) => {
            const checkboxId = `${identityId}-source-${source}`;
            return (
              <FieldLabel key={source} htmlFor={checkboxId}>
                <Field orientation="horizontal">
                  <Checkbox
                    id={checkboxId}
                    checked={sources.includes(source)}
                    onCheckedChange={(checked) =>
                      onSourcesChange(toggleSource(sources, source, checked === true))
                    }
                  />
                  <FieldContent className="min-w-0">
                    <FieldTitle>{sourceLabel(source)}</FieldTitle>
                    <FieldDescription>{SOURCE_PICKER_DESCRIPTIONS[source]}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            );
          })}
        </FieldGroup>
      </FieldSet>
      <Button
        className="w-full sm:w-auto sm:self-end"
        disabled={sources.length === 0}
        onClick={onContinue}
      >
        {SOURCE_PICKER_CONTINUE}
      </Button>
    </div>
  );
}
