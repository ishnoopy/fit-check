import { beforeEach, describe, expect, it, vi } from "vitest";
import * as conversationRepository from "../repositories/conversation.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import type { CoachQuota } from "../services/coach-access.service.js";
import * as coachAccessService from "../services/coach-access.service.js";
import { loginService, registerService } from "../services/user.service.js";

vi.mock("../repositories/user.repository.js", () => ({
  findOne: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  incrementSuccessfulReferralCountIfBelow: vi.fn(),
  markFirstWorkoutLoggedIfUnset: vi.fn(),
  markReferralRewardGrantedIfUnset: vi.fn(),
}));

vi.mock("../repositories/conversation.repository.js", () => ({
  countUserMessagesByDateRange: vi.fn().mockResolvedValue(0),
}));

vi.mock("../services/coach-access.service.js", async () => {
  const actual = await vi.importActual<typeof coachAccessService>(
    "../services/coach-access.service.js",
  );
  return {
    ...actual,
    createUniqueReferralCode: vi.fn().mockResolvedValue("TESTREFERRAL"),
    resolveReferrerUserIdByCode: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../services/username.service.js", () => ({
  createUniqueUsername: vi.fn().mockResolvedValue("testuser"),
  normalizeUsername: vi.fn((u: string) => u.toLowerCase().trim()),
  isValidUsername: vi.fn().mockReturnValue(true),
}));

// bcrypt is computationally expensive in tests — use a reduced round count via env
process.env.JWT_SECRET = "test-secret-at-least-32-chars-long";

const MOCK_USER_ID = "6936810d0589536bab9e11b6";

const makeUser = (overrides = {}) => ({
  id: MOCK_USER_ID,
  email: "user@example.com",
  password: "$2b$10$hashedpassword",
  username: "testuser",
  role: "user",
  authProvider: "local",
  profileCompleted: false,
  referralCode: "TESTREFERRAL",
  successfulReferralCount: 0,
  ...overrides,
});

describe("loginService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(null);
    await expect(loginService("no@example.com", "pass")).rejects.toThrow(
      "Invalid email and/or password",
    );
  });

  it("throws BadRequestError when user registered via Google", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(
      makeUser({ authProvider: "google", password: undefined }) as any,
    );
    await expect(loginService("user@example.com", "pass")).rejects.toThrow(
      "Please login with Google",
    );
  });

  it("throws BadRequestError on wrong password", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(makeUser() as any);
    // Real bcrypt compare will fail because "wrong" != the stored hash
    await expect(loginService("user@example.com", "wrongpassword")).rejects.toThrow(
      "Invalid email and/or password",
    );
  });
});

describe("registerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws BadRequestError when email already exists", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(makeUser() as any);
    await expect(
      registerService({ email: "user@example.com", password: "password123", role: "user", profileCompleted: false }),
    ).rejects.toThrow("User already exists");
  });

  it("creates user when email is new", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(null);
    vi.mocked(userRepository.createUser).mockResolvedValue(
      makeUser({ password: "$2b$10$hashed" }) as any,
    );
    vi.mocked(userRepository.updateUser).mockResolvedValue(makeUser() as any);

    const result = await registerService({
      email: "new@example.com",
      password: "password123",
      role: "user",
      profileCompleted: false,
    });

    expect(userRepository.createUser).toHaveBeenCalledOnce();
    expect(result).not.toHaveProperty("password");
  });
});

describe("canUseCoach", () => {
  const baseQuota = (overrides: Partial<CoachQuota> = {}): CoachQuota => ({
    usedThisWeek: 0,
    allowedThisWeek: 5,
    remainingThisWeek: 5,
    isUnlimited: false,
    weeklyBaseRequests: 5,
    bonusPerSuccessfulReferral: 10,
    successfulReferrals: 0,
    maxReferrals: 5,
    ...overrides,
  });

  it("returns true when requests remain", () => {
    expect(coachAccessService.canUseCoach(baseQuota({ remainingThisWeek: 1 }))).toBe(true);
  });

  it("returns false when no requests remain", () => {
    expect(coachAccessService.canUseCoach(baseQuota({ remainingThisWeek: 0 }))).toBe(false);
  });

  it("returns true when user is unlimited (pioneer)", () => {
    expect(
      coachAccessService.canUseCoach(
        baseQuota({ remainingThisWeek: 0, isUnlimited: true }),
      ),
    ).toBe(true);
  });
});

describe("getCoachQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns base quota when user has no referrals", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(
      makeUser({ successfulReferralCount: 0, isPioneer: false }) as any,
    );
    vi.mocked(conversationRepository.countUserMessagesByDateRange).mockResolvedValue(2);

    const quota = await coachAccessService.getCoachQuota(MOCK_USER_ID);

    expect(quota.usedThisWeek).toBe(2);
    expect(quota.allowedThisWeek).toBe(5); // COACH_BASE_WEEKLY_REQUESTS default
    expect(quota.remainingThisWeek).toBe(3);
    expect(quota.isUnlimited).toBe(false);
  });

  it("adds referral bonuses to allowed requests", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(
      makeUser({ successfulReferralCount: 2, isPioneer: false }) as any,
    );
    vi.mocked(conversationRepository.countUserMessagesByDateRange).mockResolvedValue(0);

    const quota = await coachAccessService.getCoachQuota(MOCK_USER_ID);

    // 5 base + 2 referrals * 10 bonus = 25
    expect(quota.allowedThisWeek).toBe(25);
    expect(quota.successfulReferrals).toBe(2);
  });

  it("caps referral bonuses at maxReferrals", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(
      makeUser({ successfulReferralCount: 99, isPioneer: false }) as any,
    );
    vi.mocked(conversationRepository.countUserMessagesByDateRange).mockResolvedValue(0);

    const quota = await coachAccessService.getCoachQuota(MOCK_USER_ID);

    // 5 base + 5 (max) * 10 bonus = 55
    expect(quota.allowedThisWeek).toBe(55);
  });

  it("returns unlimited for pioneer users", async () => {
    vi.mocked(userRepository.findOne).mockResolvedValue(
      makeUser({ successfulReferralCount: 0, isPioneer: true }) as any,
    );
    vi.mocked(conversationRepository.countUserMessagesByDateRange).mockResolvedValue(100);

    const quota = await coachAccessService.getCoachQuota(MOCK_USER_ID);

    expect(quota.isUnlimited).toBe(true);
    expect(quota.remainingThisWeek).toBe(Number.MAX_SAFE_INTEGER);
  });
});
