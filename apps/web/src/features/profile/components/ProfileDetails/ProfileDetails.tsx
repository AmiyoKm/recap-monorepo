import { Link } from "@tanstack/react-router";

import { useIdentitiesQuery } from "@/api/identity/identity.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { ProfileDetailRow } from "@/features/profile/components/ProfileDetails/components/ProfileDetailRow";
import {
  PROFILE_DETAILS_DATE_FORMAT,
  PROFILE_DETAILS_EMAIL,
  PROFILE_DETAILS_EMAIL_STATUS,
  PROFILE_DETAILS_MANAGE,
  PROFILE_DETAILS_MEMBER_SINCE,
  PROFILE_DETAILS_NAME,
  PROFILE_DETAILS_NOT_VERIFIED,
  PROFILE_DETAILS_TITLE,
  PROFILE_DETAILS_VERIFIED,
  PROFILE_DETAILS_WORK_ACCOUNTS,
} from "@/features/profile/components/ProfileDetails/ProfileDetails.constants";
import type { IProfileDetailsProps } from "@/features/profile/components/ProfileDetails/ProfileDetails.interfaces";
import { dayjs } from "@/shared/date/date.helpers";

export function ProfileDetails({ user }: IProfileDetailsProps) {
  const identities = useIdentitiesQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>
            {PROFILE_DETAILS_TITLE}
          </Heading>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col divide-y">
          <ProfileDetailRow label={PROFILE_DETAILS_NAME}>
            <span className="truncate">{user.name}</span>
          </ProfileDetailRow>
          <ProfileDetailRow label={PROFILE_DETAILS_EMAIL}>
            <span className="truncate">{user.email}</span>
          </ProfileDetailRow>
          <ProfileDetailRow label={PROFILE_DETAILS_EMAIL_STATUS}>
            <Badge variant={user.emailVerified ? "secondary" : "outline"}>
              {user.emailVerified ? PROFILE_DETAILS_VERIFIED : PROFILE_DETAILS_NOT_VERIFIED}
            </Badge>
          </ProfileDetailRow>
          <ProfileDetailRow label={PROFILE_DETAILS_MEMBER_SINCE}>
            {dayjs(user.createdAt).format(PROFILE_DETAILS_DATE_FORMAT)}
          </ProfileDetailRow>
          <ProfileDetailRow label={PROFILE_DETAILS_WORK_ACCOUNTS}>
            {identities.data ? (
              <span className="tabular-nums">{identities.data.length}</span>
            ) : (
              <Skeleton className="h-4 w-8" />
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">{PROFILE_DETAILS_MANAGE}</Link>
            </Button>
          </ProfileDetailRow>
        </dl>
      </CardContent>
    </Card>
  );
}
