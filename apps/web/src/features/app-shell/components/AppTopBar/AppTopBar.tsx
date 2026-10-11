import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Wordmark } from "@/features/app-shell/components/Wordmark";

export function AppTopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-6 lg:px-10">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="data-vertical:h-4 data-vertical:self-center md:hidden"
      />
      <div className="md:hidden">
        <Wordmark to="/dashboard" />
      </div>
    </header>
  );
}
