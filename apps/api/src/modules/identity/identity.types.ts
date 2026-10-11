import type { schema } from "@recap/db";

export type TIdentityRow = typeof schema.identity.$inferSelect;
export type TConnectionRow = typeof schema.connection.$inferSelect;
