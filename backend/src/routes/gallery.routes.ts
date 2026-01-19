import { Hono } from "hono";
import { deleteGalleryImage, getGalleryImages } from "../controllers/gallery.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { generalRateLimiter } from "../middlewares/rate-limiter.middleware.js";

const router = new Hono()
  .get("/gallery", authMiddleware, generalRateLimiter, getGalleryImages)
  .delete("/gallery/:id", authMiddleware, generalRateLimiter, deleteGalleryImage);

export default router;
