import { Link } from "@tanstack/react-router";

import { Container } from "@/features/app-shell/components/Container";
import {
  LANDING_FOOTER_NAME,
  LANDING_FOOTER_PRIVACY,
} from "@/features/home/components/LandingFooter/LandingFooter.constants";

export function LandingFooter() {
  return (
    <footer className="border-t">
      <Container className="flex h-14 items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{LANDING_FOOTER_NAME}</p>
        <Link to="/privacy" className="hover:text-foreground">
          {LANDING_FOOTER_PRIVACY}
        </Link>
      </Container>
    </footer>
  );
}
