import { Hono } from "hono";
import {
  createWorkout,
  createWorkoutWithExercises,
  deleteWorkout,
  getWorkout,
  getWorkouts,
  reorderWorkoutExercises,
  updateWorkout,
} from "../controllers/workout.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/workouts", authMiddleware, generalRateLimiter, getWorkouts)
  .get("/workouts/:id", authMiddleware, generalRateLimiter, getWorkout)
  .post("/workouts", authMiddleware, generalRateLimiter, createWorkout)
  .post(
    "/workouts/with-exercises",
    authMiddleware,
    generalRateLimiter,
    createWorkoutWithExercises,
  )
  .patch("/workouts/:id", authMiddleware, generalRateLimiter, updateWorkout)
  .patch(
    "/workouts/:id/exercises/order",
    authMiddleware,
    generalRateLimiter,
    reorderWorkoutExercises,
  )
  .delete("/workouts/:id", authMiddleware, generalRateLimiter, deleteWorkout);

export default router;
