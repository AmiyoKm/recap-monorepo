import type { LinkProps } from "@tanstack/react-router";

export interface IWordmarkProps {
  to: LinkProps["to"];
  collapsible?: boolean;
}
