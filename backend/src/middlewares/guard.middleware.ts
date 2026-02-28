import type { Context, Next } from "hono";
import { ROLES } from "../utils/constants/roles.js";
import { UnauthorizedError } from "../utils/errors.js";

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
  };
};
