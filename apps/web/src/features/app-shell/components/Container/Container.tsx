import type { IContainerProps } from "@/features/app-shell/components/Container/Container.interfaces";
import { cn } from "@/lib/utils";

export function Container({ className, fluid = false, children }: IContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        fluid && "max-w-screen-2xl lg:px-10",
        !fluid && "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
