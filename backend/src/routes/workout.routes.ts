import { Hono } from "hono";
import { createWorkout, createWorkoutWithExercises, deleteWorkout, getWorkout, getWorkouts, updateWorkout } from "../controllers/workout.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = new Hono()
  .get("/workouts", authMiddleware, getWorkouts)
  .get("/workouts/:id", authMiddleware, getWorkout)
  .post("/workouts", authMiddleware, createWorkout)
  .post("/workouts/with-exercises", authMiddleware, createWorkoutWithExercises)
  .put("/workouts/:id", authMiddleware, updateWorkout)
  .delete("/workouts/:id", authMiddleware, deleteWorkout);

export default router;

