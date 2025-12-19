import { Hono } from "hono";
import { createUser, deleteUser, getUser, getUsers, updateUser } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { guardMiddleware } from "../middlewares/guard.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono().
  get("/users", authMiddleware, guardMiddleware(["admin"]), generalRateLimiter, getUsers).
  get("/users/:id", authMiddleware, generalRateLimiter, getUser).
  post("/users", authMiddleware, generalRateLimiter, createUser).
  put("/users/:id", authMiddleware, generalRateLimiter, updateUser).
  delete("/users/:id", authMiddleware, generalRateLimiter, deleteUser);

export default router;
