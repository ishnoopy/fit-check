import { randomBytes } from "crypto";
import type { IUser } from "../models/user.model.js";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  COACH_BASE_WEEKLY_REQUESTS,
  COACH_MAX_REFERRALS,
  COACH_REFERRAL_BONUS_REQUESTS,
  DEFAULT_REFERRAL_CODE_LENGTH,
} from "../utils/constants/coach-limits.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

export interface CoachQuota {
  usedThisWeek: number;
  allowedThisWeek: number;
  remainingThisWeek: number;
  isUnlimited: boolean;
  weeklyBaseRequests: number;
  bonusPerSuccessfulReferral: number;
  successfulReferrals: number;
  maxReferrals: number;
  referralCode?: string;
}

function getUtcWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setUTCDate(now.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

function computeAllowedRequests(successfulReferrals: number): number {
  const clampedReferrals = Math.max(
    0,
    Math.min(successfulReferrals, COACH_MAX_REFERRALS),
  );

  return (
    COACH_BASE_WEEKLY_REQUESTS +
    clampedReferrals * COACH_REFERRAL_BONUS_REQUESTS
  );
}

function generateReferralCode(length: number): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

export async function createUniqueReferralCode(
  length: number = DEFAULT_REFERRAL_CODE_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateReferralCode(length);
    const existing = await userRepository.findOne({ referralCode: candidate });
    if (!existing) {
      return candidate;
    }
  }

  throw new BadRequestError("Failed to generate unique referral code");
}

export async function resolveReferrerUserIdByCode(
  referralCode?: string,
): Promise<string | undefined> {
  if (!referralCode) {
    return undefined;
  }

  const normalized = referralCode.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  const referrer = await userRepository.findOne({ referralCode: normalized });
  if (!referrer?.id) {
    throw new BadRequestError("Invalid referral code");
  }

  return referrer.id;
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await userRepository.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  const referralCode = await createUniqueReferralCode();
  await userRepository.updateUser(userId, { referralCode });

  return referralCode;
}

export async function getCoachQuota(userId: string): Promise<CoachQuota> {
  const user = await userRepository.findOne({ id: userId });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const { start, end } = getUtcWeekRange();
  const usedThisWeek = await conversationRepository.countUserMessagesByDateRange(
    userId,
    start,
    end,
  );

  const successfulReferrals = user.successfulReferralCount ?? 0;
  const allowedThisWeek = computeAllowedRequests(successfulReferrals);
  const isUnlimited = Boolean(user.isPioneer);
  const remainingThisWeek = Math.max(0, allowedThisWeek - usedThisWeek);

  return {
    usedThisWeek,
    allowedThisWeek,
    remainingThisWeek: isUnlimited ? Number.MAX_SAFE_INTEGER : remainingThisWeek,
    isUnlimited,
    weeklyBaseRequests: COACH_BASE_WEEKLY_REQUESTS,
    bonusPerSuccessfulReferral: COACH_REFERRAL_BONUS_REQUESTS,
    successfulReferrals,
    maxReferrals: COACH_MAX_REFERRALS,
    referralCode: user.referralCode,
  };
}

export async function applyReferralRewardOnFirstWorkout(
  referredUserId: string,
): Promise<void> {
  const referredUser = await userRepository.findOne({ id: referredUserId });

  if (!referredUser?.id || !referredUser.referredByUserId) {
    return;
  }

  const now = new Date();
  const firstWorkoutMarked = await userRepository.markFirstWorkoutLoggedIfUnset(
    referredUser.id,
    now,
  );
  if (!firstWorkoutMarked) {
    return;
  }

  const referrerId = String(referredUser.referredByUserId);
  const referrer = await userRepository.findOne({ id: referrerId });
  if (!referrer?.id) {
    return;
  }

  const incremented = await userRepository.incrementSuccessfulReferralCountIfBelow(
    referrer.id,
    COACH_MAX_REFERRALS,
  );
  if (!incremented) {
    return;
  }

  await userRepository.markReferralRewardGrantedIfUnset(referredUser.id, now);
}

export function buildInvitationLink(referralCode: string): string {
  const base = process.env.FRONTEND_URL || "";
  if (!base) {
    return `/register?ref=${encodeURIComponent(referralCode)}`;
  }

  return `${base.replace(/\/$/, "")}/register?ref=${encodeURIComponent(referralCode)}`;
}

export function canUseCoach(quota: CoachQuota): boolean {
  return quota.isUnlimited || quota.remainingThisWeek > 0;
}
