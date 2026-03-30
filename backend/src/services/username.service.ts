import * as UserRepository from "../repositories/user.repository.js";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

function sanitizeUsernameBase(raw: string) {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const fallback = cleaned || "user";
  const trimmed = fallback.slice(0, USERNAME_MAX_LENGTH);

  if (trimmed.length >= USERNAME_MIN_LENGTH) {
    return trimmed;
  }

  return `${trimmed}${"user".slice(0, USERNAME_MIN_LENGTH - trimmed.length)}`;
}

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_REGEX.test(value);
}

export async function createUniqueUsername(seed: string) {
  const base = sanitizeUsernameBase(seed);

  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await UserRepository.findOne({ username: candidate });
    if (!existing) {
      return candidate;
    }

    suffix += 1;
    const suffixText = `_${suffix}`;
    const maxBaseLength = USERNAME_MAX_LENGTH - suffixText.length;
    const baseWithRoom = base.slice(0, Math.max(1, maxBaseLength));
    candidate = `${baseWithRoom}${suffixText}`;
  }
}
