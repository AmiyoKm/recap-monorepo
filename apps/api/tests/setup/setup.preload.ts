import { afterAll, mock } from "bun:test";

import { getPlatformProxy } from "wrangler";

const platform = await getPlatformProxy<Cloudflare.Env>({
  environment: "dev",
  remoteBindings: false,
  persist: { path: `${import.meta.dir}/../../.wrangler/test-state/v3` },
});

mock.module("cloudflare:workers", () => ({ env: platform.env }));

afterAll(async () => {
  await platform.dispose();
});
