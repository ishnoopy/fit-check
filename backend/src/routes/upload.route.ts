import { Hono } from "hono";
import {
  deleteFile,
  serveMedia,
  uploadFile,
} from "../controllers/upload.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .post("/upload", authMiddleware, generalRateLimiter, uploadFile)
  .get("/media/*", serveMedia)
  .delete("/upload/delete/:key", authMiddleware, generalRateLimiter, deleteFile);

export default router;
