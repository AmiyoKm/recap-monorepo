import { EHealthStatus } from "#api/modules/health/health.enums";
import { HealthRepository } from "#api/modules/health/health.repository";

export abstract class HealthService {
  static async check() {
    await HealthRepository.pingDatabase();
    return { status: EHealthStatus.OK };
  }
}
