import { Badge } from "@/components/ui/badge";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { ExampleDigestGroup } from "@/features/home/components/LandingHero/components/MechanismDiagram/components/ExampleDigestGroup";
import { ExampleIdentity } from "@/features/home/components/LandingHero/components/MechanismDiagram/components/ExampleIdentity";
import {
  MECHANISM_ACCOUNTS_TITLE,
  MECHANISM_EXAMPLE,
  MECHANISM_IDENTITIES,
  MECHANISM_LABEL,
  MECHANISM_RECAP_RANGE,
  MECHANISM_RECAP_TITLE,
} from "@/features/home/components/LandingHero/components/MechanismDiagram/MechanismDiagram.constants";

export function MechanismDiagram() {
  return (
    <figure
      aria-label={MECHANISM_LABEL}
      className="grid grid-cols-1 overflow-hidden rounded-xl border bg-card lg:grid-cols-12"
    >
      <div className="flex flex-col gap-3 border-b bg-sidebar p-4 lg:col-span-4 lg:border-r lg:border-b-0 lg:p-5">
        <Heading
          as={EHeadingTag.P}
          variant={EHeadingVariant.ITEM}
          className="text-muted-foreground"
        >
          {MECHANISM_ACCOUNTS_TITLE}
        </Heading>
        <ul className="flex flex-col gap-4">
          {MECHANISM_IDENTITIES.map((identity) => (
            <ExampleIdentity key={identity.email} identity={identity} />
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6 lg:col-span-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Heading as={EHeadingTag.P} variant={EHeadingVariant.CARD}>
              {MECHANISM_RECAP_TITLE}
            </Heading>
            <p className="text-xs text-muted-foreground tabular-nums">{MECHANISM_RECAP_RANGE}</p>
          </div>
          <Badge variant="outline">{MECHANISM_EXAMPLE}</Badge>
        </div>
        <div className="flex flex-col gap-5">
          {MECHANISM_IDENTITIES.map((identity) => (
            <ExampleDigestGroup key={identity.email} identity={identity} />
          ))}
        </div>
      </div>
    </figure>
  );
}
