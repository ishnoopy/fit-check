import type { Next } from "hono";
import type { Context } from "hono";
import { UnauthorizedError } from "../lib/errors.js";
import * as jose from "jose";
export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new UnauthorizedError("Unauthorized");
  }

  const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));

  // DOCU: Allows us to access the user in the next middleware or controller function
  c.set("user", payload);

  return next();
}