import { Link } from "@tanstack/react-router";

import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { DIGEST_ITEM_VIEW_LINK } from "@/features/dashboard/components/DigestPanel/components/DigestItemList/DigestItemList.constants";
import { itemKey } from "@/features/dashboard/components/DigestPanel/components/DigestItemList/DigestItemList.helpers";
import type { IDigestItemListProps } from "@/features/dashboard/components/DigestPanel/components/DigestItemList/DigestItemList.interfaces";

export function DigestItemList({ title, emptyText, items }: IDigestItemListProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Heading as={EHeadingTag.P} variant={EHeadingVariant.LABEL} className="text-muted-foreground">
        {title}
      </Heading>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={itemKey(item)} className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="text-pretty">{item.text}</span>
              {item.activityIds.length > 0 && (
                <Link
                  to="/activity"
                  search={{ id: item.activityIds }}
                  className="w-fit text-xs text-muted-foreground underline underline-offset-3 hover:text-foreground"
                >
                  {DIGEST_ITEM_VIEW_LINK}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
