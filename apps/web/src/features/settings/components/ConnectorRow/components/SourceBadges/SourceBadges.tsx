import { sourceLabel } from "@/api/identity/identity.helpers";
import { Badge } from "@/components/ui/badge";
import { SOURCE_BADGES_LABEL } from "@/features/settings/components/ConnectorRow/components/SourceBadges/SourceBadges.constants";
import type { ISourceBadgesProps } from "@/features/settings/components/ConnectorRow/components/SourceBadges/SourceBadges.interfaces";

export function SourceBadges({ sources }: ISourceBadgesProps) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <ul aria-label={SOURCE_BADGES_LABEL} className="flex flex-wrap gap-1 pt-1">
      {sources.map((source) => (
        <li key={source}>
          <Badge variant="secondary">{sourceLabel(source)}</Badge>
        </li>
      ))}
    </ul>
  );
}
