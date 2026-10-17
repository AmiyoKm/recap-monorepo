import type { TAuthUserProfile } from "#api/shared/auth/auth.types";

export interface ISignUpIdentityInput {
  id: string;
  userId: string;
  googleSub: string;
  profile: TAuthUserProfile;
}
