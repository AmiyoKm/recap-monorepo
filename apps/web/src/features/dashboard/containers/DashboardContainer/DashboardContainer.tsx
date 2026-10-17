import { useSessionQuery } from "@/api/auth/auth.queries";
import { useIdentitiesQuery } from "@/api/identity/identity.queries";
import { AppPage } from "@/features/app-shell/components/AppPage";
import { DigestPanel } from "@/features/dashboard/components/DigestPanel";
import { SetupChecklist } from "@/features/dashboard/components/SetupChecklist";
import { SourceMap } from "@/features/dashboard/components/SourceMap";
import {
  DASHBOARD_DATE_FORMAT,
  DASHBOARD_GREETINGS,
} from "@/features/dashboard/containers/DashboardContainer/DashboardContainer.constants";
import {
  dayPartFor,
  firstName,
  greetingTitle,
} from "@/features/dashboard/containers/DashboardContainer/DashboardContainer.helpers";
import { dayjs } from "@/shared/date/date.helpers";

export function DashboardContainer() {
  const session = useSessionQuery();
  const identities = useIdentitiesQuery();
  const now = dayjs();
  const greeting = DASHBOARD_GREETINGS[dayPartFor(now.hour())];
  const name = firstName(session.data?.user.name);

  return (
    <AppPage title={greetingTitle(greeting, name)} description={now.format(DASHBOARD_DATE_FORMAT)}>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <DigestPanel />
          <SourceMap
            identities={identities.data}
            isPending={identities.isPending}
            isError={identities.isError}
            onRetry={() => void identities.refetch()}
          />
        </div>
        <SetupChecklist identities={identities.data} isPending={identities.isPending} />
      </div>
    </AppPage>
  );
}
