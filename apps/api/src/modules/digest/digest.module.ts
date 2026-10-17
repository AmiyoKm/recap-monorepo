import { Elysia } from "elysia";

import { unauthorizedError } from "#api/modules/auth/auth.model";
import { authModule } from "#api/modules/auth/auth.module";
import {
  digestDateParams,
  digestInProgressError,
  digestListResponse,
  digestNotFoundError,
  digestResponse,
  digestSettingsBody,
  digestSettingsResponse,
  digestTimeZoneError,
} from "#api/modules/digest/digest.model";
import { DigestService } from "#api/modules/digest/digest.service";

export const digestModule = new Elysia({ name: "digest" })
  .use(authModule)
  .get("/digest-settings", ({ user }) => DigestService.getSettings(user.id), {
    auth: true,
    response: { 200: digestSettingsResponse, 401: unauthorizedError },
  })
  .put("/digest-settings", ({ user, body }) => DigestService.updateSettings(user.id, body), {
    auth: true,
    body: digestSettingsBody,
    response: { 200: digestSettingsResponse, 400: digestTimeZoneError, 401: unauthorizedError },
  })
  .get("/digests", ({ user }) => DigestService.listDigests(user.id), {
    auth: true,
    response: { 200: digestListResponse, 401: unauthorizedError },
  })
  .get("/digests/:date", ({ user, params }) => DigestService.getDigest(user.id, params.date), {
    auth: true,
    params: digestDateParams,
    response: { 200: digestResponse, 401: unauthorizedError, 404: digestNotFoundError },
  })
  .post("/digests/regenerate", ({ user }) => DigestService.regenerate(user.id), {
    auth: true,
    response: { 200: digestResponse, 401: unauthorizedError, 409: digestInProgressError },
  });
