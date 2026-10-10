import type { createDb } from "#db/db.helpers";

export type TDb = ReturnType<typeof createDb>;
