import { Hono } from "hono";
import {
  createExercise,
  deleteExercise,
  getExercise,
  getExercises,
  updateExercise,
} from "../controllers/exercise.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/exercises", authMiddleware, generalRateLimiter, getExercises)
  .get("/exercises/:id", authMiddleware, generalRateLimiter, getExercise)
  .post("/exercises", authMiddleware, generalRateLimiter, createExercise)
  .patch("/exercises/:id", authMiddleware, generalRateLimiter, updateExercise)
  .delete("/exercises/:id", authMiddleware, generalRateLimiter, deleteExercise);

export default router;
