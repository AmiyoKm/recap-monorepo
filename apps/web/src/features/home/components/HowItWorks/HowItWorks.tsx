import { Separator } from "@/components/ui/separator";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Section } from "@/features/app-shell/components/Section";
import { SectionHeader } from "@/features/app-shell/components/SectionHeader";
import {
  HOW_IT_WORKS_STEPS,
  HOW_IT_WORKS_TITLE,
} from "@/features/home/components/HowItWorks/HowItWorks.constants";
import { LANDING_HERO_HOW_ID } from "@/features/home/components/LandingHero/LandingHero.constants";

export function HowItWorks() {
  return (
    <Section
      id={LANDING_HERO_HOW_ID}
      className="border-y bg-card"
      innerClassName="flex flex-col gap-10"
    >
      <SectionHeader title={HOW_IT_WORKS_TITLE} />
      <ol className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-medium text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <Separator className="flex-1" />
            </div>
            <Heading as={EHeadingTag.H3} variant={EHeadingVariant.LABEL}>
              {step.title}
            </Heading>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
