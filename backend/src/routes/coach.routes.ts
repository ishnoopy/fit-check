import { Hono } from "hono";
import { chat, getQuota } from "../controllers/coach.controller.js";
import {
  deleteConversation,
  getConversation,
  getConversations,
} from "../controllers/conversation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  generalRateLimiter,
  moderateRateLimiter,
} from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/coach/quota", authMiddleware, generalRateLimiter, getQuota)
  .post("/coach/chat", authMiddleware, moderateRateLimiter, chat)
  .get(
    "/coach/conversations",
    authMiddleware,
    generalRateLimiter,
    getConversations,
  )
  .get(
    "/coach/conversations/:id",
    authMiddleware,
    generalRateLimiter,
    getConversation,
  )
  .delete(
    "/coach/conversations/:id",
    authMiddleware,
    generalRateLimiter,
    deleteConversation,
  );

export default router;
