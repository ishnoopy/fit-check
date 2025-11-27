import { Hono } from "hono";
import { createPlan, deletePlan, getPlan, getPlans, updatePlan } from "../controllers/plan.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = new Hono()
  .get("/plans", authMiddleware, getPlans)
  .get("/plans/:id", authMiddleware, getPlan)
  .post("/plans", authMiddleware, createPlan)
  .put("/plans/:id", authMiddleware, updatePlan)
  .delete("/plans/:id", authMiddleware, deletePlan);

export default router;

