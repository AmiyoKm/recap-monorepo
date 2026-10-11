import type { ReactNode } from "react";

import type {
  EHeadingTag,
  EHeadingVariant,
} from "@/features/app-shell/components/Heading/Heading.enums";

export interface IHeadingProps {
  as: EHeadingTag;
  variant: EHeadingVariant;
  className?: string;
  id?: string;
  children: ReactNode;
}
