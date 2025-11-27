import { Hono } from "hono";
import { createExercise, deleteExercise, getExercise, getExercises, updateExercise } from "../controllers/exercise.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = new Hono()
  .get("/exercises", authMiddleware, getExercises)
  .get("/exercises/:id", authMiddleware, getExercise)
  .post("/exercises", authMiddleware, createExercise)
  .put("/exercises/:id", authMiddleware, updateExercise)
  .delete("/exercises/:id", authMiddleware, deleteExercise);

export default router;

