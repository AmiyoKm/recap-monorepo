import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import type { ISectionHeaderProps } from "@/features/app-shell/components/SectionHeader/SectionHeader.interfaces";

export function SectionHeader({ title, description }: ISectionHeaderProps) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Heading as={EHeadingTag.H2} variant={EHeadingVariant.SECTION}>
        {title}
      </Heading>
      {description && (
        <p className="text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
