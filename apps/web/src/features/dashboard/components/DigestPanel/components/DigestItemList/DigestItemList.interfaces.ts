import type { TDigestItem } from "@/api/digest/digest.types";

export interface IDigestItemListProps {
  title: string;
  emptyText: string;
  items: TDigestItem[];
}
