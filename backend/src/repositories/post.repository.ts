import PostModel, { type IPost } from "../models/post.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

export async function createPost(post: IPost) {
  const payload = toSnakeCase(post);
  const doc = await PostModel.create(payload);
  return toCamelCase(doc.toObject()) as IPost;
}

export async function findById(id: string) {
  const doc = await PostModel.findById(id).lean();
  return doc ? (toCamelCase(doc) as IPost) : null;
}

export async function countByUserId(userId: string) {
  return PostModel.countDocuments({ user_id: userId });
}

export async function findByUserId(userId: string, limit = 30) {
  const docs = await PostModel.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
  return toCamelCase(docs) as IPost[];
}

export async function findFeedPosts({
  tab,
  userId,
  followeeIds,
  page,
  limit,
}: {
  tab: "explore" | "following";
  userId: string;
  followeeIds: string[];
  page: number;
  limit: number;
}) {
  const query =
    tab === "following"
      ? { user_id: { $in: followeeIds } }
      : { user_id: { $nin: [userId, ...followeeIds] } };

  const skip = (page - 1) * limit;
  const docs = await PostModel.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;

  return {
    data: toCamelCase(pageDocs) as IPost[],
    hasMore,
  };
}
