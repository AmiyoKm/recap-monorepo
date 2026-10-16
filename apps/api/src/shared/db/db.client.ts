import { createDb } from "@recap/db";

import { bindings } from "#api/shared/bindings/bindings.client";
import { deferD1Database } from "#api/shared/db/db.helpers";

export const db = createDb(deferD1Database(() => bindings.DB));
