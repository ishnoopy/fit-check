import { Hono } from "hono";
import { completeProfile, googleOAuth, handleGoogleOAuthCallback, login, logout, me, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const routes = new Hono().
  get("/auth/me", authMiddleware, me).
  post("/auth/login", login).
  post("/auth/register", register).
  put("/auth/complete-profile", authMiddleware, completeProfile).
  delete("/auth/logout", authMiddleware, logout).

  // OAuth Routes
  get("/auth/google", googleOAuth).
  get("/auth/google/callback", handleGoogleOAuthCallback);


export default routes;
