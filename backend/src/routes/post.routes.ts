import { Hono } from "hono";
import {
  createPost,
  getFeed,
  togglePostHeart,
} from "../controllers/post.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/posts/feed", authMiddleware, generalRateLimiter, getFeed)
  .post("/posts", authMiddleware, generalRateLimiter, createPost)
  .patch("/posts/:id/heart", authMiddleware, generalRateLimiter, togglePostHeart);

export default router;
