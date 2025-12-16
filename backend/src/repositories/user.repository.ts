import type { FilterQuery } from 'mongoose';
import UserModel, { type IUser } from '../models/user.model.js';

export async function findAll() {
  return await UserModel.find().lean();
}

export async function findOne(where: FilterQuery<IUser>) {
  return await UserModel.findOne(where).lean();
}

export async function createUser(user: Omit<IUser, '_id'>) {
  const doc = await UserModel.create(user);
  return doc.toObject();
}

export async function updateUser(id: string, user: Partial<IUser>) {
  return await UserModel.findByIdAndUpdate(id, user, { new: true, lean: true });
}
