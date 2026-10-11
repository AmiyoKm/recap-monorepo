import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import {
  AES_256_GCM_CIPHER,
  AES_256_GCM_KEY_BYTES,
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  CURRENT_CRYPTO_KEY_VERSION,
  ENCRYPTED_PAYLOAD_PARTS,
} from "#api/shared/crypto/crypto.constants";
import { ECryptoMessages } from "#api/shared/crypto/crypto.enums";

function parseKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== AES_256_GCM_KEY_BYTES) {
    throw new Error(ECryptoMessages.INVALID_KEY, { cause: rawKey.length });
  }
  return key;
}

export function encryptSecret(rawKey: string, plaintext: string): string {
  const key = parseKey(rawKey);
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv(AES_256_GCM_CIPHER, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([ciphertext, cipher.getAuthTag()]).toString("base64");
  return `${CURRENT_CRYPTO_KEY_VERSION}.${iv.toString("base64")}.${payload}`;
}

export function decryptSecret(rawKey: string, stored: string): string {
  const key = parseKey(rawKey);
  const parts = stored.split(".");
  if (parts.length !== ENCRYPTED_PAYLOAD_PARTS) {
    throw new Error(ECryptoMessages.INVALID_PAYLOAD);
  }
  const [version, ivText, payloadText] = parts;
  if (version !== CURRENT_CRYPTO_KEY_VERSION) {
    throw new Error(ECryptoMessages.UNSUPPORTED_VERSION, { cause: version });
  }
  if (!(ivText && payloadText)) {
    throw new Error(ECryptoMessages.INVALID_PAYLOAD);
  }
  const iv = Buffer.from(ivText, "base64");
  const payload = Buffer.from(payloadText, "base64");
  const tagStart = payload.length - AES_GCM_TAG_BYTES;
  if (iv.length !== AES_GCM_IV_BYTES || tagStart <= 0) {
    throw new Error(ECryptoMessages.INVALID_PAYLOAD);
  }
  try {
    const decipher = createDecipheriv(AES_256_GCM_CIPHER, key, iv);
    decipher.setAuthTag(payload.subarray(tagStart));
    const plaintext = Buffer.concat([
      decipher.update(payload.subarray(0, tagStart)),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.message === ECryptoMessages.INVALID_PAYLOAD) {
      throw error;
    }
    throw new Error(ECryptoMessages.DECRYPT_FAILED, { cause: error });
  }
}
