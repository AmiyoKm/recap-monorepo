import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface IAppSidebarNavItemProps {
  to: LinkProps["to"];
  label: string;
  icon: ReactNode;
}
