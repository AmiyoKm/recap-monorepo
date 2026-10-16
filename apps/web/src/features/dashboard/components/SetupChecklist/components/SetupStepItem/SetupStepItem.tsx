import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ISetupStepItemProps } from "@/features/dashboard/components/SetupChecklist/components/SetupStepItem/SetupStepItem.interfaces";
import {
  SETUP_LATER,
  SETUP_STEP_ACTIONS,
  SETUP_STEP_DESCRIPTIONS,
  SETUP_STEP_TITLES,
} from "@/features/dashboard/components/SetupChecklist/SetupChecklist.constants";
import { cn } from "@/lib/utils";

export function SetupStepItem({ item, position }: ISetupStepItemProps) {
  const showAction = !item.done && item.available;

  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
          item.done && "bg-muted text-foreground",
          !item.done && "bg-background text-muted-foreground",
        )}
      >
        {item.done && <CheckIcon aria-hidden="true" className="size-3.5" />}
        {!item.done && position}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium",
              item.done && "text-muted-foreground line-through decoration-border",
            )}
          >
            {SETUP_STEP_TITLES[item.step]}
          </p>
          {!item.available && <Badge variant="outline">{SETUP_LATER}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{SETUP_STEP_DESCRIPTIONS[item.step]}</p>
        {showAction && (
          <Button asChild size="sm" variant="outline" className="mt-1 self-start">
            <Link to="/settings">{SETUP_STEP_ACTIONS[item.step]}</Link>
          </Button>
        )}
      </div>
    </li>
  );
}
