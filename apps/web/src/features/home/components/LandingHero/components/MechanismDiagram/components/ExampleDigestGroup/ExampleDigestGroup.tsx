import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import type { IExampleDigestGroupProps } from "@/features/home/components/LandingHero/components/MechanismDiagram/components/ExampleDigestGroup/ExampleDigestGroup.interfaces";

export function ExampleDigestGroup({ identity }: IExampleDigestGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <Heading as={EHeadingTag.P} variant={EHeadingVariant.ITEM}>
        {identity.role}
      </Heading>
      <ul className="flex flex-col gap-1.5">
        {identity.summary.map((line) => (
          <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
