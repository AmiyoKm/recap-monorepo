import { Elysia } from "elysia";

import { unauthorizedError } from "#api/modules/auth/auth.model";
import { authModule } from "#api/modules/auth/auth.module";
import {
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
  });
