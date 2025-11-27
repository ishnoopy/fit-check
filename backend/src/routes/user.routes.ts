import { Hono } from "hono";
import { getUsers, getUser, createUser, updateUser, deleteUser } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { guardMiddleware } from "../middlewares/guard.middleware.js";
const router = new Hono().
  get("/users", authMiddleware, guardMiddleware(["admin"]),  getUsers).
  get("/users/:id", authMiddleware, getUser).
  post("/users", authMiddleware, createUser).
  put("/users/:id", authMiddleware, updateUser).
  delete("/users/:id", authMiddleware, deleteUser);

export default router;