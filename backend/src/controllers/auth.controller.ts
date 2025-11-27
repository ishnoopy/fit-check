import type { Context } from "hono";
import { loginService, registerService } from "../services/user.service.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import { ROLES_LIST } from "../utils/constants/roles.js";

export async function login(c: Context) {

  const paramsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })

  const params = await paramsSchema.safeParseAsync(await c.req.json());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const { email, password } = params.data;

	const user = await loginService(email, password);

	return c.json({
		success: true,
		data: user,
	}, StatusCodes.OK);
}

export async function register(c: Context) {

	const paramsSchema = z.object({
		email: z.string().email(),
		password: z.string().min(6),
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		role: z.enum(ROLES_LIST as [string, ...string[]]),
	});

	const params = await paramsSchema.safeParseAsync(await c.req.json());

	if (!params.success) {
		throw new BadRequestError(params.error);
	}

	const newUser = await registerService({
		email: params.data.email,
		password: params.data.password,
		first_name: params.data.first_name,
		last_name: params.data.last_name,
		role: params.data.role,
	});

	return c.json({
		success: true,
		data: newUser,
	}, StatusCodes.CREATED);
}
