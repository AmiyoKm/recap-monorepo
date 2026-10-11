import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Container } from "@/features/app-shell/components/Container";
import { Wordmark } from "@/features/app-shell/components/Wordmark";
import { EAuthMode } from "@/features/auth/auth.enums";
import {
  LANDING_HEADER_SIGN_IN,
  LANDING_HEADER_START,
} from "@/features/home/components/LandingHeader/LandingHeader.constants";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <Container className="flex h-14 items-center justify-between gap-3">
        <Wordmark to="/" />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/sign-in">{LANDING_HEADER_SIGN_IN}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/sign-in" search={{ mode: EAuthMode.SIGN_UP }}>
              {LANDING_HEADER_START}
            </Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
