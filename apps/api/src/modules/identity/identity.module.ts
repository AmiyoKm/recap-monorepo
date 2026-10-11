import { Elysia, redirect } from "elysia";

import {
  GOOGLE_CALLBACK_PATH,
  HTTP_BAD_REQUEST_STATUS,
  HTTP_NOT_FOUND_STATUS,
} from "#api/modules/identity/identity.constants";
import { EIdentityMessages } from "#api/modules/identity/identity.enums";
import { apiKeyConnectFailure } from "#api/modules/identity/identity.helpers";
import type { IIdentityDeps } from "#api/modules/identity/identity.interfaces";
import {
  connectConnectionBody,
  connectionIdParams,
  googleCallbackQuery,
  identityIdParams,
} from "#api/modules/identity/identity.model";
import {
  completeGoogleCallback,
  connectApiKeyConnection,
  deleteConnection,
  deleteIdentity,
  listIdentities,
  startConnection,
  startIdentityConnect,
} from "#api/modules/identity/identity.service";
import { fetchSessionUser } from "#api/shared/session/session.helpers";

export function identityModule(deps: IIdentityDeps) {
  return new Elysia({ name: "identity" })
    .macro({
      auth: {
        async resolve({ status, request: { headers } }) {
          const user = await fetchSessionUser(deps.sessionProvider, headers);
          if (!user) {
            return status("Unauthorized");
          }
          return { user };
        },
      },
    })
    .get("/identities", ({ user }) => listIdentities(deps, user.id), { auth: true })
    .post("/identities/connect", ({ user }) => startIdentityConnect(deps, user.id), {
      auth: true,
    })
    .post(
      "/identities/:identityId/connections",
      async ({ user, params, body, status }) => {
        if (body.apiKey !== undefined) {
          try {
            return await connectApiKeyConnection(
              deps,
              user.id,
              params.identityId,
              body.provider,
              body.apiKey,
            );
          } catch (error) {
            const failure = apiKeyConnectFailure(error);
            if (!failure) {
              throw error;
            }
            return status(failure.code, failure.message);
          }
        }
        const result = await startConnection(deps, user.id, params.identityId, body.provider);
        if ("error" in result) {
          if (result.error === EIdentityMessages.IDENTITY_NOT_FOUND) {
            return status(HTTP_NOT_FOUND_STATUS, result.error);
          }
          return status(HTTP_BAD_REQUEST_STATUS, result.error);
        }
        return { authorizeUrl: result.authorizeUrl };
      },
      { auth: true, params: identityIdParams, body: connectConnectionBody },
    )
    .get(
      GOOGLE_CALLBACK_PATH,
      async ({ query }) => redirect((await completeGoogleCallback(deps, query)).redirectUrl),
      { query: googleCallbackQuery },
    )
    .delete(
      "/identities/:identityId",
      async ({ user, params, status }) => {
        const removed = await deleteIdentity(deps, user.id, params.identityId);
        if (!removed) {
          return status(HTTP_NOT_FOUND_STATUS, EIdentityMessages.IDENTITY_NOT_FOUND);
        }
        return { deleted: true };
      },
      { auth: true, params: identityIdParams },
    )
    .delete(
      "/connections/:connectionId",
      async ({ user, params, status }) => {
        const removed = await deleteConnection(deps, user.id, params.connectionId);
        if (!removed) {
          return status(HTTP_NOT_FOUND_STATUS, EIdentityMessages.CONNECTION_NOT_FOUND);
        }
        return { deleted: true };
      },
      { auth: true, params: connectionIdParams },
    );
}
