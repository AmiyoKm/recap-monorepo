import { createFileRoute } from "@tanstack/react-router";

import { ProfileContainer } from "@/features/profile/containers/ProfileContainer";

export const Route = createFileRoute("/_app/profile")({
  component: ProfileContainer,
});
