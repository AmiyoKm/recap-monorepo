import type { QueryClient } from "@tanstack/react-query";

export interface IRouterContext {
  queryClient: QueryClient;
}

export interface IConnectResultSearch {
  connected?: string;
  email?: string;
  error?: string;
}

export interface ISignInSearch {
  error?: string;
  mode?: string;
}
