export const up = async (db, client) => {
  // update workout.exercises from array of objectIds to object in the format of :{ exercise: ObjectId, restTime: number, isActive: boolean }
  // update workout.exercises.exercise from {exercise_id -> exercise} and add default values for restTime and isActive

  const workouts = await db.collection("workouts").find({}).toArray();
  const bulkOps = [];
  for (const workout of workouts) {
    const updatedExercises = [];
    for (const exercise of workout.exercises) {
      if (typeof exercise !== "string" && typeof exercise === "object") {
        const exerciseDetails = await db
          .collection("exercises")
          .findOne({ _id: exercise });
        updatedExercises.push({
          exercise: exercise,
          rest_time: exerciseDetails?.rest_time || 0, // default rest time in seconds
          is_active:
            exerciseDetails?.active !== undefined
              ? exerciseDetails.active
              : true, // default active status
        });
      } else if (exercise.exercise_id) {
        updatedExercises.push({
          exercise: exercise.exercise_id,
          rest_time: exercise.rest_time || 0,
          is_active:
            exercise.is_active !== undefined ? exercise.is_active : true,
        });
      } else {
        updatedExercises.push(exercise); // if it's already in the correct format, return as is
      }
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: workout._id },
        update: { $set: { exercises: updatedExercises } },
      },
    });
  }
  if (bulkOps.length > 0) {
    const result = await db.collection("workouts").bulkWrite(bulkOps);
    console.log(`Modified ${result.modifiedCount} workouts`);
  } else {
    console.log("No workouts to update");
  }
};

export const down = async (db, client) => {};
