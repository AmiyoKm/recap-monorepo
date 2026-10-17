import type { api } from "@/api/client";

type TEdenResponse<TRequest extends (...args: never[]) => Promise<object>> = Awaited<
  ReturnType<TRequest>
>;

export type TActivitiesData = NonNullable<TEdenResponse<typeof api.activities.get>["data"]>;
export type TActivitiesError = NonNullable<TEdenResponse<typeof api.activities.get>["error"]>;
export type TActivityRow = TActivitiesData["rows"][number];
