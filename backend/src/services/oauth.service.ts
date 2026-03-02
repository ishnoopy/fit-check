import { hash } from "bcrypt";
import { google } from "googleapis";
import * as jose from "jose";
import type { IUser } from "../models/user.model.js";
import * as UserRepository from "../repositories/user.repository.js";
import { createUniqueReferralCode } from "./coach-access.service.js";
import { BadRequestError } from "../utils/errors.js";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export async function getGoogleOAuthUrl() {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}

export async function handleGoogleOAuthCallback(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new BadRequestError("Email not provided by Google");
    }

    let user = await UserRepository.findOne({ email: data.email });

    if (!user) {
      const referralCode = await createUniqueReferralCode();
      // Create new user with Google data
      user = await UserRepository.createUser({
        email: data.email,
        googleId: data.id,
        firstName: data.given_name,
        lastName: data.family_name,
        avatar: data.picture,
        authProvider: "google",
        role: "user",
        profileCompleted: false,
        referralCode,
      });
    } else if (!user.googleId) {
      // Link existing account to Google
      user = await UserRepository.updateUser(user.id as string, {
        googleId: data.id,
        avatar: data.picture ?? user.avatar,
        firstName: user.firstName ?? data.given_name,
        lastName: user.lastName ?? data.family_name,
      });
    }

    const { password, ...userWithoutPassword } = user as IUser;

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
  } catch (error) {
    console.error("Google OAuth error:", error);
    throw new BadRequestError("Failed to authenticate with Google");
  }
}
