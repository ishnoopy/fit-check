export const up = async (db, client) => {
  const exercises = await db
    .collection("exercises")
    .find({ user_id: { $exists: true } })
    .toArray();

  for (const exercise of exercises) {
    const foo = {
      "pull down": "Wide-Grip Lat Pulldown",
      "preacher curls": "Preacher Curl",
      "seated bicep curls": "Seated Dumbbell Curl",
      "seatef bicep curls": "Seated Dumbbell Curl",
      "seated hammer curls": "Incline Hammer Curls",
      "seated hammer curls": "Incline Hammer Curls",
      "dumbbell press": "Dumbbell Bench Press",
      "dumbell press": "Dumbbell Bench Press",
      "db shoulder press": "Dumbbell Shoulder Press",
      "db lateral raise": "Seated Side Lateral Raise",
      "single cable tricep extension": "Cable One Arm Tricep Extension",
      "overhead tricep extensions": "Cable Rope Overhead Triceps Extension",
      "tricep dips": "Dips - Triceps Version",
      "seated chest press": "Leverage Chest Press",
      "bar triceps pushdown": "Triceps Pushdown",
      "shiuldrr press": "Dumbbell Shoulder Press",
      "lateral raise": "Seated Side Lateral Raise",
      "single cable tricel extension": "Cable One Arm Tricep Extension",
      "overhead triceo extension": "Cable Rope Overhead Triceps Extension",
      "seated chest press": "Leverage Chest Press",
      "bar triceps pushdown": "Triceps Pushdown",
      "chest supported rows": "Leverage Iso Row",
      "leg extension": "Leg Extensions",
      squats: "Hack Squat",
      "hip thrust": "Barbell Hip Thrust",
      "leg curl": "Seated Leg Curl",
      "calf raises": "Seated Calf Raise",
      "calf raise": "Seated Calf Raise",
      "bulgarian split squat": "Split Squat with Dumbbells",
      "squat machine": "Hack Squat",
      "flat bench dumbbell press": "Dumbbell Bench Press",
      "shoulder press": "Dumbbell Shoulder Press",
      "tricep pushdown": "Triceps Pushdown",
      "overhead tricep extension": "Cable Rope Overhead Triceps Extension",
      "wrist curls": "Cable Wrist Curl",
      "inclined dumbbell press": "Incline Dumbbell Press",
      "back extensions": "Hyperextensions (Back Extensions)",
      "ab curl": "Ab Crunch Machine",
      "barbell curl": "Barbell Curl",
      "incline dumbbell press": "Incline Dumbbell Press",
      "preacher curls": "Preacher Curl",
      "incline dumbbell press": "Incline Dumbbell Press",
      "leg press": "Leg Press",
      "hammer curls": "Incline Hammer Curls",
    };

    // get the matching exercise from the foo object and update the workout.exercises.exercise with the new exercise id and the logs exercise_id with the new exercise id
    const sanitizedName = exercise.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    const matchingExercise = foo[sanitizedName];
    if (matchingExercise) {
      console.log(`Exercise ${exercise.name} -> ${matchingExercise}`);

      const newExercise = await db
        .collection("exercises")
        .findOne({ name: matchingExercise, user_id: { $exists: false } });
      console.log(`✅New Exercise ${newExercise.name}`);
      // update the workout.exercises.exercise with the new exercise id

      if (newExercise) {
        // Update all workouts that contain this exercise in their exercises array
        const workoutUpdateResult = await db.collection("workouts").updateMany(
          { "exercises.exercise": exercise._id },
          {
            $set: {
              "exercises.$[elem].exercise": newExercise._id,
            },
          },
          {
            arrayFilters: [{ "elem.exercise": exercise._id }],
          },
        );
        console.log(
          `✅ Updated ${workoutUpdateResult.modifiedCount} workout(s) to use ${newExercise.name}`,
        );

        // Update all logs that reference this exercise
        const logUpdateResult = await db
          .collection("logs")
          .updateMany(
            { exercise_id: exercise._id },
            { $set: { exercise_id: newExercise._id } },
          );
        console.log(
          `✅ Updated ${logUpdateResult.modifiedCount} log(s) to use ${newExercise.name}`,
        );

        // Delete the old exercise
        const deleteResult = await db
          .collection("exercises")
          .deleteOne({ _id: exercise._id });
        console.log(`✅ Deleted ${deleteResult.deletedCount} exercise(s)`);
      }
    } else {
      console.log(
        `❌ Exercise ${exercise.name} does not exist in the foo object`,
      );
    }
  }
};

export const down = async (db, client) => {};
