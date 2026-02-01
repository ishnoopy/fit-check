import { Hono } from "hono";
import {
  createFileUpload,
  deleteFile,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
} from "../controllers/upload.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .post(
    "/upload/presign",
    authMiddleware,
    generalRateLimiter,
    generatePresignedUploadUrl,
  )
  .get(
    "/upload/download/:key",
    authMiddleware,
    generalRateLimiter,
    generatePresignedDownloadUrl,
  )
  .delete("/upload/delete/:key", authMiddleware, generalRateLimiter, deleteFile)
  .post("/upload/files", authMiddleware, generalRateLimiter, createFileUpload);

export default router;
