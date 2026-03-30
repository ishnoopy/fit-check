import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import * as followRepository from "../repositories/follow.repository.js";
import * as postRepository from "../repositories/post.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { resolveMediaUrl } from "./media-url.service.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

function normalizeUsernameOrThrow(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    throw new BadRequestError("Invalid username");
  }
  return normalized;
}

async function getTargetUserByUsername(username: string) {
  const normalizedUsername = normalizeUsernameOrThrow(username);
  const targetUser = await userRepository.findOne({ username: normalizedUsername });

  if (!targetUser?.id) {
    throw new NotFoundError("User not found");
  }

  return targetUser;
}

function orderUsersByIds(
  users: Awaited<ReturnType<typeof userRepository.findByIds>>,
  ids: string[],
) {
  const byId = new Map(users.map((user) => [user.id as string, user]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((user) => ({
      id: user!.id as string,
      username: user!.username as string,
      firstName: user!.firstName,
      lastName: user!.lastName,
      avatar: user!.avatar,
    }));
}

export async function getPublicProfileByUsername(
  currentUserId: string,
  username: string,
) {
  const targetUser = await getTargetUserByUsername(username);
  const targetUserId = targetUser.id as string;

  const [postsCount, followersCount, followingCount, isFollowing] =
    await Promise.all([
      postRepository.countByUserId(targetUserId),
      followRepository.countFollowers(targetUserId),
      followRepository.countFollowing(targetUserId),
      currentUserId === targetUserId
        ? Promise.resolve(false)
        : followRepository.isFollowing(currentUserId, targetUserId),
    ]);

  const avatar = await resolveMediaUrl(targetUser.avatar ?? null);

  return {
    id: targetUserId,
    username: targetUser.username,
    firstName: targetUser.firstName,
    lastName: targetUser.lastName,
    avatar,
    fitnessGoal: targetUser.fitnessGoal,
    activityLevel: targetUser.activityLevel,
    age: targetUser.age,
    weight: targetUser.weight,
    height: targetUser.height,
    isPioneer: targetUser.isPioneer,
    postsCount,
    followersCount,
    followingCount,
    isFollowing,
    isOwnProfile: currentUserId === targetUserId,
  };
}

export async function followUserByUsername(
  currentUserId: string,
  username: string,
) {
  const targetUser = await getTargetUserByUsername(username);
  const targetUserId = targetUser.id as string;

  if (targetUserId === currentUserId) {
    throw new BadRequestError("You cannot follow yourself");
  }

  await followRepository.followUser(currentUserId, targetUserId);
  return { success: true };
}

export async function unfollowUserByUsername(
  currentUserId: string,
  username: string,
) {
  const targetUser = await getTargetUserByUsername(username);
  const targetUserId = targetUser.id as string;

  if (targetUserId === currentUserId) {
    throw new BadRequestError("You cannot unfollow yourself");
  }

  await followRepository.unfollowUser(currentUserId, targetUserId);
  return { success: true };
}

export async function getFollowersByUsername(username: string) {
  const targetUser = await getTargetUserByUsername(username);
  const targetUserId = targetUser.id as string;

  const followerIds =
    await followRepository.findFollowerIdsByFolloweeId(targetUserId);
  if (followerIds.length === 0) {
    return [];
  }

  const users = await userRepository.findByIds(followerIds);
  const ordered = orderUsersByIds(users, followerIds);

  return Promise.all(
    ordered.map(async (user) => ({
      ...user,
      avatar: await resolveMediaUrl(user.avatar ?? null),
    })),
  );
}

export async function getFollowingByUsername(username: string) {
  const targetUser = await getTargetUserByUsername(username);
  const targetUserId = targetUser.id as string;

  const followingIds =
    await followRepository.findFolloweeIdsByFollowerId(targetUserId);
  if (followingIds.length === 0) {
    return [];
  }

  const users = await userRepository.findByIds(followingIds);
  const ordered = orderUsersByIds(users, followingIds);

  return Promise.all(
    ordered.map(async (user) => ({
      ...user,
      avatar: await resolveMediaUrl(user.avatar ?? null),
    })),
  );
}

export async function searchUsers(
  currentUserId: string,
  query: string,
  limit = 8,
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const users = await userRepository.searchUsersByQuery(normalizedQuery, {
    excludeUserId: currentUserId,
    limit,
  });

  return Promise.all(
    users.map(async (user) => ({
      id: user.id as string,
      username: user.username as string,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: await resolveMediaUrl(user.avatar ?? null),
    })),
  );
}

export async function updateMyAvatar(userId: string, uploadId: string) {
  const upload = await fileUploadRepository.findOne({ id: uploadId });

  if (!upload?.id) {
    throw new NotFoundError("Uploaded file not found");
  }

  if (upload.userId !== userId) {
    throw new BadRequestError("You can only use your own uploaded image");
  }

  if (!upload.mimeType.startsWith("image/")) {
    throw new BadRequestError("Avatar must be an image");
  }

  const updatedUser = await userRepository.updateUser(userId, {
    avatar: upload.s3Key,
  });

  if (!updatedUser) {
    throw new NotFoundError("User not found");
  }

  return {
    ...updatedUser,
    avatar: await resolveMediaUrl(updatedUser.avatar ?? null),
  };
}
