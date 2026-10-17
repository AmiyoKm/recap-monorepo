import { generateText, Output } from "ai";
import type { z } from "zod";

import { google } from "#api/shared/ai/ai.client";
import type { IAiObjectInput } from "#api/shared/ai/ai.interfaces";

export abstract class AiService {
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
