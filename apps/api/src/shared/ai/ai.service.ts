import { embedMany, generateText, Output } from "ai";
import type { z } from "zod";

import { google } from "#api/shared/ai/ai.client";
import type { IAiEmbedManyInput, IAiObjectInput } from "#api/shared/ai/ai.interfaces";

export abstract class AiService {
  static async embedMany(input: IAiEmbedManyInput): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: google.embedding(input.model),
      values: input.values,
      providerOptions: { google: { outputDimensionality: input.dimensions } },
    });
    return embeddings;
  }

  static async generateObject<TSchema extends z.ZodType>(
    input: IAiObjectInput<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const { output } = await generateText({
      model: google(input.model),
      system: input.system,
      prompt: input.prompt,
      output: Output.object({ schema: input.schema }),
    });
    return input.schema.parse(output);
  }
}
