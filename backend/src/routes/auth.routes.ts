import { Hono } from "hono";
import { completeProfile, googleOAuth, handleGoogleOAuthCallback, login, logout, me, refreshToken, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authRateLimiter, generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const routes = new Hono()
  .get("/auth/me", authMiddleware, generalRateLimiter, me)
  .post("/auth/login", authRateLimiter, login)
  .post("/auth/register", authRateLimiter, register)
  .put("/auth/complete-profile", authMiddleware, generalRateLimiter, completeProfile)
  .delete("/auth/logout", authMiddleware, generalRateLimiter, logout)
  .post("/auth/refresh", generalRateLimiter, refreshToken)

  // OAuth Routes - separate rate limiting
  .get("/auth/google", authRateLimiter, googleOAuth)
  .get("/auth/google/callback", authRateLimiter, handleGoogleOAuthCallback);

export default routes;
