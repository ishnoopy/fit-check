const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;

function sanitizeUsernameBase(raw) {
  const cleaned = String(raw || "")
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

function buildCandidate(base, suffix) {
  if (suffix === 0) {
    return base;
  }

  const suffixText = `_${suffix}`;
  const maxBaseLength = USERNAME_MAX_LENGTH - suffixText.length;
  const baseWithRoom = base.slice(0, Math.max(1, maxBaseLength));
  return `${baseWithRoom}${suffixText}`;
}

export const up = async (db) => {
  const usersCollection = db.collection("users");

  const existingUsernames = await usersCollection.distinct("username", {
    username: { $type: "string", $ne: "" },
  });
  const used = new Set(existingUsernames.map((value) => value.toLowerCase()));

  const users = await usersCollection
    .find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" },
      ],
    })
    .toArray();

  for (const user of users) {
    const seed =
      `${user.first_name || ""}_${user.last_name || ""}`.replace(/^_+|_+$/g, "") ||
      String(user.email || "user").split("@")[0] ||
      "user";
    const base = sanitizeUsernameBase(seed);

    let suffix = 0;
    let candidate = buildCandidate(base, suffix);
    while (used.has(candidate)) {
      suffix += 1;
      candidate = buildCandidate(base, suffix);
    }

    used.add(candidate);
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { username: candidate } },
    );
  }

  await usersCollection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: "username_1" },
  );
};

export const down = async (db) => {
  const usersCollection = db.collection("users");
  await usersCollection.updateMany({}, { $unset: { username: "" } });
  try {
    await usersCollection.dropIndex("username_1");
  } catch (error) {
    // no-op if index does not exist
  }
};
