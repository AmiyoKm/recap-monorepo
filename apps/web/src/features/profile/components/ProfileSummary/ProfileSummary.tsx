import { LogOutIcon } from "lucide-react";

import { userInitial } from "@/api/auth/auth.helpers";
import { useSignOutMutation } from "@/api/auth/auth.mutations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import {
  PROFILE_SUMMARY_SIGN_OUT,
  PROFILE_SUMMARY_SIGNING_OUT,
} from "@/features/profile/components/ProfileSummary/ProfileSummary.constants";
import type { IProfileSummaryProps } from "@/features/profile/components/ProfileSummary/ProfileSummary.interfaces";

export function ProfileSummary({ user }: IProfileSummaryProps) {
  const signOut = useSignOutMutation();

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-6">
        <Avatar className="size-16">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback className="text-xl">{userInitial(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="flex w-full min-w-0 flex-col gap-1">
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD} className="truncate">
            {user.name}
          </Heading>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
          <LogOutIcon />
          {signOut.isPending && PROFILE_SUMMARY_SIGNING_OUT}
          {!signOut.isPending && PROFILE_SUMMARY_SIGN_OUT}
        </Button>
      </CardContent>
    </Card>
  );
}
