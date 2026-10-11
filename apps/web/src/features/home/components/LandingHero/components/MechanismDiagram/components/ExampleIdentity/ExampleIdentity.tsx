import { providerLabel } from "@/api/identity/identity.helpers";
import type { IExampleIdentityProps } from "@/features/home/components/LandingHero/components/MechanismDiagram/components/ExampleIdentity/ExampleIdentity.interfaces";

export function ExampleIdentity({ identity }: IExampleIdentityProps) {
  return (
    <li className="flex flex-col gap-1.5 py-1">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">{identity.role}</p>
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
      </div>
      <p className="truncate text-xs text-muted-foreground">{identity.email}</p>
      <ul className="flex flex-col gap-1">
        {identity.sources.map((source) => (
          <li key={source} className="text-xs text-muted-foreground">
            {providerLabel(source)}
          </li>
        ))}
      </ul>
    </li>
  );
}
