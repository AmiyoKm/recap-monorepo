import { Navigate } from "@tanstack/react-router";

import { useSessionQuery } from "@/api/auth/auth.queries";
import { ClosingBand } from "@/features/home/components/ClosingBand";
import { HowItWorks } from "@/features/home/components/HowItWorks";
import { LandingHeader } from "@/features/home/components/LandingHeader";
import { LandingHero } from "@/features/home/components/LandingHero";
import { Principles } from "@/features/home/components/Principles";
import { SourcesTable } from "@/features/home/components/SourcesTable";

export function HomeContainer() {
  const session = useSessionQuery();

  if (session.data) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex flex-col">
        <LandingHero />
        <HowItWorks />
        <Principles />
        <SourcesTable />
        <ClosingBand />
      </main>
    </div>
  );
}
