import { useSessionQuery } from "@/api/auth/auth.queries";
import { AppPage } from "@/features/app-shell/components/AppPage";
import { ProfileDetails } from "@/features/profile/components/ProfileDetails";
import { ProfileSummary } from "@/features/profile/components/ProfileSummary";
import {
  PROFILE_DESCRIPTION,
  PROFILE_TITLE,
} from "@/features/profile/containers/ProfileContainer/ProfileContainer.constants";

export function ProfileContainer() {
  const session = useSessionQuery();
  const user = session.data?.user;

  if (!user) {
    return null;
  }
  return (
    <AppPage title={PROFILE_TITLE} description={PROFILE_DESCRIPTION}>
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <ProfileSummary user={user} />
        <div className="min-w-0 lg:col-span-2">
          <ProfileDetails user={user} />
        </div>
      </div>
    </AppPage>
  );
}
