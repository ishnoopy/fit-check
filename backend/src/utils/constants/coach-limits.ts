const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

export const COACH_BASE_WEEKLY_REQUESTS = parsePositiveInt(
  process.env.COACH_BASE_WEEKLY_REQUESTS,
  5,
);

export const COACH_REFERRAL_BONUS_REQUESTS = parsePositiveInt(
  process.env.COACH_REFERRAL_BONUS_REQUESTS,
  10,
);

export const COACH_MAX_REFERRALS = parsePositiveInt(
  process.env.COACH_MAX_REFERRALS,
  5,
);

export const DEFAULT_REFERRAL_CODE_LENGTH = parsePositiveInt(
  process.env.REFERRAL_CODE_LENGTH,
  8,
);
