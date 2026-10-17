import { randomUUID } from "node:crypto";

import type { Account } from "better-auth";

import { EAuthMessages, EAuthSocialProvider } from "#api/shared/auth/auth.enums";
import { buildSignUpIdentityRow } from "#api/shared/auth/auth.helpers";
import { AuthRepository } from "#api/shared/auth/auth.repository";
import { logError } from "#api/shared/logger/logger.helpers";

export abstract class AuthService {
  static async handleAccountCreated(account: Account): Promise<void> {
    try {
      await AuthService.createSignUpIdentity(account);
    } catch (error) {
      logError(EAuthMessages.SIGN_UP_IDENTITY_FAILED, error);
    }
  }

  private static async createSignUpIdentity({
    providerId,
    userId,
    accountId,
  }: Account): Promise<void> {
    if (providerId !== EAuthSocialProvider.GOOGLE) {
      return;
    }
    if (await AuthRepository.hasIdentity(userId)) {
      return;
    }
    const profile = await AuthRepository.findUserProfile(userId);
    if (!profile) {
      return;
    }
    await AuthRepository.insertIdentity(
      buildSignUpIdentityRow({ id: randomUUID(), userId, googleSub: accountId, profile }),
    );
  }
}
