import { HEADING_VARIANT_CLASSES } from "@/features/app-shell/components/Heading/Heading.constants";
import type { IHeadingProps } from "@/features/app-shell/components/Heading/Heading.interfaces";
import { cn } from "@/lib/utils";

export function Heading({ as: Tag, variant, className, id, children }: IHeadingProps) {
  return (
    <Tag id={id} className={cn(HEADING_VARIANT_CLASSES[variant], className)}>
      {children}
    </Tag>
  );
}
