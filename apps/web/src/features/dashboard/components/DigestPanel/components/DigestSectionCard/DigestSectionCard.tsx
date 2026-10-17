import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { DigestItemList } from "@/features/dashboard/components/DigestPanel/components/DigestItemList";
import {
  DIGEST_SECTION_HIGHLIGHTS,
  DIGEST_SECTION_MEETINGS_AHEAD,
  DIGEST_SECTION_NEEDS_YOU,
  DIGEST_SECTION_NO_HIGHLIGHTS,
  DIGEST_SECTION_NO_ITEMS,
  DIGEST_SECTION_NO_MEETINGS,
} from "@/features/dashboard/components/DigestPanel/components/DigestSectionCard/DigestSectionCard.constants";
import type { IDigestSectionCardProps } from "@/features/dashboard/components/DigestPanel/components/DigestSectionCard/DigestSectionCard.interfaces";

export function DigestSectionCard({ section }: IDigestSectionCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="min-w-0 truncate">
          <Heading as={EHeadingTag.H3} variant={EHeadingVariant.ITEM}>
            {section.identityEmail}
          </Heading>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DigestItemList
          title={DIGEST_SECTION_HIGHLIGHTS}
          emptyText={DIGEST_SECTION_NO_HIGHLIGHTS}
          items={section.highlights}
        />
        <DigestItemList
          title={DIGEST_SECTION_MEETINGS_AHEAD}
          emptyText={DIGEST_SECTION_NO_MEETINGS}
          items={section.meetingsAhead}
        />
        <DigestItemList
          title={DIGEST_SECTION_NEEDS_YOU}
          emptyText={DIGEST_SECTION_NO_ITEMS}
          items={section.needsYou}
        />
      </CardContent>
    </Card>
  );
}
