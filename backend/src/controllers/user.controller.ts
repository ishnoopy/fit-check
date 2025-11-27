import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { findAll } from "../repositories/user.repository.js";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";

export async function getUsers(c: Context) {
	const query = c.req.query();

	console.log("query: ", query);
	const users = await findAll();

	return c.json({
		success: true,
		data: users,
	}, StatusCodes.OK);
}

export async function getUser(c: Context) {
	const paramsSchema = z.object({
		id: z.string().min(8),
	});

	const params = await paramsSchema.safeParseAsync(c.req.param());

	if (!params.success) {
		throw new BadRequestError(params.error);
	}

	return c.json(
		{
			success: true,
			data: params.data,
		},
		StatusCodes.OK
	);
}

export async function createUser(c: Context) {
	const body = await c.req.json();
	console.log("body: ", body);
	return c.json({
		success: true,
		data: body,
	}, StatusCodes.CREATED);
}

export async function updateUser(c: Context) {
	const id = c.req.param().id;
	const body = await c.req.json();
	console.log("id: ", id);
	console.log("body: ", body);

	return c.json({
		success: true,
		data: { id, ...body },
	}, StatusCodes.OK);
}

export async function deleteUser(c: Context) {
	const id = c.req.param().id;
	console.log(id);

	return c.json({
		success: true,
		data: id,
	}, StatusCodes.OK);
}
