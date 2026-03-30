import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import * as postService from "../services/post.service.js";
import { BadRequestError } from "../utils/errors.js";

const createPostSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  mediaUploadId: z.string().length(24, "Invalid media upload ID").optional(),
});

const getFeedQuerySchema = z.object({
  tab: z.enum(["explore", "following"]).default("explore"),
  page: z
    .string()
    .transform((value) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    })
    .optional(),
  limit: z
    .string()
    .transform((value) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) || parsed < 1 ? 10 : Math.min(parsed, 50);
    })
    .optional(),
});

const postIdSchema = z.object({
  id: z.string().length(24, "Invalid post ID"),
});

const usernameParamsSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/),
});

const myPostsQuerySchema = z.object({
  limit: z
    .string()
    .transform((value) => {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) || parsed < 1 ? 30 : Math.min(parsed, 100);
    })
    .optional(),
});

export async function createPost(c: Context) {
  const body = await c.req.json();
  const validation = await createPostSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const post = await postService.createPostService(validation.data, userId);

  return c.json(
    {
      success: true,
      data: post,
    },
    StatusCodes.CREATED,
  );
}

export async function getFeed(c: Context) {
  const params = await getFeedQuerySchema.safeParseAsync(c.req.query());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const tab = params.data.tab;
  const page = params.data.page ?? 1;
  const limit = params.data.limit ?? 10;

  const feed = await postService.getFeedService({
    tab,
    page,
    limit,
    userId,
  });

  return c.json(
    {
      success: true,
      data: feed.data,
      pagination: feed.pagination,
    },
    StatusCodes.OK,
  );
}

export async function togglePostHeart(c: Context) {
  const params = await postIdSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const result = await postService.togglePostHeartService(params.data.id, userId);

  return c.json(
    {
      success: true,
      data: result,
    },
    StatusCodes.OK,
  );
}

export async function getMyPosts(c: Context) {
  const params = await myPostsQuerySchema.safeParseAsync(c.req.query());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const posts = await postService.getMyPostsService(userId, params.data.limit);

  return c.json(
    {
      success: true,
      data: posts,
    },
    StatusCodes.OK,
  );
}

export async function getPostsByUsername(c: Context) {
  const user = c.get("user");
  const queryValidation = await myPostsQuerySchema.safeParseAsync(c.req.query());
  const paramsValidation = await usernameParamsSchema.safeParseAsync(c.req.param());

  if (!queryValidation.success) {
    throw new BadRequestError(queryValidation.error);
  }

  if (!paramsValidation.success) {
    throw new BadRequestError(paramsValidation.error);
  }

  const posts = await postService.getPostsByUsernameService(
    paramsValidation.data.username,
    user.id,
    queryValidation.data.limit,
  );

  return c.json(
    {
      success: true,
      data: posts,
    },
    StatusCodes.OK,
  );
}
