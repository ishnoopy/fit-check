import { Hono } from "hono";
import {
  createPlan,
  deletePlan,
  getPlan,
  getPlans,
  updatePlan,
} from "../controllers/plan.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/plans", authMiddleware, generalRateLimiter, getPlans)
  .get("/plans/:id", authMiddleware, generalRateLimiter, getPlan)
  .post("/plans", authMiddleware, generalRateLimiter, createPlan)
  .patch("/plans/:id", authMiddleware, generalRateLimiter, updatePlan)
  .delete("/plans/:id", authMiddleware, generalRateLimiter, deletePlan);

export default router;
