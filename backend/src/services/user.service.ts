import { compare, hash } from "bcrypt";
import * as jose from "jose";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IUser } from "../models/user.model.js";
import * as UserRepository from "../repositories/user.repository.js";
import { createUser, findOne } from "../repositories/user.repository.js";

export async function loginService(email: string, password: string) {
	const user = await findOne({ email });

	if (!user) {
		throw new NotFoundError("Invalid email and/or password");
	}

	if (user?.authProvider === "google") {
		throw new BadRequestError("Please login with Google");
	}

	if (!user.password) {
		throw new BadRequestError("Please login with Google");
	}

	const isPasswordCorrect = await compare(password, user.password);

	if (!isPasswordCorrect) {
		throw new BadRequestError("Invalid email and/or password");
	}

	const { password: _, ...userWithoutPassword } = user;

	const token = await new jose.SignJWT({
		id: userWithoutPassword.id,
		email: userWithoutPassword.email,
		role: userWithoutPassword?.role,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("15m")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET));

	const refreshToken = await new jose.SignJWT({
		id: userWithoutPassword.id,
		email: userWithoutPassword.email,
		role: userWithoutPassword?.role,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("7d")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET));

	await UserRepository.updateUser(userWithoutPassword.id as string, {
		refreshTokenHash: await hash(refreshToken, 10),
		refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
	});

	return { user: userWithoutPassword, token, refreshToken };
}

export async function registerService(payload: Omit<IUser, 'password'> & { password: string }) {

	const { email } = payload;
	// Check if user already exists
	const user = await findOne({ email });

	if (user) {
		throw new BadRequestError("User already exists");
	}

	// Hash password
	const hashedPassword = await hash(payload.password, 10);

	// Create user
	const newUser = await createUser({ ...payload, password: hashedPassword });

	const { password, ...userWithoutPassword } = newUser as IUser;

	return userWithoutPassword;
}
