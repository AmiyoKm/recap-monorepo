import { EHealthStatus } from "#api/modules/health/health.enums";
import { HealthRepository } from "#api/modules/health/health.repository";
import { redis } from "#api/shared/redis/redis.client";
import { ERedisCommand } from "#api/shared/redis/redis.enums";

export abstract class HealthService {
  static async check() {
    await Promise.all([HealthRepository.pingDatabase(), redis.send(ERedisCommand.PING, [])]);
    return { status: EHealthStatus.OK };
  }
}
