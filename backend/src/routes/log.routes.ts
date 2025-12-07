import { Hono } from "hono";
import { createLog, deleteLog, getExerciseHistory, getLogs, getLogsByQuery, updateLog } from "../controllers/log.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = new Hono()
  .get("/logs", authMiddleware, getLogs)
  .get("/logs/query", authMiddleware, getLogsByQuery)
  .post("/logs", authMiddleware, createLog)
  .put("/logs/:id", authMiddleware, updateLog)
  .delete("/logs/:id", authMiddleware, deleteLog)
  .get("/logs/exercise/:id/history", authMiddleware, getExerciseHistory);

export default router;

