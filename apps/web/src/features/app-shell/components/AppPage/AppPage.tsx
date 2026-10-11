import type { IAppPageProps } from "@/features/app-shell/components/AppPage/AppPage.interfaces";
import { Container } from "@/features/app-shell/components/Container";
import { PageHeader } from "@/features/app-shell/components/PageHeader";

export function AppPage({ title, description, actions, children }: IAppPageProps) {
  return (
    <div className="flex-1 py-6 sm:py-8 lg:py-10">
      <Container fluid className="flex flex-col gap-6 lg:gap-8">
        <PageHeader title={title} description={description} actions={actions} />
        {children}
      </Container>
    </div>
  );
}
