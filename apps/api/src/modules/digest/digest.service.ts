import { status } from "elysia";

import { DEFAULT_DIGEST_TIME_ZONE } from "#api/modules/digest/digest.constants";
import { EDigestMessages } from "#api/modules/digest/digest.enums";
import { isSupportedTimeZone, nextDigestRunAt } from "#api/modules/digest/digest.helpers";
import { DigestRepository } from "#api/modules/digest/digest.repository";
import type {
  TDigestSettingsBody,
  TDigestSettingsResponse,
  TDigestTimeZoneError,
} from "#api/modules/digest/digest.types";
import { dayjs } from "#api/shared/date/date.helpers";

export abstract class DigestService {
  static async getSettings(userId: string): Promise<TDigestSettingsResponse> {
    const setting = await DigestRepository.findSetting(userId);
    const timeZone = setting?.timeZone ?? DEFAULT_DIGEST_TIME_ZONE;
    return { timeZone, nextRunAt: nextDigestRunAt(dayjs().toISOString(), timeZone) };
  }

  static async updateSettings(
    userId: string,
    body: TDigestSettingsBody,
  ): Promise<TDigestSettingsResponse> {
    if (!isSupportedTimeZone(body.timeZone)) {
      throw status("Bad Request", {
        message: EDigestMessages.TIME_ZONE_INVALID,
      } satisfies TDigestTimeZoneError);
    }
    await DigestRepository.upsertSetting(userId, body.timeZone);
    return {
      timeZone: body.timeZone,
      nextRunAt: nextDigestRunAt(dayjs().toISOString(), body.timeZone),
    };
  }
}
