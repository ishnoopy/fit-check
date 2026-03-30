import FollowModel from "../models/follow.model.js";

export async function followUser(followerId: string, followeeId: string) {
  await FollowModel.updateOne(
    { follower_id: followerId, followee_id: followeeId },
    {
      $setOnInsert: {
        follower_id: followerId,
        followee_id: followeeId,
      },
    },
    { upsert: true },
  );
}

export async function unfollowUser(followerId: string, followeeId: string) {
  await FollowModel.deleteOne({
    follower_id: followerId,
    followee_id: followeeId,
  });
}

export async function isFollowing(followerId: string, followeeId: string) {
  const follow = await FollowModel.findOne({
    follower_id: followerId,
    followee_id: followeeId,
  })
    .select({ _id: 1 })
    .lean();
  return Boolean(follow);
}

export async function countFollowers(followeeId: string) {
  return FollowModel.countDocuments({ followee_id: followeeId });
}

export async function countFollowing(followerId: string) {
  return FollowModel.countDocuments({ follower_id: followerId });
}

export async function findFollowerIdsByFolloweeId(followeeId: string) {
  const docs = await FollowModel.find({ followee_id: followeeId })
    .sort({ created_at: -1 })
    .select({ follower_id: 1 })
    .lean();

  return docs.map((doc) => doc.follower_id.toString());
}

export async function findFolloweeIdsByFollowerId(followerId: string) {
  const docs = await FollowModel.find({ follower_id: followerId })
    .sort({ created_at: -1 })
    .select({ followee_id: 1 })
    .lean();

  return docs.map((doc) => doc.followee_id.toString());
}
