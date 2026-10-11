import { Elysia, t } from "elysia";

import { unauthorizedError } from "#api/modules/auth/auth.model";
import { authModule } from "#api/modules/auth/auth.module";
import {
  apiKeyValidationError,
  authorizeResponse,
  connectBadRequestError,
  connectConnectionBody,
  connectConnectionResponse,
  connectionExistsError,
  connectionIdParams,
  connectionNotFoundError,
  deleteResponse,
  googleCallbackQuery,
  identityIdParams,
  identityListResponse,
  identityNotFoundError,
} from "#api/modules/identity/identity.model";
import { IdentityService } from "#api/modules/identity/identity.service";
import { ROUTES } from "#api/shared/routes/routes.constants";

export const identityModule = new Elysia({ name: "identity" })
  .use(authModule)
  .get("/identities", ({ user }) => IdentityService.listIdentities(user.id), {
    auth: true,
    response: { 200: identityListResponse, 401: unauthorizedError },
  })
  .post("/identities/connect", ({ user }) => IdentityService.startIdentityConnect(user.id), {
    auth: true,
    response: { 200: authorizeResponse, 401: unauthorizedError },
  })
  .post(
    "/identities/:identityId/connections",
    ({ user, params, body }) => IdentityService.connect(user.id, params.identityId, body),
    {
      auth: true,
      params: identityIdParams,
      body: connectConnectionBody,
      response: {
        200: connectConnectionResponse,
        400: connectBadRequestError,
        401: unauthorizedError,
        404: identityNotFoundError,
        409: connectionExistsError,
        502: apiKeyValidationError,
      },
    },
  )
  .get(
    ROUTES.API.GOOGLE_CALLBACK,
    async ({ query, redirect }) => redirect(await IdentityService.completeGoogleCallback(query)),
    { query: googleCallbackQuery, response: { 302: t.Void() } },
  )
  .delete(
    "/identities/:identityId",
    ({ user, params }) => IdentityService.deleteIdentity(user.id, params.identityId),
    {
      auth: true,
      params: identityIdParams,
      response: {
        200: deleteResponse,
        401: unauthorizedError,
        404: identityNotFoundError,
      },
    },
  )
  .delete(
    "/connections/:connectionId",
    ({ user, params }) => IdentityService.deleteConnection(user.id, params.connectionId),
    {
      auth: true,
      params: connectionIdParams,
      response: {
        200: deleteResponse,
        401: unauthorizedError,
        404: connectionNotFoundError,
      },
    },
  );
