import { Hono } from "hono";
import {
  establishBuddy,
  endBuddy,
  getBuddyDetail,
  getNudgeStatus,
  listBuddies,
  sendNudge,
} from "../controllers/buddy.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .post("/buddies", authMiddleware, generalRateLimiter, establishBuddy)
  .get("/buddies", authMiddleware, generalRateLimiter, listBuddies)
  .get("/buddies/:id", authMiddleware, generalRateLimiter, getBuddyDetail)
  .delete("/buddies/:id", authMiddleware, generalRateLimiter, endBuddy)
  .post("/buddies/:id/nudge", authMiddleware, generalRateLimiter, sendNudge)
  .get(
    "/buddies/:id/nudge-status",
    authMiddleware,
    generalRateLimiter,
    getNudgeStatus,
  );

export default router;
