import type { z } from "zod";

export interface IAiObjectInput<TSchema extends z.ZodType> {
  model: string;
  system: string;
  prompt: string;
  schema: TSchema;
}
