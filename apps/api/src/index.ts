import { createApp } from "#api/app";
import { ENV } from "#api/shared/env/env.constants";

createApp().listen(ENV.port);

console.info(`API on http://localhost:${ENV.port}`);
