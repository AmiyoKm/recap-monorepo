import { useHealthStatusQuery } from "@/api/health/health.queries";
import { HealthBadge } from "@/features/home/components/HealthBadge";
import { APP_TITLE } from "@/features/home/containers/HomeContainer/HomeContainer.constants";

export function HomeContainer() {
  const { isSuccess } = useHealthStatusQuery();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-serif text-4xl">{APP_TITLE}</h1>
      <HealthBadge isHealthy={isSuccess} />
    </main>
  );
}
