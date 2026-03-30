import { Hono } from "hono";
import {
  createUser,
  deleteUser,
  followUser,
  getFollowers,
  getFollowing,
  getPublicProfile,
  getUser,
  getUsers,
  updateMyAvatar,
  unfollowUser,
  updateUser,
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { guardMiddleware } from "../middlewares/guard.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get(
    "/users/:username/profile",
    authMiddleware,
    generalRateLimiter,
    getPublicProfile,
  )
  .post(
    "/users/:username/follow",
    authMiddleware,
    generalRateLimiter,
    followUser,
  )
  .delete(
    "/users/:username/follow",
    authMiddleware,
    generalRateLimiter,
    unfollowUser,
  )
  .get(
    "/users/:username/followers",
    authMiddleware,
    generalRateLimiter,
    getFollowers,
  )
  .get(
    "/users/:username/following",
    authMiddleware,
    generalRateLimiter,
    getFollowing,
  )
  .patch(
    "/users/me/avatar",
    authMiddleware,
    generalRateLimiter,
    updateMyAvatar,
  )
  .get(
    "/users",
    authMiddleware,
    guardMiddleware(["admin"]),
    generalRateLimiter,
    getUsers,
  )
  .get("/users/:id", authMiddleware, generalRateLimiter, getUser)
  .post("/users", authMiddleware, generalRateLimiter, createUser)
  .put("/users/:id", authMiddleware, generalRateLimiter, updateUser)
  .delete("/users/:id", authMiddleware, generalRateLimiter, deleteUser);

export default router;
