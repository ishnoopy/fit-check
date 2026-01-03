import { Hono } from "hono";
import { createSetting, deleteSetting, getSetting, updateSetting, upsertSetting } from "../controllers/setting.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
    .get("/settings", authMiddleware, generalRateLimiter, getSetting)
    .post("/settings", authMiddleware, generalRateLimiter, createSetting)
    .patch("/settings", authMiddleware, generalRateLimiter, updateSetting)
    .put("/settings", authMiddleware, generalRateLimiter, upsertSetting)
    .delete("/settings", authMiddleware, generalRateLimiter, deleteSetting);

export default router;

