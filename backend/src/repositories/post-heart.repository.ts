import PostHeartModel from "../models/post-heart.model.js";

export async function toggleHeart(postId: string, userId: string) {
  const existing = await PostHeartModel.findOne({
    post_id: postId,
    user_id: userId,
  })
    .select({ _id: 1 })
    .lean();

  if (existing) {
    await PostHeartModel.deleteOne({ _id: existing._id });
    return { isHearted: false };
  }

  await PostHeartModel.create({
    post_id: postId,
    user_id: userId,
  });
  return { isHearted: true };
}

export async function countByPostId(postId: string) {
  return PostHeartModel.countDocuments({ post_id: postId });
}

export async function countByPostIds(postIds: string[]) {
  if (postIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await PostHeartModel.aggregate<{
    _id: string;
    count: number;
  }>([
    { $match: { post_id: { $in: postIds } } },
    { $group: { _id: "$post_id", count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function findHeartedPostIdsByUser(
  userId: string,
  postIds: string[],
) {
  if (postIds.length === 0) {
    return [];
  }

  const rows = await PostHeartModel.find({
    user_id: userId,
    post_id: { $in: postIds },
  })
    .select({ post_id: 1 })
    .lean();

  return rows.map((row) => row.post_id.toString());
}
