import PostHeartModel from "../models/post-heart.model.js";
import { Types } from "mongoose";

function idCandidates(id: string) {
  const values: Array<string | Types.ObjectId> = [id];

  if (Types.ObjectId.isValid(id)) {
    values.push(new Types.ObjectId(id));
  }

  return values;
}

function objectIdCandidates(ids: string[]) {
  return ids.flatMap((id) => {
    if (Types.ObjectId.isValid(id)) {
      return [new Types.ObjectId(id)];
    }
    return [];
  });
}

export async function toggleHeart(postId: string, userId: string) {
  const postIdValues = idCandidates(postId);
  const userIdValues = idCandidates(userId);

  const existing = await PostHeartModel.findOne({
    post_id: { $in: postIdValues },
    user_id: { $in: userIdValues },
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
  const postIdValues = idCandidates(postId);
  return PostHeartModel.countDocuments({
    post_id: { $in: postIdValues },
  });
}

export async function countByPostIds(postIds: string[]) {
  if (postIds.length === 0) {
    return new Map<string, number>();
  }

  const objectIds = objectIdCandidates(postIds);
  const postIdValues = [...postIds, ...objectIds];
  const rows = await PostHeartModel.aggregate<{
    _id: string;
    count: number;
  }>([
    {
      $match: {
        post_id: { $in: postIdValues },
      },
    },
    {
      $project: {
        normalizedPostId: { $toString: "$post_id" },
      },
    },
    {
      $group: { _id: "$normalizedPostId", count: { $sum: 1 } },
    },
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

  const userIdValues = idCandidates(userId);
  const objectIds = objectIdCandidates(postIds);
  const postIdValues = [...postIds, ...objectIds];
  const rows = await PostHeartModel.find({
    user_id: { $in: userIdValues },
    post_id: { $in: postIdValues },
  })
    .select({ post_id: 1 })
    .lean();

  return rows.map((row) => row.post_id.toString());
}
