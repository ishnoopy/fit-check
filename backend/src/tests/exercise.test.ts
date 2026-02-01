import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as exerciseRepo from "../repositories/exercise.repository.js";
import * as planRepo from "../repositories/plan.repository.js";
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
  createWorkout: vi.fn(),
  findById: vi.fn(),
  updateWorkout: vi.fn(),
}));

vi.mock("../repositories/plan.repository.js", () => ({
  findById: vi.fn(),
  updatePlan: vi.fn(),
}));
vi.mock("../repositories/exercise.repository.js", () => ({
  createExercises: vi.fn(),
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

  it("should create a new workout with exercises", async () => {
    (planRepo.findById as unknown as Mock).mockResolvedValue({
      id: "69629a7aaf3589c1ffd1cb23",
      name: "Beginner Plan",
      description: "A plan for beginners",
      userId: "6936810d0589536bab9e11b6",
      workouts: [],
    });
    (planRepo.updatePlan as unknown as Mock).mockResolvedValue({
      id: "69629a7aaf3589c1ffd1cb23",
      name: "Beginner Plan",
      description: "A plan for beginners",
      userId: "6936810d0589536bab9e11b6",
      workouts: ["69569612638765ff314bba69"],
    });

    (exerciseRepo.createExercises as unknown as Mock).mockResolvedValue([
      {
        id: "693681d70589536bab9e30bc",
        name: "Push Ups",
        description: "An upper body exercise",
        notes: "",
        restTime: 60,
        active: true,
        images: [],
        userId: "6936810d0589536bab9e11b6",
      },
      {
        id: "693681d70589536bab9e35gh",
        name: "Squats",
        description: "A lower body exercise",
        notes: "",
        restTime: 60,
        active: true,
        images: [],
        userId: "6936810d0589536bab9e11b6",
      },
    ]);

    (workoutRepo.createWorkout as unknown as Mock).mockResolvedValue({
      id: "69569612638765ff314bba69",
      name: "Morning Routine",
      description: "A quick morning workout",
      userId: "6936810d0589536bab9e11b6",
      exercises: [
        { exerciseId: "693681d70589536bab9e30bc", isActive: true },
        { exerciseId: "693681d70589536bab9e35gh", isActive: true },
      ],
    });

    const response = await app.request("/api/workouts/with-exercises", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "access_token=valid_token",
      },
      body: JSON.stringify({
        planId: "69629a7aaf3589c1ffd1cb23",
        title: "Morning Routine",
        description: "A quick morning workout",
        exercises: [
          {
            name: "Push Ups",
            description: "An upper body exercise",
            notes: "",
            restTime: 60,
            images: [],
          },
          {
            name: "Squats",
            description: "A lower body exercise",
            notes: "",
            restTime: 60,
            images: [],
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      data: {
        id: "69569612638765ff314bba69",
        name: "Morning Routine",
        description: "A quick morning workout",
        userId: "6936810d0589536bab9e11b6",
        exercises: [
          { exerciseId: "693681d70589536bab9e30bc", isActive: true },
          { exerciseId: "693681d70589536bab9e35gh", isActive: true },
        ],
      },
    });
  });
});

describe("PUT /api/workouts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update an existing workout", async () => {
    (planRepo.findById as unknown as Mock).mockResolvedValue({
      id: "69629a7aaf3589c1ffd1cb23",
      name: "Beginner Plan",
      description: "A plan for beginners",
      userId: "6936810d0589536bab9e11b6",
      workouts: [],
    });
    (planRepo.updatePlan as unknown as Mock).mockResolvedValue({
      id: "69629a7aaf3589c1ffd1cb23",
      name: "Beginner Plan",
      description: "A plan for beginners",
      userId: "6936810d0589536bab9e11b6",
      workouts: ["69569612638765ff314bba69"],
    });

    (workoutRepo.findById as unknown as Mock).mockResolvedValue({
      id: "69569612638765ff314bba69",
      title: "Morning Routine",
      description: "A quick morning workout",
      userId: "6936810d0589536bab9e11b6",
      planId: "69629a7aaf3589c1ffd1cb23",
      exercises: [
        { exerciseId: "693681d70589536bab9e30bc", isActive: true },
        { exerciseId: "693681d70589536bab9e35gh", isActive: true },
      ],
    });

    (workoutRepo.updateWorkout as unknown as Mock).mockResolvedValue({
      id: "69569612638765ff314bba69",
      title: "Updated Morning Routine",
      description: "An updated quick morning workout",
      userId: "6936810d0589536bab9e11b6",
      planId: "69629a7aaf3589c1ffd1cb23",
      exercises: [{ exerciseId: "693681d70589536bab9e30bc", isActive: true }],
    });

    const response = await app.request(
      "/api/workouts/69569612638765ff314bba69",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: "access_token=valid_token",
        },
        body: JSON.stringify({
          planId: "69629a7aaf3589c1ffd1cb23",
          title: "Updated Morning Routine",
          description: "An updated quick morning workout",
          exercises: [
            { exerciseId: "693681d70589536bab9e30bc", isActive: true },
          ],
        }),
      },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      data: {
        id: "69569612638765ff314bba69",
        title: "Updated Morning Routine",
        description: "An updated quick morning workout",
        userId: "6936810d0589536bab9e11b6",
        planId: "69629a7aaf3589c1ffd1cb23",
        exercises: [{ exerciseId: "693681d70589536bab9e30bc", isActive: true }],
      },
    });
  });
});
