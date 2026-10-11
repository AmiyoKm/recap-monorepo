import type { TIdentity } from "@/api/identity/identity.types";

export interface ISourceMapProps {
  identities: TIdentity[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}
