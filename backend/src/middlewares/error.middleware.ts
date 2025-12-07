import type { Context } from "hono";
import { deleteCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";
import * as jose from "jose";
import { CustomError } from "../lib/errors.js";

export async function errorMiddleware(err: Error, c: Context) {

  console.error(err);

  if (err instanceof jose.errors.JWSInvalid) {
    // remove the jwt token from the cookie
    deleteCookie(c, 'access_token');
    return c.json(
      { message: "Invalid JWT token" },
      StatusCodes.UNAUTHORIZED
    );
  }

  if (err instanceof jose.errors.JWTExpired) {
    // remove the jwt token from the cookie
    deleteCookie(c, 'access_token');
    return c.json(
      { message: "JWT token expired" },
      StatusCodes.UNAUTHORIZED
    );
  }

  // Type guard to check if error is instance of CustomError
  if (err instanceof CustomError) {

    // if unauthorized, remove the jwt token from the cookie
    if (err.status === StatusCodes.UNAUTHORIZED) {
      deleteCookie(c, 'access_token');
    }
    return c.json(
      { message: err.message },
      err.status as ContentfulStatusCode
    );
  }

  // Default error response for non-custom errors
  return c.json(
    { message: "Internal Server Error", stack: err.stack },
    StatusCodes.INTERNAL_SERVER_ERROR
  );
}
