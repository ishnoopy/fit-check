import { compare, hash } from "bcrypt";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { StatusCodes } from "http-status-codes";
import * as jose from "jose";
import { z } from "zod";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../lib/errors.js";
import type { IUser } from "../models/user.model.js";
import * as UserRepository from "../repositories/user.repository.js";
import * as OAuthService from "../services/oauth.service.js";
import { loginService, registerService } from "../services/user.service.js";
import { ROLES_LIST } from "../utils/constants/roles.js";

export async function googleOAuth(c: Context) {
	const url = await OAuthService.getGoogleOAuthUrl();
	return c.json({
		success: true,
		data: url,
	}, StatusCodes.OK);
}

export async function handleGoogleOAuthCallback(c: Context) {
	const code = c.req.query('code');
	const error = c.req.query('error');

	if (error) {
		return c.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`, StatusCodes.TEMPORARY_REDIRECT);
	}

	if (!code) {
		return c.redirect(`${process.env.FRONTEND_URL}/login?error=Code is required`, StatusCodes.TEMPORARY_REDIRECT);
	}

	const user = await OAuthService.handleGoogleOAuthCallback(code);

	setCookie(c, 'access_token', user?.token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 120 * 1000, // 2 hours
		sameSite: 'lax', // To allow frontend redirect to the dashboard
	});

	setCookie(c, 'refresh_token', user?.refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30, // 30 days
		sameSite: 'lax', // To allow frontend redirect to the dashboard
	});

	return c.redirect(`${process.env.FRONTEND_URL}/dashboard`, StatusCodes.TEMPORARY_REDIRECT);
}

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
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 120 * 1000, // 2 hours
		sameSite: 'strict',
	});

	setCookie(c, 'refresh_token', user.refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30, // 30 days
		sameSite: 'strict',
	});

	return c.json({
		success: true,
		data: user.user,
	}, StatusCodes.OK);
}

export async function me(c: Context) {
	const user = c.get('user')
	const userFullData = await UserRepository.findOne({ id: user.id })

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
	const user = c.get('user');

	deleteCookie(c, 'access_token', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	deleteCookie(c, 'refresh_token', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	await UserRepository.updateUser(user.id, {
		refreshTokenHash: "",
		refreshTokenExpiresAt: new Date(0),
	});

	return c.json({ success: true, message: 'Logged out successfully' }, StatusCodes.OK);
}

export async function refreshToken(c: Context) {
	const refreshToken = getCookie(c, 'refresh_token');
	if (!refreshToken) {
		throw new UnauthorizedError("Unauthorized");
	}

	let decodedToken: jose.JWTPayload;
	try {
		const secret = new TextEncoder().encode(process.env.JWT_SECRET);
		const { payload } = await jose.jwtVerify(refreshToken, secret);
		decodedToken = payload;
	} catch (error) {
		throw new UnauthorizedError("Unauthorized");
	}

	if (!decodedToken.id) {
		throw new UnauthorizedError("Unauthorized");
	}

	const user = await UserRepository.findOne({ id: decodedToken.id as string });

	if (!user) {
		throw new UnauthorizedError("Unauthorized");
	}

	if (!user.refreshTokenHash) {
		throw new UnauthorizedError("Unauthorized");
	}

	const isRefreshTokenValid = await compare(refreshToken, user.refreshTokenHash);

	if (!isRefreshTokenValid) {
		throw new UnauthorizedError("Unauthorized");
	}

	if (user.refreshTokenExpiresAt && new Date(user.refreshTokenExpiresAt) < new Date()) {
		throw new UnauthorizedError("Unauthorized");
	}

	const token = await new jose.SignJWT({
		id: user.id,
		email: user.email,
		role: user.role,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET));

	setCookie(c, 'access_token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 120 * 1000, // 2 hours
		sameSite: 'strict',
	});

	const newRefreshToken = await new jose.SignJWT({
		id: user.id,
		email: user.email,
		role: user.role,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("7d")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET));

	setCookie(c, 'refresh_token', newRefreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30, // 30 days
		sameSite: 'strict',
	});

	await UserRepository.updateUser(user.id as string, {
		refreshTokenHash: await hash(newRefreshToken, 10),
		refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
	});

	return c.json({ success: true, data: { token, refreshToken: newRefreshToken } }, StatusCodes.OK);
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
	});

	return c.json({
		success: true,
		data: newUser,
	}, StatusCodes.CREATED);
}

export async function completeProfile(c: Context) {
	const user = c.get('user');

	const paramsSchema = z.object({
		firstName: z.string().min(1),
		lastName: z.string().min(1),
		password: z.string().min(6).optional(),
		// Optional fitness fields
		age: z.number().min(13).max(120).optional(),
		gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
		weight: z.number().min(20).max(500).optional(), // kg
		height: z.number().min(50).max(300).optional(), // cm
		fitnessGoal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_fitness"]).optional(),
		activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]).optional(),
	});

	const params = await paramsSchema.safeParseAsync(await c.req.json());

	if (!params.success) {
		throw new BadRequestError(params.error);
	}

	// Check if user exists
	const existingUser = await UserRepository.findOne({ id: user.id });

	if (!existingUser) {
		throw new NotFoundError("User not found");
	}

	// Prepare update payload
	const updatePayload: Partial<IUser> = {
		firstName: params.data.firstName,
		lastName: params.data.lastName,
		age: params.data.age,
		gender: params.data.gender,
		weight: params.data.weight,
		height: params.data.height,
		fitnessGoal: params.data.fitnessGoal,
		activityLevel: params.data.activityLevel,
		profileCompleted: true,
	};

	// Hash password if provided
	if (params.data.password) {
		updatePayload.password = await hash(params.data.password, 10);
	}

	// Update user profile
	const updatedUser = await UserRepository.updateUser(
		user.id,
		updatePayload,
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
