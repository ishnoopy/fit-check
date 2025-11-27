import type { FilterQuery } from 'mongoose';
import UserModel, { type IUser } from '../models/user.model.js';

export async function findAll() {
  return await UserModel.find();
}

export async function findOne(where: FilterQuery<IUser>) {
  return await UserModel.findOne(where);
}

export async function createUser(user: IUser) {
  return await UserModel.create(user);
}