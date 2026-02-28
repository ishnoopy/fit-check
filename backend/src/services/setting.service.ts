import type { ISetting } from "../models/setting.model.js";
import * as settingRepository from "../repositories/setting.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

export async function getSettingByUserIdService(userId: string) {
  const setting = await settingRepository.findByUserId(userId);

  if (!setting) {
    throw new NotFoundError("Setting not found");
  }

  // Verify ownership
  if ((setting.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to setting");
  }

  return setting;
}

export async function createSettingService(
  payload: Omit<ISetting, "userId">,
  userId: string,
) {
  // Check if setting already exists for this user
  const existingSetting = await settingRepository.findByUserId(userId);

  if (existingSetting) {
    throw new BadRequestError(
      "Setting already exists for this user. Use update instead.",
    );
  }

  const setting = await settingRepository.createSetting({
    ...payload,
    userId: userId,
  });
  return setting;
}

export async function updateSettingService(
  payload: Partial<Omit<ISetting, "userId">>,
  userId: string,
) {
  const existingSetting = await settingRepository.findByUserId(userId);

  if (!existingSetting) {
    throw new NotFoundError("Setting not found");
  }

  // Verify ownership
  if ((existingSetting.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to setting");
  }

  return await settingRepository.updateSetting(existingSetting.id as string, {
    ...payload,
    userId: userId,
  });
}

export async function upsertSettingService(
  payload: Partial<Omit<ISetting, "userId">>,
  userId: string,
) {
  return await settingRepository.updateSettingByUserId(userId, {
    ...payload,
    userId: userId,
  });
}

export async function deleteSettingService(userId: string) {
  const existingSetting = await settingRepository.findByUserId(userId);

  if (!existingSetting) {
    throw new NotFoundError("Setting not found");
  }

  // Verify ownership
  if ((existingSetting.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to setting");
  }

  return await settingRepository.deleteSetting(existingSetting.id as string);
}
