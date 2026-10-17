import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { ENV } from "#api/shared/env/env.constants";

export const google = createGoogleGenerativeAI({ apiKey: ENV.ai.googleApiKey });
