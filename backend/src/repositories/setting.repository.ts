import type { FilterQuery } from "mongoose";
import SettingModel, { type ISetting } from "../models/setting.model.js";
import { toCamelCase, toSnakeCase } from "../utils/transformer.js";

export async function findAll(where: FilterQuery<ISetting> = {}) {
  const query = toSnakeCase(where);
  const settings = await SettingModel.find(query).lean();
  return toCamelCase(settings) as ISetting[];
}

export async function findOne(where: FilterQuery<ISetting> = {}) {
  const query = toSnakeCase(where);
  const setting = await SettingModel.findOne(query).lean();
  return setting ? (toCamelCase(setting) as ISetting) : null;
}

export async function findById(id: string) {
  const setting = await SettingModel.findById(id).lean();
  return setting ? (toCamelCase(setting) as ISetting) : null;
}

export async function findByUserId(userId: string) {
  const setting = await SettingModel.findOne({ user_id: userId }).lean();
  return setting ? (toCamelCase(setting) as ISetting) : null;
}

export async function createSetting(setting: ISetting) {
  const payload = toSnakeCase(setting);
  const doc = await SettingModel.create(payload);
  return toCamelCase(doc.toObject()) as ISetting;
}

export async function updateSetting(id: string, setting: Partial<ISetting>) {
  const payload = toSnakeCase(setting);
  const doc = await SettingModel.findByIdAndUpdate(id, payload, {
    new: true,
    lean: true,
  }).lean();
  return doc ? (toCamelCase(doc) as ISetting) : null;
}

export async function updateSettingByUserId(
  userId: string,
  setting: Partial<ISetting>,
) {
  const payload = toSnakeCase(setting);
  const doc = await SettingModel.findOneAndUpdate(
    { user_id: userId },
    payload,
    { new: true, lean: true, upsert: true },
  ).lean();
  return doc ? (toCamelCase(doc) as ISetting) : null;
}

export async function deleteSetting(id: string) {
  const doc = await SettingModel.findByIdAndDelete(id).lean();
  return doc ? (toCamelCase(doc) as ISetting) : null;
}
