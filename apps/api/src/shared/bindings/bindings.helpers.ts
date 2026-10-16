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
    DB: requireBinding(EBinding.DB, env.DB),
    CACHE: requireBinding(EBinding.CACHE, env.CACHE),
  };
}
