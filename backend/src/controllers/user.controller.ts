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
