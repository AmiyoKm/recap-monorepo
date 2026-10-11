import { describe, expect, test } from "bun:test";

import { ECryptoMessages } from "#api/shared/crypto/crypto.enums";
import { decryptSecret, encryptSecret } from "#api/shared/crypto/crypto.helpers";

const KEY_BYTES = 32;
const FIRST_KEY_FILL = 7;
const SECOND_KEY_FILL = 9;
const SHORT_KEY_BYTES = 16;
const FIRST_TEST_KEY = Buffer.alloc(KEY_BYTES, FIRST_KEY_FILL).toString("base64");
const SECOND_TEST_KEY = Buffer.alloc(KEY_BYTES, SECOND_KEY_FILL).toString("base64");
const SHORT_TEST_KEY = Buffer.alloc(SHORT_KEY_BYTES, FIRST_KEY_FILL).toString("base64");
const PLAINTEXT_SECRET = "refresh-token-value";
const MALFORMED_PAYLOAD = "not-a-payload";

describe("connection secret encryption", () => {
  test("decrypts what it encrypts", () => {
    expect(decryptSecret(FIRST_TEST_KEY, encryptSecret(FIRST_TEST_KEY, PLAINTEXT_SECRET))).toBe(
      PLAINTEXT_SECRET,
    );
  });

  test("ciphertext carries a key version prefix and differs from plaintext", () => {
    const ciphertext = encryptSecret(FIRST_TEST_KEY, PLAINTEXT_SECRET);
    expect(ciphertext.startsWith("v1.")).toBe(true);
    expect(ciphertext).not.toContain(PLAINTEXT_SECRET);
  });

  test("same plaintext encrypts differently each time", () => {
    expect(encryptSecret(FIRST_TEST_KEY, PLAINTEXT_SECRET)).not.toBe(
      encryptSecret(FIRST_TEST_KEY, PLAINTEXT_SECRET),
    );
  });

  test("decrypt with another key fails", () => {
    const ciphertext = encryptSecret(FIRST_TEST_KEY, PLAINTEXT_SECRET);
    expect(() => decryptSecret(SECOND_TEST_KEY, ciphertext)).toThrow(
      ECryptoMessages.DECRYPT_FAILED,
    );
  });

  test("short key fails", () => {
    expect(() => encryptSecret(SHORT_TEST_KEY, PLAINTEXT_SECRET)).toThrow(
      ECryptoMessages.INVALID_KEY,
    );
  });

  test("malformed payload fails", () => {
    expect(() => decryptSecret(FIRST_TEST_KEY, MALFORMED_PAYLOAD)).toThrow(
      ECryptoMessages.INVALID_PAYLOAD,
    );
  });
});
