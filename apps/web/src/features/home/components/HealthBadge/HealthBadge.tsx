import { Badge } from "@/components/ui/badge";
import {
  HEALTHY_LABEL,
  UNHEALTHY_LABEL,
} from "@/features/home/components/HealthBadge/HealthBadge.constants";
import type { IHealthBadgeProps } from "@/features/home/components/HealthBadge/HealthBadge.interfaces";

export function HealthBadge({ isHealthy }: IHealthBadgeProps) {
  return (
    <Badge variant={isHealthy ? "secondary" : "destructive"}>
      {isHealthy ? HEALTHY_LABEL : UNHEALTHY_LABEL}
    </Badge>
  );
}
