import { createDb } from "@recap/db";

import { bindings } from "#api/shared/bindings/bindings.client";

export const db = createDb(bindings.DB);
