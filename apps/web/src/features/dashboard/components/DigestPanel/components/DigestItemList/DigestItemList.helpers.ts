import type { TDigestItem } from "@/api/digest/digest.types";

export function itemKey(item: TDigestItem): string {
  return `${item.text}:${item.activityIds.join(",")}`;
}
