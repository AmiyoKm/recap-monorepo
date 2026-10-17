import { Elysia, t } from "elysia";

import { unauthorizedError } from "#api/modules/auth/auth.model";
import { authModule } from "#api/modules/auth/auth.module";
import { EOAuthCallback } from "#api/modules/identity/identity.enums";
import {
  authorizeResponse,
  connectBadRequestError,
  connectConnectionBody,
  connectionIdParams,
  connectionNotFoundError,
  deleteResponse,
  identityIdParams,
  identityListResponse,
  identityNotFoundError,
  oauthCallbackQuery,
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
    ({ user, params, body }) =>
      IdentityService.startConnection(user.id, params.identityId, body.provider),
    {
      auth: true,
      params: identityIdParams,
      body: connectConnectionBody,
      response: {
        200: authorizeResponse,
        400: connectBadRequestError,
        401: unauthorizedError,
        404: identityNotFoundError,
      },
    },
  )
  .get(
    ROUTES.API.GOOGLE_CALLBACK,
    async ({ query, redirect }) =>
      redirect(await IdentityService.completeCallback(EOAuthCallback.GOOGLE, query)),
    { query: oauthCallbackQuery, response: { 302: t.Void() } },
  )
  .get(
    ROUTES.API.JIRA_CALLBACK,
    async ({ query, redirect }) =>
      redirect(await IdentityService.completeCallback(EOAuthCallback.JIRA, query)),
    { query: oauthCallbackQuery, response: { 302: t.Void() } },
  )
  .get(
    ROUTES.API.LINEAR_CALLBACK,
    async ({ query, redirect }) =>
      redirect(await IdentityService.completeCallback(EOAuthCallback.LINEAR, query)),
    { query: oauthCallbackQuery, response: { 302: t.Void() } },
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
