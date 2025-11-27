import { compare, hash } from "bcrypt";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { createUser, findOne } from "../repositories/user.repository.js";
import type { IUser } from "../models/user.model.js";
import * as jose from "jose";

export async function loginService(email: string, password: string) {
	const user = await findOne({ email });

	if (!user) {
		throw new NotFoundError("User not found");
	}

	const isPasswordCorrect = await compare(password, user.password);

	if (!isPasswordCorrect) {
		throw new BadRequestError("Invalid email and/or password");
	}

	const { password: _, ...userWithoutPassword } = user.toObject();

	const token = await new jose.SignJWT({
		id: userWithoutPassword._id,
		email: userWithoutPassword.email,
		role: userWithoutPassword?.role,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("1h")
		.sign(new TextEncoder().encode(process.env.JWT_SECRET));

	return { user: userWithoutPassword, token };
}

export async function registerService(payload: IUser) {

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
  
  const { password, ...userWithoutPassword } = newUser.toObject();

  return userWithoutPassword;
}
