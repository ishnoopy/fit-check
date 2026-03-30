import * as fileUploadRepository from "../repositories/file-upload.repository.js";
import * as followRepository from "../repositories/follow.repository.js";
import * as userRepository from "../repositories/user.repository.js";
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
      fileUploadRepository.countImagesByUserId(targetUserId),
      followRepository.countFollowers(targetUserId),
      followRepository.countFollowing(targetUserId),
      currentUserId === targetUserId
        ? Promise.resolve(false)
        : followRepository.isFollowing(currentUserId, targetUserId),
    ]);

  return {
    id: targetUserId,
    username: targetUser.username,
    firstName: targetUser.firstName,
    lastName: targetUser.lastName,
    avatar: targetUser.avatar,
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
  return orderUsersByIds(users, followerIds);
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
  return orderUsersByIds(users, followingIds);
}
