import { Hono } from "hono";
import { createLog, deleteLog, getExerciseHistory, getLogs, getLogsByQuery, updateLog } from "../controllers/log.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/logs", authMiddleware, generalRateLimiter, getLogs)
  .get("/logs/query", authMiddleware, generalRateLimiter, getLogsByQuery)
  .post("/logs", authMiddleware, generalRateLimiter, createLog)
  .patch("/logs/:id", authMiddleware, generalRateLimiter, updateLog)
  .delete("/logs/:id", authMiddleware, generalRateLimiter, deleteLog)
  .get("/logs/exercise/:id/history", authMiddleware, generalRateLimiter, getExerciseHistory);

export default router;

