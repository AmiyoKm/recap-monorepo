import { EllipsisIcon, Trash2Icon } from "lucide-react";

import { useDeleteIdentityMutation } from "@/api/identity/identity.mutations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IDENTITY_MENU_LABEL,
  IDENTITY_MENU_REMOVE,
  IDENTITY_MENU_REMOVING,
} from "@/features/settings/components/IdentityCard/components/IdentityMenu/IdentityMenu.constants";
import type { IIdentityMenuProps } from "@/features/settings/components/IdentityCard/components/IdentityMenu/IdentityMenu.interfaces";

export function IdentityMenu({ identityId }: IIdentityMenuProps) {
  const removeIdentity = useDeleteIdentityMutation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={IDENTITY_MENU_LABEL}
          disabled={removeIdentity.isPending}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-48">
        <DropdownMenuItem variant="destructive" onSelect={() => removeIdentity.mutate(identityId)}>
          <Trash2Icon />
          {removeIdentity.isPending ? IDENTITY_MENU_REMOVING : IDENTITY_MENU_REMOVE}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
