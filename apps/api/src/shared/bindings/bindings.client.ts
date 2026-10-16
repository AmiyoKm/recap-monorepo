import { env } from "cloudflare:workers";

import { readBindings } from "#api/shared/bindings/bindings.helpers";

export const bindings = readBindings(env);
