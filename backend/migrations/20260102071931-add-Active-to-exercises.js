//NOTES: db parameter is already connected to the database by this library

export const up = async (db, client) => {
  const result = await db
    .collection("exercises")
    .updateMany({ active: { $exists: false } }, { $set: { active: true } });
  console.log(`Active field added to ${result.modifiedCount} exercises`);
};

export const down = async (db, client) => {
  const result = await db
    .collection("exercises")
    .updateMany({ active: true }, { $unset: { active: "" } });
  console.log(`Active field removed from ${result.modifiedCount} exercises`);
};
