import type { FilterQuery } from "mongoose";
import UserModel, { type IUser } from "../models/user.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

export async function findAll() {
  const users = await UserModel.find().lean();
  return toCamelCase(users) as IUser[];
}

export async function findOne(where: FilterQuery<IUser>) {
  const query = toSnakeCase(where);
  const user = await UserModel.findOne(query).lean();
  return user ? (toCamelCase(user) as IUser) : null;
}

export async function createUser(user: IUser) {
  const payload = toSnakeCase(user);
  const doc = await UserModel.create(payload);
  return toCamelCase(doc.toObject()) as IUser;
}

export async function updateUser(id: string, user: Partial<IUser>) {
  const payload = toSnakeCase(user);
  const doc = await UserModel.findByIdAndUpdate(id, payload, {
    new: true,
    lean: true,
  }).lean();
  return doc ? (toCamelCase(doc) as IUser) : null;
}
