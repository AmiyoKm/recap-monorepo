import type { api } from "@/api/client";
import type { TEdenData, TEdenError } from "@/api/client/client.types";

export type TDigestSettingsData = TEdenData<(typeof api)["digest-settings"]["get"]>;
export type TDigestSettingsError = TEdenError<(typeof api)["digest-settings"]["get"]>;
export type TUpdateDigestSettingsData = TEdenData<(typeof api)["digest-settings"]["put"]>;
export type TUpdateDigestSettingsError = TEdenError<(typeof api)["digest-settings"]["put"]>;
