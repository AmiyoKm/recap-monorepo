import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";
import { type ApiError, ensureOk } from "@/api/client/client.helpers";
import { DIGEST_NOT_FOUND_STATUS, DIGEST_RETRY_LIMIT } from "@/api/digest/digest.constants";
import {
  detailRefetchInterval,
  listRefetchInterval,
  msUntilNextRun,
} from "@/api/digest/digest.helpers";
import { digestKeys } from "@/api/digest/digest.keys";
import type {
  TDigestData,
  TDigestError,
  TDigestListData,
  TDigestListError,
  TDigestSettingsData,
  TDigestSettingsError,
} from "@/api/digest/digest.types";

function digestSettingsQueryOptions() {
  return queryOptions<TDigestSettingsData, ApiError<TDigestSettingsError>>({
    queryKey: digestKeys.settings(),
    queryFn: () => ensureOk(api["digest-settings"].get()),
    refetchInterval: (query) => msUntilNextRun(query.state.data?.nextRunAt),
  });
}

export function useDigestSettingsQuery() {
  return useQuery(digestSettingsQueryOptions());
}

function digestListQueryOptions(settings: TDigestSettingsData | undefined) {
  return queryOptions<TDigestListData, ApiError<TDigestListError>>({
    queryKey: digestKeys.list(),
    queryFn: () => ensureOk(api.digests.get()),
    refetchInterval: () => listRefetchInterval(settings),
  });
}

function digestQueryOptions(date: string, nextRunAt: string | undefined) {
  return queryOptions<TDigestData, ApiError<TDigestError>>({
    queryKey: digestKeys.detail(date),
    queryFn: () => ensureOk(api.digests({ date }).get()),
    retry: (failureCount, error) =>
      error.status !== DIGEST_NOT_FOUND_STATUS && failureCount < DIGEST_RETRY_LIMIT,
    refetchInterval: (query) => detailRefetchInterval(query.state.data?.status, nextRunAt),
  });
}

export function useDigestListQuery() {
  const settings = useDigestSettingsQuery();
  return useQuery(digestListQueryOptions(settings.data));
}

export function useDigestQuery(date: string | undefined) {
  const settings = useDigestSettingsQuery();
  return useQuery({
    ...digestQueryOptions(date ?? "", settings.data?.nextRunAt),
    enabled: date !== undefined,
  });
}
