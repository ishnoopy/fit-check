import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

export class CustomError extends Error {
  public statusCode: number;
  public status: number;

  constructor(status: number, message: string | ZodError) {
    if (message instanceof ZodError) {
      const formattedMessage = message.errors
        .map(err => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      super(formattedMessage);
    } else {
      super(message);
    }

    this.status = status;
    this.statusCode = status;
    Object.setPrototypeOf(this, CustomError.prototype);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(StatusCodes.NOT_FOUND, message);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string | ZodError) {

    if (message instanceof ZodError) {
      const formattedMessage = message.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');

      super(StatusCodes.BAD_REQUEST, formattedMessage);
    } else {
      console.log("MESSAGE: ", message);
      super(StatusCodes.BAD_REQUEST, message);
    }
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string) {
    super(StatusCodes.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string) {
    super(StatusCodes.FORBIDDEN, message);
  }
}

export class InternalServerError extends CustomError {
  constructor(message: string) {
    super(StatusCodes.INTERNAL_SERVER_ERROR, message);
  }
}

