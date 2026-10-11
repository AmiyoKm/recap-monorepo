import { Container } from "@/features/app-shell/components/Container";
import type { ISectionProps } from "@/features/app-shell/components/Section/Section.interfaces";
import { cn } from "@/lib/utils";

export function Section({ id, className, innerClassName, children }: ISectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-8 py-16 sm:py-20 lg:py-24", className)}>
      <Container className={innerClassName}>{children}</Container>
    </section>
  );
}
