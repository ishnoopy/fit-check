import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import * as jose from "jose";
import { UnauthorizedError } from "../lib/errors.js";
export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'access_token');

  if (!token) {
    throw new UnauthorizedError("Unauthorized");
  }

  const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));

  // DOCU: Allows us to access the user in the next middleware or controller function
  c.set("user", payload);

  return next();
}
