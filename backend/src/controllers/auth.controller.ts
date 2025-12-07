import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { findOne } from "../repositories/user.repository.js";
import { loginService, registerService } from "../services/user.service.js";
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

	setCookie(c, 'access_token', user.token, {
		httpOnly: true,
		// secure: process.env.NODE_ENV === 'production',
		secure: false, // FOR THE MEAN TIME WHILE WE DO NOT HAVE A SSL CERTIFICATE
		maxAge: 60 * 60 * 1000, // 1 hour
		sameSite: 'strict',
	});

	return c.json({
		success: true,
		data: user.user,
	}, StatusCodes.OK);
}

export async function me(c: Context) {
	const user = c.get('user')

	const userFullData = await findOne({ _id: user.id })

	if (!userFullData) {
		throw new NotFoundError("User not found");
	}

	const { password, ...userWithoutPassword } = userFullData;

	return c.json({
		success: true,
		data: userWithoutPassword
	}, StatusCodes.OK)
}

export async function logout(c: Context) {
	deleteCookie(c, 'access_token', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	return c.json({
		success: true,
		message: 'Logged out successfully',
	}, StatusCodes.OK);
}

export async function register(c: Context) {

	const paramsSchema = z.object({
		email: z.string().email(),
		password: z.string().min(6),
		role: z.enum(ROLES_LIST as [string, ...string[]]).optional(),
	});

	const params = await paramsSchema.safeParseAsync(await c.req.json());

	if (!params.success) {
		throw new BadRequestError(params.error);
	}

	const newUser = await registerService({
		email: params.data.email,
		password: params.data.password,
		role: params.data.role || "user",
		profileCompleted: false,
	} as any);

	return c.json({
		success: true,
		data: newUser,
	}, StatusCodes.CREATED);
}

export async function completeProfile(c: Context) {
	const user = c.get('user');

	const paramsSchema = z.object({
		first_name: z.string().min(1),
		last_name: z.string().min(1),
		// Optional fitness fields
		age: z.number().min(13).max(120).optional(),
		gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
		weight: z.number().min(20).max(500).optional(), // kg
		height: z.number().min(50).max(300).optional(), // cm
		fitness_goal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_fitness"]).optional(),
		activity_level: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]).optional(),
	});

	const params = await paramsSchema.safeParseAsync(await c.req.json());

	if (!params.success) {
		throw new BadRequestError(params.error);
	}

	// Check if user exists
	const existingUser = await findOne({ _id: user.id });

	if (!existingUser) {
		throw new NotFoundError("User not found");
	}

	// Import UserModel to use findByIdAndUpdate
	const UserModel = (await import("../models/user.model.js")).default;

	// Update user profile
	const updatedUser = await UserModel.findByIdAndUpdate(
		user.id,
		{
			first_name: params.data.first_name,
			last_name: params.data.last_name,
			age: params.data.age,
			gender: params.data.gender,
			weight: params.data.weight,
			height: params.data.height,
			fitness_goal: params.data.fitness_goal,
			activity_level: params.data.activity_level,
			profileCompleted: true,
		},
		{ new: true, lean: true }
	);

	if (!updatedUser) {
		throw new NotFoundError("Failed to update user");
	}

	const { password, ...userWithoutPassword } = updatedUser;

	return c.json({
		success: true,
		data: userWithoutPassword,
	}, StatusCodes.OK);
}
