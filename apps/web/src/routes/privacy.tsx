import { createFileRoute } from "@tanstack/react-router";

import { PrivacyContainer } from "@/features/privacy/containers/PrivacyContainer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyContainer,
});
