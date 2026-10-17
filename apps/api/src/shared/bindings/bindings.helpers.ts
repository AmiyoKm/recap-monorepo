import { EBinding, EBindingsMessages } from "#api/shared/bindings/bindings.enums";
import type { IBindings } from "#api/shared/bindings/bindings.interfaces";

function requireBinding<TBinding>(name: EBinding, value: TBinding | undefined): TBinding {
  if (!value) {
    throw new Error(EBindingsMessages.MISSING_BINDING, { cause: name });
  }
  return value;
}

export function readBindings(env: Cloudflare.Env): IBindings {
  return {
    get DB() {
      return requireBinding(EBinding.DB, env.DB);
    },
    get CACHE() {
      return requireBinding(EBinding.CACHE, env.CACHE);
    },
    get PULL_QUEUE() {
      return requireBinding(EBinding.PULL_QUEUE, env.PULL_QUEUE);
    },
    get DIGEST_WORKFLOW() {
      return requireBinding(EBinding.DIGEST_WORKFLOW, env.DIGEST_WORKFLOW);
    },
  };
}
