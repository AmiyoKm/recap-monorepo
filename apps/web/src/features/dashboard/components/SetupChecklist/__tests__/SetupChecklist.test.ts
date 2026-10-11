import { describe, expect, test } from "bun:test";

import type { TIdentity } from "@/api/identity/identity.types";
import {
  buildSetupSteps,
  completedPercent,
} from "@/features/dashboard/components/SetupChecklist/SetupChecklist.helpers";
import { ESetupStep } from "@/features/dashboard/dashboard.enums";

const IDENTITY: TIdentity = {
  id: "identity-1",
  email: "ada@work.example",
  displayName: "Ada",
  avatarUrl: null,
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
  connections: [],
};

describe("buildSetupSteps", () => {
  test("marks only the account step done for a new user", () => {
    const steps = buildSetupSteps([]);
    expect(steps.map((step) => step.done)).toEqual([true, false, false, false]);
    expect(steps.find((step) => step.step === ESetupStep.CONNECTION)?.available).toBe(false);
  });

  test("opens the connection step once an identity exists", () => {
    const steps = buildSetupSteps([IDENTITY]);
    expect(steps.find((step) => step.step === ESetupStep.IDENTITY)?.done).toBe(true);
    expect(steps.find((step) => step.step === ESetupStep.CONNECTION)?.available).toBe(true);
  });

  test("never marks the AI key step available", () => {
    const steps = buildSetupSteps([IDENTITY]);
    expect(steps.find((step) => step.step === ESetupStep.AI_KEY)?.available).toBe(false);
  });
});

describe("completedPercent", () => {
  test("rounds the share of done steps", () => {
    const oneOfFour = 25;
    const twoOfFour = 50;
    expect(completedPercent(buildSetupSteps([]))).toBe(oneOfFour);
    expect(completedPercent(buildSetupSteps([IDENTITY]))).toBe(twoOfFour);
    expect(completedPercent([])).toBe(0);
  });
});
