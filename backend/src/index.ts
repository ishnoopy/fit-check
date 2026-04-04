import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dbConnect from "./lib/database.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import {
  closeRedisConnection,
  connectRateLimiterRedis,
} from "./middlewares/rate-limiter.middleware.js";
import routes from "./routes/index.js";

const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "FRONTEND_URL",
  "AWS_S3_BUCKET_NAME",
  "DB_URL",
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const app = new Hono();

// Connect to the database
dbConnect();
void connectRateLimiterRedis().catch((error) => {
  console.error("Rate limiter Redis connection failed:", error);
});

const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.1.2:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposeHeaders: ["Retry-After"],
  }),
);

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});

// Logger middleware
app.use(loggerMiddleware);

// Error middleware
app.onError(errorMiddleware);

for (const route of routes) {
  app.route("/api/", route);
}

app.get("/api/health", (c) => c.json({ message: "API is running" }));

const port = process.env.PORT || 4000;
console.log(`Server is running on http://localhost:${port}`);

const shutdown = async () => {
  await closeRedisConnection();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

if (!import.meta.vitest) {
  console.log("Starting server...");
  serve({
    fetch: app.fetch,
    port: parseInt(port as string),
  });
}
