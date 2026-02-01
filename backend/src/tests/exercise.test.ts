import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as workoutRepo from "../repositories/workout.repository.js";

vi.mock("jose", async () => {
  const actual = await vi.importActual<any>("jose");
  return {
    ...actual,
    jwtVerify: vi.fn().mockResolvedValue({
      payload: { id: "6936810d0589536bab9e11b6", role: "user" },
    }),
  };
});

vi.mock("../repositories/workout.repository.js", () => ({
  findAll: vi.fn(),
}));

import { app } from "../index.js";

describe("GET /api/workouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an empty array of workouts", async () => {
    (workoutRepo.findAll as unknown as Mock).mockResolvedValue([]);
    // Makes sure that findAll is being called in the service.
    const response = await app.request("/api/workouts", {
      headers: {
        cookie: "access_token=valid_token",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true, data: [] });
  });
});

describe("POST /api/workouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});
