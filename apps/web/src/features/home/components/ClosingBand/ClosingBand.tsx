import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/features/app-shell/components/Section";
import { SectionHeader } from "@/features/app-shell/components/SectionHeader";
import { EAuthMode } from "@/features/auth/auth.enums";
import {
  CLOSING_ACTION,
  CLOSING_BODY,
  CLOSING_TITLE,
} from "@/features/home/components/ClosingBand/ClosingBand.constants";

export function ClosingBand() {
  return (
    <Section
      className="border-t"
      innerClassName="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
    >
      <SectionHeader title={CLOSING_TITLE} description={CLOSING_BODY} />
      <Button asChild size="lg" className="h-10 self-start px-4 lg:self-auto">
        <Link to="/sign-in" search={{ mode: EAuthMode.SIGN_UP }}>
          {CLOSING_ACTION}
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </Button>
    </Section>
  );
}
