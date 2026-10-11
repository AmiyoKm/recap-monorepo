import type { schema } from "@recap/db";

import type {
  IConnectionGrant,
  IGrantVerifier,
  IIdentityCreateGrant,
  IJiraApiKey,
  ILinearApiKey,
} from "#api/modules/identity/identity.interfaces";
import type {
  apiKeyValidationError,
  authorizeResponse,
  connectBadRequestError,
  connectConnectionBody,
  connectionExistsError,
  connectionNotFoundError,
  connectionResponse,
  deleteResponse,
  googleCallbackQuery,
  identityNotFoundError,
  identityResponse,
} from "#api/modules/identity/identity.model";

export type TIdentityRow = typeof schema.identity.$inferSelect;
export type TConnectionRow = typeof schema.connection.$inferSelect;
export type TIdentityInsert = typeof schema.identity.$inferInsert;
export type TConnectionInsert = typeof schema.connection.$inferInsert;
export type TConnectConnectionBody = typeof connectConnectionBody.static;
export type TGoogleCallbackQuery = typeof googleCallbackQuery.static;
export type TConnectionResponse = typeof connectionResponse.static;
export type TIdentityResponse = typeof identityResponse.static;
export type TAuthorizeResponse = typeof authorizeResponse.static;
export type TDeleteResponse = typeof deleteResponse.static;
export type TIdentityNotFoundError = typeof identityNotFoundError.static;
export type TConnectionNotFoundError = typeof connectionNotFoundError.static;
export type TConnectBadRequestError = typeof connectBadRequestError.static;
export type TConnectionExistsError = typeof connectionExistsError.static;
export type TApiKeyValidationError = typeof apiKeyValidationError.static;
export type TApiKey = IJiraApiKey | ILinearApiKey;
export type TGrantRequest = IIdentityCreateGrant | IConnectionGrant;
export type TPendingGrant = TGrantRequest & IGrantVerifier;
