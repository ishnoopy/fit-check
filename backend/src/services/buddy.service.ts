import mongoose from "mongoose";
import * as buddyRepository from "../repositories/buddy.repository.js";
import * as buddyNudgeRepository from "../repositories/buddy-nudge.repository.js";
import * as followRepository from "../repositories/follow.repository.js";
import * as settingRepository from "../repositories/setting.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import { getDaysDifference } from "../utils/index.js";

// ─── Helpers ────────────────────────────────────────────────────────────

function getUTCDate(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Calculate the streak from a set of shared nudge dates.
 *
 * Walk from the most recent shared date backwards. Consecutive dates with
 * gaps ≤ effectiveMaxRestDays are part of the same streak segment. The
 * current streak includes buffer/rest days between actual nudge days, and
 * any elapsed days since the last shared nudge date (as long as they're
 * within the rest-day buffer).
 */
function calculateStreak(
  sharedDates: Date[],
  effectiveMaxRestDays: number,
  today: Date,
): {
  currentCount: number;
  longestCount: number;
  lastActiveDate: Date | null;
  isActive: boolean;
} {
  if (sharedDates.length === 0) {
    return {
      currentCount: 0,
      longestCount: 0,
      lastActiveDate: null,
      isActive: false,
    };
  }

  // Sort ascending (oldest → newest)
  const sorted = [...sharedDates].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const mostRecent = sorted[sorted.length - 1];

  // Check streak freshness
  const daysSinceMostRecent = getDaysDifference(today, mostRecent);
  const isActive = daysSinceMostRecent <= effectiveMaxRestDays;

  // Walk from most-recent backwards to count the current streak
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const daysDifference = getDaysDifference(sorted[i], sorted[i - 1]);
    const restDaysConsumed = daysDifference - 1;
    if (restDaysConsumed <= effectiveMaxRestDays) {
      streak += daysDifference;
    } else {
      break;
    }
  }

  // Add elapsed buffer days since the most recent shared date
  if (
    daysSinceMostRecent <= effectiveMaxRestDays + 1 &&
    daysSinceMostRecent > 0
  ) {
    streak += daysSinceMostRecent - 1;
  }

  // Calculate the longest streak across ALL segments
  let longestStreak = streak;
  let segmentStart = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const daysDiff = getDaysDifference(sorted[i + 1], sorted[i]);
    if (daysDiff - 1 > effectiveMaxRestDays) {
      const segmentLength =
        getDaysDifference(sorted[i], sorted[segmentStart]) + 1;
      if (segmentLength > longestStreak) longestStreak = segmentLength;
      segmentStart = i + 1;
    }
  }
  const lastSegmentLength =
    getDaysDifference(sorted[sorted.length - 1], sorted[segmentStart]) + 1;
  if (lastSegmentLength > longestStreak) longestStreak = lastSegmentLength;

  return {
    currentCount: isActive ? streak : 0,
    longestCount: longestStreak,
    lastActiveDate: mostRecent,
    isActive,
  };
}

async function getEffectiveMaxRestDays(
  userAId: string,
  userBId: string,
): Promise<number> {
  const [settingA, settingB] = await Promise.all([
    settingRepository.findByUserId(userAId),
    settingRepository.findByUserId(userBId),
  ]);
  return Math.max(
    settingA?.settings?.restDays ?? 0,
    settingB?.settings?.restDays ?? 0,
  );
}

/**
 * Produce canonical user IDs for a buddy pair (lower string first).
 */
function canonicalPair(userAId: string, userBId: string): [string, string] {
  return [userAId, userBId].sort() as [string, string];
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Establish a buddy relationship between two users.
 * Requirements: they must be mutual followers and not already buddies.
 */
export async function establishBuddy(
  currentUserId: string,
  targetUserId: string,
) {
  if (targetUserId === currentUserId) {
    throw new BadRequestError("You cannot be buddies with yourself");
  }

  // Must be mutual followers
  const areMutual = await followRepository.areMutualFollowers(
    currentUserId,
    targetUserId,
  );
  if (!areMutual) {
    throw new BadRequestError(
      "You must be mutual followers to become gym buddies",
    );
  }

  // Check no existing active buddy between these two
  const existing = await buddyRepository.findActiveBuddyByUserIds(
    currentUserId,
    targetUserId,
  );
  if (existing) {
    throw new BadRequestError("You are already gym buddies with this user");
  }

  const buddy = await buddyRepository.createBuddy(currentUserId, targetUserId);

  const [aId, bId] = canonicalPair(currentUserId, targetUserId);
  const [userA, userB] = await Promise.all([
    userRepository.findOne({ id: aId }),
    userRepository.findOne({ id: bId }),
  ]);

  return {
    ...buddy,
    userA: userA
      ? { id: userA.id, username: userA.username, firstName: userA.firstName, lastName: userA.lastName, avatar: userA.avatar }
      : null,
    userB: userB
      ? { id: userB.id, username: userB.username, firstName: userB.firstName, lastName: userB.lastName, avatar: userB.avatar }
      : null,
  };
}

/**
 * Send a nudge to your gym buddy for today.
 * One nudge per person per buddy per day.
 */
export async function sendNudge(buddyId: string, senderId: string) {
  const buddy = await buddyRepository.findBuddyById(buddyId);
  if (!buddy) {
    throw new NotFoundError("Buddy relationship not found");
  }
  if (buddy.endedAt) {
    throw new BadRequestError("This buddy relationship has ended");
  }

  const buddyUserIds = [buddy.userAId.toString(), buddy.userBId.toString()];
  if (!buddyUserIds.includes(senderId)) {
    throw new BadRequestError("You are not a member of this buddy pair");
  }

  const today = getUTCDate();

  // Check not already nudged today
  const existingNudge = await buddyNudgeRepository.findNudge(
    buddyId,
    senderId,
    today,
  );
  if (existingNudge) {
    throw new BadRequestError("Bro fist already made today!");
  }

  const nudge = await buddyNudgeRepository.createNudge(buddyId, senderId, today);

  // Recalculate streak
  const otherUserId = buddyUserIds.find((id) => id !== senderId)!;
  const effectiveMaxRestDays = await getEffectiveMaxRestDays(senderId, otherUserId);

  // Get all nudges for this buddy
  const allNudgeDates = await buddyNudgeRepository.findNudgeDatesByBuddy(buddyId);

  // Find dates where BOTH users nudged
  const senderDates = new Set<string>();
  const otherDates = new Set<string>();

  for (const date of allNudgeDates) {
    const dateStr = date.toISOString().slice(0, 10);
    // We need to group by date and check both senders
  }

  // More efficient: get nudge dates per user and find intersection
  const [myDates, theirDates] = await Promise.all([
    buddyNudgeRepository.findNudgeDatesByBuddyAndUser(buddyId, senderId),
    buddyNudgeRepository.findNudgeDatesByBuddyAndUser(buddyId, otherUserId),
  ]);

  const myDateSet = new Set(myDates.map((d) => d.toISOString().slice(0, 10)));
  const sharedDates = theirDates.filter((d) =>
    myDateSet.has(d.toISOString().slice(0, 10)),
  );

  const streakResult = calculateStreak(
    sharedDates,
    effectiveMaxRestDays,
    today,
  );

  await buddyRepository.updateBuddyStreak(buddyId, {
    currentCount: streakResult.currentCount,
    longestCount: Math.max(streakResult.longestCount, buddy.streak.longestCount),
    lastActiveDate: streakResult.lastActiveDate ?? today,
  });

  const updatedBuddy = await buddyRepository.findBuddyById(buddyId);

  return {
    nudge,
    streak: updatedBuddy?.streak ?? buddy.streak,
  };
}

/**
 * Get the nudge status for today.
 */
export async function getNudgeStatus(buddyId: string, userId: string) {
  const buddy = await buddyRepository.findBuddyById(buddyId);
  if (!buddy) {
    throw new NotFoundError("Buddy relationship not found");
  }

  const buddyUserIds = [buddy.userAId.toString(), buddy.userBId.toString()];
  if (!buddyUserIds.includes(userId)) {
    throw new BadRequestError("You are not a member of this buddy pair");
  }

  const otherUserId = buddyUserIds.find((id) => id !== userId)!;
  const today = getUTCDate();

  const [myNudge, theirNudge] = await Promise.all([
    buddyNudgeRepository.findNudge(buddyId, userId, today),
    buddyNudgeRepository.findNudge(buddyId, otherUserId, today),
  ]);

  return {
    iNudgedToday: Boolean(myNudge),
    theyNudgedToday: Boolean(theirNudge),
    today,
    buddy: {
      id: buddy.id,
      streak: buddy.streak,
    },
  };
}

/**
 * List my active buddies with their streak info and partner details.
 */
export async function listBuddies(userId: string) {
  const buddies = await buddyRepository.findActiveBuddiesByUserId(userId);

  if (buddies.length === 0) return [];

  // Gather partner user IDs and fetch their profiles
  const partnerIds = buddies.map((b) => {
    const aId = b.userAId.toString();
    const bId = b.userBId.toString();
    return aId === userId ? bId : aId;
  });

  const partners = await userRepository.findByIds(partnerIds);
  const partnerMap = new Map(
    partners.map((p) => [p.id as string, p]),
  );

  return buddies.map((buddy) => {
    const aId = buddy.userAId.toString();
    const bId = buddy.userBId.toString();
    const partnerId = aId === userId ? bId : aId;
    const partner = partnerMap.get(partnerId);

    return {
      id: buddy.id,
      establishedAt: buddy.establishedAt,
      streak: buddy.streak,
      partner: partner
        ? {
            id: partner.id,
            username: partner.username,
            firstName: partner.firstName,
            lastName: partner.lastName,
            avatar: partner.avatar,
          }
        : null,
    };
  });
}

/**
 * Get a single buddy relationship with full details.
 */
export async function getBuddyDetail(buddyId: string, userId: string) {
  const buddy = await buddyRepository.findBuddyById(buddyId);
  if (!buddy) {
    throw new NotFoundError("Buddy relationship not found");
  }

  const buddyUserIds = [buddy.userAId.toString(), buddy.userBId.toString()];
  if (!buddyUserIds.includes(userId)) {
    throw new BadRequestError("You are not a member of this buddy pair");
  }

  const [userA, userB] = await Promise.all([
    userRepository.findOne({ id: buddy.userAId.toString() }),
    userRepository.findOne({ id: buddy.userBId.toString() }),
  ]);

  return {
    ...buddy,
    userA: userA
      ? {
          id: userA.id,
          username: userA.username,
          firstName: userA.firstName,
          lastName: userA.lastName,
          avatar: userA.avatar,
        }
      : null,
    userB: userB
      ? {
          id: userB.id,
          username: userB.username,
          firstName: userB.firstName,
          lastName: userB.lastName,
          avatar: userB.avatar,
        }
      : null,
  };
}

/**
 * End a buddy relationship. Either user can end it.
 */
export async function endBuddy(buddyId: string, userId: string) {
  const buddy = await buddyRepository.findBuddyById(buddyId);
  if (!buddy) {
    throw new NotFoundError("Buddy relationship not found");
  }

  const buddyUserIds = [buddy.userAId.toString(), buddy.userBId.toString()];
  if (!buddyUserIds.includes(userId)) {
    throw new BadRequestError("You are not a member of this buddy pair");
  }

  if (buddy.endedAt) {
    throw new BadRequestError("This buddy relationship has already ended");
  }

  await buddyRepository.endBuddy(buddyId);
  return { success: true };
}

/**
 * Get the effective max rest days for a buddy pair.
 */
export async function getBuddyEffectiveRestDays(
  buddyId: string,
  userId: string,
) {
  const buddy = await buddyRepository.findBuddyById(buddyId);
  if (!buddy) {
    throw new NotFoundError("Buddy relationship not found");
  }

  const buddyUserIds = [buddy.userAId.toString(), buddy.userBId.toString()];
  if (!buddyUserIds.includes(userId)) {
    throw new BadRequestError("You are not a member of this buddy pair");
  }

  const effectiveMaxRestDays = await getEffectiveMaxRestDays(
    buddy.userAId.toString(),
    buddy.userBId.toString(),
  );

  return { effectiveMaxRestDays };
}
