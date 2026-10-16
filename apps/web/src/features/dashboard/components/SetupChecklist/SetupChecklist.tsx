import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { SetupStepItem } from "@/features/dashboard/components/SetupChecklist/components/SetupStepItem";
import {
  SETUP_DONE_SUFFIX,
  SETUP_PROGRESS_LABEL,
  SETUP_TITLE,
} from "@/features/dashboard/components/SetupChecklist/SetupChecklist.constants";
import {
  buildSetupSteps,
  completedPercent,
} from "@/features/dashboard/components/SetupChecklist/SetupChecklist.helpers";
import type { ISetupChecklistProps } from "@/features/dashboard/components/SetupChecklist/SetupChecklist.interfaces";

export function SetupChecklist({ identities, isPending }: ISetupChecklistProps) {
  const steps = buildSetupSteps(identities ?? []);
  const percent = completedPercent(steps);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {SETUP_TITLE}
          </Heading>
        </CardTitle>
        <CardDescription className="tabular-nums">
          {doneCount} / {steps.length} {SETUP_DONE_SUFFIX}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Progress value={percent} aria-label={SETUP_PROGRESS_LABEL} />
        {isPending && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {!isPending && (
          <ol className="flex flex-col gap-5">
            {steps.map((step, index) => (
              <SetupStepItem key={step.step} item={step} position={index + 1} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
