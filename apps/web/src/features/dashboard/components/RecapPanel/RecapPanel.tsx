import { ScrollTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import {
  RECAP_PANEL_BADGE,
  RECAP_PANEL_EMPTY_DESCRIPTION,
  RECAP_PANEL_EMPTY_TITLE,
  RECAP_PANEL_TITLE,
} from "@/features/dashboard/components/RecapPanel/RecapPanel.constants";

export function RecapPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {RECAP_PANEL_TITLE}
          </Heading>
        </CardTitle>
        <CardAction>
          <Badge variant="outline">{RECAP_PANEL_BADGE}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Empty className="p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollTextIcon />
            </EmptyMedia>
            <EmptyTitle>{RECAP_PANEL_EMPTY_TITLE}</EmptyTitle>
            <EmptyDescription>{RECAP_PANEL_EMPTY_DESCRIPTION}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
