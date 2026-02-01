// backend/src/middlewares/auth.middleware.ts
import type { Context, Next } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import * as jose from "jose";
import { UnauthorizedError } from "../lib/errors.js";

export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, "access_token");
  if (!token) {
    throw new UnauthorizedError("Unauthorized");
  }

  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
    );

    c.set("user", payload);
    return next();
  } catch (error) {
    // If token is expired or invalid, delete the cookie
    if (error instanceof jose.errors.JWTExpired) {
      deleteCookie(c, "access_token");
      throw new UnauthorizedError("Token expired");
    }

    // Handle other JWT errors
    deleteCookie(c, "access_token");
    throw new UnauthorizedError("Invalid token");
  }
}
