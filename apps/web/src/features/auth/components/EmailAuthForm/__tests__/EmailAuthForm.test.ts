import { describe, expect, test } from "bun:test";

import { ApiError, apiErrorMessage } from "@/api/client/client.helpers";

const HTTP_BAD_REQUEST = 400;
const HTTP_BAD_GATEWAY = 502;

describe("apiErrorMessage", () => {
  test("returns the message field of a typed server error", () => {
    expect(
      apiErrorMessage(new ApiError(HTTP_BAD_REQUEST, { message: "Email or password is invalid" })),
    ).toBe("Email or password is invalid");
  });

  test("returns the server message when the value is a string", () => {
    expect(apiErrorMessage(new ApiError(HTTP_BAD_REQUEST, "Email or password is invalid"))).toBe(
      "Email or password is invalid",
    );
  });

  test("falls back when the value has no message", () => {
    expect(apiErrorMessage(new ApiError(HTTP_BAD_GATEWAY, { detail: "down" }))).toBe(
      "Request failed",
    );
  });

  test("falls back for non-api errors", () => {
    expect(apiErrorMessage(new Error("boom"))).toBe("Request failed");
    expect(apiErrorMessage(null)).toBe("Request failed");
  });
});
