import type { api } from "@/api/client";
import type { TEdenData, TEdenError } from "@/api/client/client.types";

export type TDigestSettingsData = TEdenData<(typeof api)["digest-settings"]["get"]>;
export type TDigestSettingsError = TEdenError<(typeof api)["digest-settings"]["get"]>;
export type TUpdateDigestSettingsData = TEdenData<(typeof api)["digest-settings"]["put"]>;
export type TUpdateDigestSettingsError = TEdenError<(typeof api)["digest-settings"]["put"]>;
export type TDigestListData = TEdenData<(typeof api)["digests"]["get"]>;
export type TDigestListError = TEdenError<(typeof api)["digests"]["get"]>;
export type TDigestData = TEdenData<ReturnType<(typeof api)["digests"]>["get"]>;
export type TDigestError = TEdenError<ReturnType<(typeof api)["digests"]>["get"]>;
export type TRegenerateDigestData = TEdenData<(typeof api)["digests"]["regenerate"]["post"]>;
export type TRegenerateDigestError = TEdenError<(typeof api)["digests"]["regenerate"]["post"]>;
export type TDigestSection = NonNullable<TDigestData["content"]>["sections"][number];
export type TDigestItem = TDigestSection["highlights"][number];
export type TDigestMissingSource = TDigestData["missingSources"][number];
