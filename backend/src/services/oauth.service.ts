import { google } from "googleapis";
import * as jose from "jose";
import { BadRequestError } from "../lib/errors.js";
import type { IUser } from "../models/user.model.js";
import * as UserRepository from "../repositories/user.repository.js";

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getGoogleOAuthUrl() {
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
    });
}

export async function handleGoogleOAuthCallback(code: string) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        if (!data.email) {
            throw new BadRequestError("Email not provided by Google");
        }

        let user = await UserRepository.findOne({ email: data.email });

        if (!user) {
            // Create new user with Google data
            user = await UserRepository.createUser({
                email: data.email,
                google_id: data.id,
                first_name: data.given_name,
                last_name: data.family_name,
                avatar: data.picture,
                authProvider: "google",
                role: "user",
                profileCompleted: false
            });
        } else if (!user.google_id) {
            // Link existing account to Google
            user = await UserRepository.updateUser(user._id.toString(), {
                google_id: data.id,
                avatar: data.picture ?? user.avatar,
                first_name: user.first_name ?? data.given_name,
                last_name: user.last_name ?? data.family_name,
            })
        }

        const { password, ...userWithoutPassword } = user as IUser;

        const token = await new jose.SignJWT({
            id: userWithoutPassword._id,
            email: userWithoutPassword.email,
            role: userWithoutPassword?.role,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

        return { user: userWithoutPassword, token };
    } catch (error) {
        console.error("Google OAuth error:", error);
        throw new BadRequestError("Failed to authenticate with Google");
    }
}
