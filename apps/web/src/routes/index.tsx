import { createFileRoute } from "@tanstack/react-router";

import { HomeContainer } from "@/features/home/containers/HomeContainer";

export const Route = createFileRoute("/")({
  component: HomeContainer,
});
