import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3.js";
import type { IPost } from "../models/post.model.js";
import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import * as followRepository from "../repositories/follow.repository.js";
import * as postHeartRepository from "../repositories/post-heart.repository.js";
import * as postRepository from "../repositories/post.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { resolveMediaUrl } from "./media-url.service.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

const DEFAULT_POST_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_POST_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function getPostMediaMaxBytes() {
  const fromEnv = Number(process.env.POST_MEDIA_MAX_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_POST_MEDIA_MAX_BYTES;
}

function toMediaKind(mimeType: string): "image" | "gif" | "video" {
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "image";
}

async function buildMediaUrl(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function enrichPosts(posts: Awaited<ReturnType<typeof postRepository.findByUserId>>, viewerId: string) {
  const postIds = posts.map((post) => post.id as string);
  const authorIds = Array.from(
    new Set(posts.map((post) => post.userId as string)),
  );
  const uploadIds = posts
    .map((post) => post.mediaUploadId as string | undefined)
    .filter((id): id is string => Boolean(id));

  const [authors, uploads, heartCounts, heartedPostIds] = await Promise.all([
    userRepository.findByIds(authorIds),
    fileUploadRepository.findByIds(uploadIds),
    postHeartRepository.countByPostIds(postIds),
    postHeartRepository.findHeartedPostIdsByUser(viewerId, postIds),
  ]);

  const authorsById = new Map(authors.map((author) => [author.id as string, author]));
  const uploadsById = new Map(
    uploads
      .filter((upload): upload is NonNullable<typeof upload> => Boolean(upload))
      .map((upload) => [upload.id as string, upload]),
  );
  const heartedSet = new Set(heartedPostIds);

  return Promise.all(
    posts.map(async (post) => {
      const author = authorsById.get(post.userId as string);
      const upload = post.mediaUploadId
        ? uploadsById.get(post.mediaUploadId as string)
        : undefined;
      const mediaUrl = upload ? await buildMediaUrl(upload.s3Key) : null;

      return {
        ...post,
        author: {
          id: author?.id,
          username: author?.username,
          firstName: author?.firstName,
          lastName: author?.lastName,
          avatar: await resolveMediaUrl(author?.avatar ?? null),
        },
        media: upload
          ? {
              id: upload.id,
              url: mediaUrl,
              mimeType: upload.mimeType,
              mediaKind: post.mediaKind,
              fileName: upload.fileName,
            }
          : null,
        heartCount: heartCounts.get(post.id as string) ?? 0,
        isHeartedByMe: heartedSet.has(post.id as string),
      };
    }),
  );
}

export async function createPostService(
  payload: Pick<IPost, "text"> & { mediaUploadId?: string },
  userId: string,
) {
  let upload: Awaited<ReturnType<typeof fileUploadRepository.findOne>> | null = null;
  let mediaKind: "image" | "gif" | "video" | undefined;

  if (payload.mediaUploadId) {
    upload = await fileUploadRepository.findOne({ id: payload.mediaUploadId });

    if (!upload?.id) {
      throw new NotFoundError("Uploaded media not found");
    }

    if (upload.userId !== userId) {
      throw new BadRequestError("You can only post media you uploaded");
    }

    if (!ALLOWED_POST_MEDIA_TYPES.has(upload.mimeType)) {
      throw new BadRequestError("Unsupported media type for posts");
    }

    const maxBytes = getPostMediaMaxBytes();
    if (upload.fileSize && upload.fileSize > maxBytes) {
      throw new BadRequestError("Media exceeds allowed file size limit");
    }

    mediaKind = toMediaKind(upload.mimeType);
  }

  const post = await postRepository.createPost({
    userId,
    mediaUploadId: upload?.id,
    mediaKind,
    text: payload.text.trim(),
  });

  const author = await userRepository.findOne({ id: userId });
  const mediaUrl = upload ? await buildMediaUrl(upload.s3Key) : null;

  return {
    ...post,
    media: upload
      ? {
          id: upload.id,
          url: mediaUrl,
          mimeType: upload.mimeType,
          mediaKind,
          fileName: upload.fileName,
        }
      : null,
    author: {
      id: author?.id,
      username: author?.username,
      firstName: author?.firstName,
      lastName: author?.lastName,
      avatar: await resolveMediaUrl(author?.avatar ?? null),
    },
    heartCount: 0,
    isHeartedByMe: false,
  };
}

export async function getFeedService({
  tab,
  page,
  limit,
  userId,
}: {
  tab: "explore" | "following";
  page: number;
  limit: number;
  userId: string;
}) {
  const followeeIds = await followRepository.findFolloweeIdsByFollowerId(userId);

  if (tab === "following" && followeeIds.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        hasMore: false,
      },
    };
  }

  const { data: posts, hasMore } = await postRepository.findFeedPosts({
    tab,
    userId,
    followeeIds,
    page,
    limit,
  });

  const data = await enrichPosts(posts, userId);

  return {
    data,
    pagination: {
      page,
      limit,
      hasMore,
    },
  };
}

export async function getMyPostsService(userId: string, limit = 30) {
  const posts = await postRepository.findByUserId(userId, limit);
  return enrichPosts(posts, userId);
}

export async function getPostsByUsernameService(
  username: string,
  viewerId: string,
  limit = 30,
) {
  const normalized = username.trim().toLowerCase();
  const user = await userRepository.findOne({ username: normalized });

  if (!user?.id) {
    throw new NotFoundError("User not found");
  }

  const posts = await postRepository.findByUserId(user.id as string, limit);
  return enrichPosts(posts, viewerId);
}

export async function togglePostHeartService(postId: string, userId: string) {
  const post = await postRepository.findById(postId);
  if (!post?.id) {
    throw new NotFoundError("Post not found");
  }

  const { isHearted, heartCount } = await postHeartRepository.toggleHeart(postId, userId);

  return {
    postId,
    isHearted,
    heartCount,
  };
}
