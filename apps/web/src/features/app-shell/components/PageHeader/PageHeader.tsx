import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import type { IPageHeaderProps } from "@/features/app-shell/components/PageHeader/PageHeader.interfaces";

export function PageHeader({ title, description, actions }: IPageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <Heading as={EHeadingTag.H1} variant={EHeadingVariant.PAGE}>
          {title}
        </Heading>
        {description ? (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
