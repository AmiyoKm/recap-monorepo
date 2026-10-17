import type { schema } from "@recap/db";

import type {
  IConnectionGrant,
  IGrantVerifier,
  IIdentityCreateGrant,
} from "#api/modules/identity/identity.interfaces";
import type {
  authorizeResponse,
  connectBadRequestError,
  connectConnectionBody,
  connectionNotFoundError,
  connectionResponse,
  deleteResponse,
  identityNotFoundError,
  identityResponse,
  oauthCallbackQuery,
} from "#api/modules/identity/identity.model";

export type TIdentityRow = typeof schema.identity.$inferSelect;
export type TConnectionRow = typeof schema.connection.$inferSelect;
export type TIdentityInsert = typeof schema.identity.$inferInsert;
export type TConnectionInsert = typeof schema.connection.$inferInsert;
export type TPendingGrantInsert = typeof schema.pendingGrant.$inferInsert;
export type TConnectConnectionBody = typeof connectConnectionBody.static;
export type TOAuthCallbackQuery = typeof oauthCallbackQuery.static;
export type TConnectionResponse = typeof connectionResponse.static;
export type TIdentityResponse = typeof identityResponse.static;
export type TAuthorizeResponse = typeof authorizeResponse.static;
export type TDeleteResponse = typeof deleteResponse.static;
export type TIdentityNotFoundError = typeof identityNotFoundError.static;
export type TConnectionNotFoundError = typeof connectionNotFoundError.static;
export type TConnectBadRequestError = typeof connectBadRequestError.static;
export type TGrantRequest = IIdentityCreateGrant | IConnectionGrant;
export type TPendingGrant = TGrantRequest & IGrantVerifier;
export type TConnectionGrantTarget = Pick<IConnectionGrant, "identityId" | "provider" | "sources">;
