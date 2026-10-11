import { EHeadingVariant } from "@/features/app-shell/components/Heading/Heading.enums";

export const HEADING_VARIANT_CLASSES: Record<EHeadingVariant, string> = {
  [EHeadingVariant.DISPLAY]:
    "text-4xl font-semibold leading-none tracking-tight text-balance sm:text-5xl lg:text-6xl",
  [EHeadingVariant.PAGE]: "text-xl font-semibold leading-tight tracking-tight sm:text-2xl",
  [EHeadingVariant.SECTION]:
    "text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl",
  [EHeadingVariant.TITLE]: "text-xl font-semibold leading-snug tracking-tight text-balance",
  [EHeadingVariant.CARD]: "text-sm font-semibold leading-snug",
  [EHeadingVariant.ITEM]: "text-sm font-semibold leading-snug",
  [EHeadingVariant.LABEL]: "text-sm font-medium",
};
