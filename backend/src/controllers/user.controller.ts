import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { findAll } from "../repositories/user.repository.js";
import * as socialService from "../services/social.service.js";
import { BadRequestError } from "../utils/errors.js";

export async function getUsers(c: Context) {
  const query = c.req.query();

  const users = await findAll();

  return c.json(
    {
      success: true,
      data: users,
    },
    StatusCodes.OK,
  );
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
    StatusCodes.OK,
  );
}

const usernameParamsSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/),
});

const updateAvatarSchema = z.object({
  uploadId: z.string().length(24, "Invalid upload ID"),
});

const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(24),
  limit: z
    .string()
    .transform((value) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? 8 : Math.min(Math.max(parsed, 1), 20);
    })
    .optional(),
});

export async function searchUsers(c: Context) {
  const user = c.get("user");
  const query = await searchUsersQuerySchema.safeParseAsync(c.req.query());

  if (!query.success) {
    throw new BadRequestError(query.error);
  }

  const data = await socialService.searchUsers(
    user.id,
    query.data.q,
    query.data.limit,
  );

  return c.json(
    {
      success: true,
      data,
    },
    StatusCodes.OK,
  );
}

export async function getPublicProfile(c: Context) {
  const user = c.get("user");
  const params = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const data = await socialService.getPublicProfileByUsername(
    user.id,
    params.data.username,
  );

  return c.json(
    {
      success: true,
      data,
    },
    StatusCodes.OK,
  );
}

export async function followUser(c: Context) {
  const user = c.get("user");
  const params = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  await socialService.followUserByUsername(user.id, params.data.username);

  return c.json(
    {
      success: true,
      message: "Followed user successfully",
    },
    StatusCodes.OK,
  );
}

export async function unfollowUser(c: Context) {
  const user = c.get("user");
  const params = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  await socialService.unfollowUserByUsername(user.id, params.data.username);

  return c.json(
    {
      success: true,
      message: "Unfollowed user successfully",
    },
    StatusCodes.OK,
  );
}

export async function getFollowers(c: Context) {
  const params = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const users = await socialService.getFollowersByUsername(params.data.username);

  return c.json(
    {
      success: true,
      data: users,
    },
    StatusCodes.OK,
  );
}

export async function getFollowing(c: Context) {
  const params = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const users = await socialService.getFollowingByUsername(params.data.username);

  return c.json(
    {
      success: true,
      data: users,
    },
    StatusCodes.OK,
  );
}

export async function updateMyAvatar(c: Context) {
  const user = c.get("user");
  const body = await c.req.json();
  const validation = await updateAvatarSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const updatedUser = await socialService.updateMyAvatar(
    user.id,
    validation.data.uploadId,
  );

  const { password, ...userWithoutPassword } = updatedUser;

  return c.json(
    {
      success: true,
      data: userWithoutPassword,
    },
    StatusCodes.OK,
  );
}

export async function createUser(c: Context) {
  const body = await c.req.json();
  return c.json(
    {
      success: true,
      data: body,
    },
    StatusCodes.CREATED,
  );
}

export async function updateUser(c: Context) {
  const id = c.req.param().id;
  const body = await c.req.json();

  return c.json(
    {
      success: true,
      data: { id, ...body },
    },
    StatusCodes.OK,
  );
}

export async function deleteUser(c: Context) {
  const id = c.req.param().id;

  return c.json(
    {
      success: true,
      data: id,
    },
    StatusCodes.OK,
  );
}
