import type { ReactNode } from "react";

import type { IPageHeaderProps } from "@/features/app-shell/components/PageHeader/PageHeader.interfaces";

export interface IAppPageProps extends IPageHeaderProps {
  children: ReactNode;
}
