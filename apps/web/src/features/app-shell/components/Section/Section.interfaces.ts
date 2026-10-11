import type { ReactNode } from "react";

export interface ISectionProps {
  id?: string;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}
