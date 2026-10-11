import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Section } from "@/features/app-shell/components/Section";
import { EAuthMode } from "@/features/auth/auth.enums";
import { MechanismDiagram } from "@/features/home/components/LandingHero/components/MechanismDiagram";
import {
  LANDING_HERO_BODY,
  LANDING_HERO_HOW,
  LANDING_HERO_HOW_ID,
  LANDING_HERO_START,
  LANDING_HERO_TITLE,
} from "@/features/home/components/LandingHero/LandingHero.constants";

export function LandingHero() {
  return (
    <Section className="pt-12 sm:pt-16 lg:pt-20" innerClassName="flex flex-col gap-12 lg:gap-16">
      <div className="flex max-w-3xl flex-col gap-6">
        <Heading as={EHeadingTag.H1} variant={EHeadingVariant.DISPLAY}>
          {LANDING_HERO_TITLE}
        </Heading>
        <p className="max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {LANDING_HERO_BODY}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="lg" className="h-10 px-4">
            <Link to="/sign-in" search={{ mode: EAuthMode.SIGN_UP }}>
              {LANDING_HERO_START}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-10 px-4">
            <Link to="/" hash={LANDING_HERO_HOW_ID}>
              {LANDING_HERO_HOW}
            </Link>
          </Button>
        </div>
      </div>
      <MechanismDiagram />
    </Section>
  );
}
