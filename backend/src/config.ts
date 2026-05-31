import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.local";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const testDefaults =
  process.env.NODE_ENV === "test"
    ? {
        DB_URL: "mongodb://localhost:27017/fit-check-test",
        JWT_SECRET: "test-secret-at-least-32-chars-long",
        BACKEND_PORT: "4000",
        FRONTEND_URL: "http://localhost:3000",
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
        GOOGLE_REDIRECT_URI: "http://localhost:4000/api/auth/google/callback",
        AWS_REGION: "ap-southeast-1",
        AWS_S3_BUCKET_NAME: "test-bucket",
        OPENAI_API_KEY: "test-openai-api-key",
        REDIS_URL: "redis://localhost:6379",
      }
    : {};

const envSchema = z.object({
  NODE_ENV: z.string().default("local"),
  DB_URL: z.string().min(1, "DB_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_ISSUER: z.string().min(1).optional(),
  JWT_AUDIENCE: z.string().min(1).optional(),
  BACKEND_PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url("GOOGLE_REDIRECT_URI must be a valid URL"),
  AWS_REGION: z.string().min(1).default("ap-southeast-1"),
  AWS_S3_BUCKET_NAME: z.string().min(1, "AWS_S3_BUCKET_NAME is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  POST_MEDIA_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  COACH_BASE_WEEKLY_REQUESTS: z.coerce.number().int().nonnegative().default(5),
  COACH_REFERRAL_BONUS_REQUESTS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(10),
  COACH_MAX_REFERRALS: z.coerce.number().int().nonnegative().default(5),
  REFERRAL_CODE_LENGTH: z.coerce.number().int().positive().default(8),
});

const parsedEnv = envSchema.safeParse({
  ...testDefaults,
  ...process.env,
});

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const config = parsedEnv.data;
export type Config = typeof config;
