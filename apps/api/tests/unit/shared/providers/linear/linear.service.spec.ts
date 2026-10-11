import { afterEach, describe, expect, test } from "bun:test";

import { LinearService } from "#api/shared/providers/linear/linear.service";
import {
  HTTP_BAD_REQUEST,
  HTTP_OK,
  PROVIDER_EMAIL,
} from "#api-tests/unit/shared/providers/providers.constants";
import {
  recordedRequests,
  restoreFetch,
  stubFetch,
} from "#api-tests/unit/shared/providers/providers.fixtures";

afterEach(() => {
  restoreFetch();
});

describe("LinearService.verifyApiKey", () => {
  test("verifies the key with the viewer query", async () => {
    stubFetch(HTTP_OK, { data: { viewer: { id: "lin-1", email: PROVIDER_EMAIL } } });
    const account = await LinearService.verifyApiKey("linear-key");
    expect(account).toEqual({ accountId: "lin-1", accountEmail: PROVIDER_EMAIL });
    expect(recordedRequests[0]?.url).toBe("https://api.linear.app/graphql");
    expect(recordedRequests[0]?.headers.get("authorization")).toBe("linear-key");
  });

  test("returns no account for a rejected key", async () => {
    stubFetch(HTTP_BAD_REQUEST, {
      errors: [
        { message: "Authentication required", extensions: { type: "authentication error" } },
      ],
    });
    expect(await LinearService.verifyApiKey("bad-key")).toBeNull();
  });
});
