import type { Next } from "hono";
import type { Context } from "hono";
import { UnauthorizedError } from "../lib/errors.js";
import { ROLES } from "../utils/constants/roles.js";

type Role = (typeof ROLES)[keyof typeof ROLES];

export const guardMiddleware = (roles: Role[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError("Unauthorized");
    }

    if (!roles.includes(user.role)) {
      throw new UnauthorizedError("Role not authorized");
    }

    return next();
  }
}