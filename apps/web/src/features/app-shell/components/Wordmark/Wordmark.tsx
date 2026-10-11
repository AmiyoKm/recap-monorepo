import { Link } from "@tanstack/react-router";

import { LogoMark } from "@/features/app-shell/components/Wordmark/components/LogoMark";
import { WORDMARK_NAME } from "@/features/app-shell/components/Wordmark/Wordmark.constants";
import type { IWordmarkProps } from "@/features/app-shell/components/Wordmark/Wordmark.interfaces";
import { cn } from "@/lib/utils";

export function Wordmark({ to, collapsible = false }: IWordmarkProps) {
  return (
    <Link
      to={to}
      aria-label={WORDMARK_NAME}
      className="flex shrink-0 items-center gap-2 rounded-md text-base font-semibold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <LogoMark />
      <span className={cn(collapsible && "group-data-[collapsible=icon]:hidden")}>
        {WORDMARK_NAME}
      </span>
    </Link>
  );
}
