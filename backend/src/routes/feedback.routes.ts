import { Hono } from "hono";
import {
  createFeedback,
  getMyFeedback,
} from "../controllers/feedback.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/feedbacks", authMiddleware, generalRateLimiter, getMyFeedback)
  .post("/feedbacks", authMiddleware, generalRateLimiter, createFeedback);

export default router;
