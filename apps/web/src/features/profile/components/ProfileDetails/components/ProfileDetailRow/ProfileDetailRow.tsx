import type { IProfileDetailRowProps } from "@/features/profile/components/ProfileDetails/components/ProfileDetailRow/ProfileDetailRow.interfaces";

export function ProfileDetailRow({ label, children }: IProfileDetailRowProps) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="flex min-w-0 items-center gap-3 text-sm">{children}</dd>
    </div>
  );
}
