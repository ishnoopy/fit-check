import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import dbConnect from "./lib/database.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";
import routes from "./routes/index.js";
export const app = new Hono();

// Connect to the database
dbConnect();

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

if (!import.meta.vitest) {
  console.log("Starting server...");
  serve({
    fetch: app.fetch,
    port: parseInt(port as string),
  });
}
