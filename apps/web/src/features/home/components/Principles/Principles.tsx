import { Separator } from "@/components/ui/separator";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Section } from "@/features/app-shell/components/Section";
import { SectionHeader } from "@/features/app-shell/components/SectionHeader";
import {
  PRINCIPLES_BODY,
  PRINCIPLES_ITEMS,
  PRINCIPLES_TITLE,
} from "@/features/home/components/Principles/Principles.constants";

export function Principles() {
  return (
    <Section innerClassName="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-5">
        <SectionHeader title={PRINCIPLES_TITLE} description={PRINCIPLES_BODY} />
      </div>
      <dl className="flex min-w-0 flex-col lg:col-span-7">
        {PRINCIPLES_ITEMS.map((item, index) => (
          <div key={item.title} className="flex flex-col gap-6">
            {index === 0 ? null : <Separator />}
            <div className="grid grid-cols-1 gap-2 pb-6 sm:grid-cols-5 sm:gap-6">
              <dt className="sm:col-span-2">
                <Heading as={EHeadingTag.SPAN} variant={EHeadingVariant.ITEM}>
                  {item.title}
                </Heading>
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground sm:col-span-3">
                {item.body}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Section>
  );
}
