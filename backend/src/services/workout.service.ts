import type { FilterQuery } from "mongoose";
import type { IExercise } from "../models/exercise.model.js";
import type { IPlan } from "../models/plan.model.js";
import type { IWorkout } from "../models/workout.model.js";
import * as planRepository from "../repositories/plan.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import * as exerciseService from "./exercise.service.js";

type WorkoutExerciseItem = IWorkout["exercises"][number];

function getExerciseId(exerciseItem: WorkoutExerciseItem): string {
  if (typeof exerciseItem.exercise === "string") {
    return exerciseItem.exercise;
  }

  const exercise = exerciseItem.exercise as { id?: string; _id?: string };
  return exercise.id ?? exercise._id ?? "";
}

function normalizeExercisesOrder(
  exercises: WorkoutExerciseItem[],
): WorkoutExerciseItem[] {
  const withIndex = exercises.map((exercise, index) => ({ exercise, index }));
  const activeExercises = withIndex.filter(({ exercise }) => exercise.isActive);
  const inactiveExercises = withIndex.filter(
    ({ exercise }) => !exercise.isActive,
  );

  const sortByOrderThenIndex = (
    a: { exercise: WorkoutExerciseItem; index: number },
    b: { exercise: WorkoutExerciseItem; index: number },
  ) => {
    const aOrder = a.exercise.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.exercise.order ?? Number.MAX_SAFE_INTEGER;
    return aOrder === bOrder ? a.index - b.index : aOrder - bOrder;
  };

  const normalizedActive = activeExercises
    .sort(sortByOrderThenIndex)
    .map(({ exercise }, index) => ({
      ...exercise,
      order: index + 1,
    }));

  const normalizedInactive = inactiveExercises.map(({ exercise }) => ({
    ...exercise,
    order: null,
  }));

  return [...normalizedActive, ...normalizedInactive];
}

export async function getAllWorkoutsService(
  userId: string,
  filters?: { planId?: string; active?: boolean },
) {
  const filter: FilterQuery<IWorkout> = { userId, ...filters };
  return await workoutRepository.findAll(filter);
}

export async function getWorkoutByIdService(id: string, userId: string) {
  const workout = await workoutRepository.findById(id);
  if (!workout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if ((workout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return workout;
}

export async function createWorkoutWithExercisesService(
  payload: Omit<IWorkout, "exercises" | "userId"> & {
    exercises: Array<Omit<IExercise, "userId">>;
  },
  userId: string,
) {
  const exercises = await exerciseService.createExercisesBulkService(
    payload.exercises.map((exercise) => ({
      name: exercise.name,
      description: exercise.description,
      notes: exercise.notes,
      active: true,
      restTime: exercise.restTime,
      images: exercise.images,
      mechanic: exercise.mechanic,
      equipment: exercise.equipment,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
    })),
    userId,
  );

  const workout = await workoutRepository.createWorkout({
    ...payload,
    userId: userId,
    exercises: [
      ...exercises.map((exercise, index) => {
        return {
          exercise: exercise.id as string,
          restTime: exercise.restTime,
          isActive: true,
          order: index + 1,
        };
      }),
    ],
  });

  // Then update the plan with the new workout's _id
  const plan = await planRepository.findById(payload.planId as string);
  if (!plan) {
    throw new NotFoundError("Plan not found");
  }
  const updatedWorkouts = [...plan.workouts, workout.id as string];
  await planRepository.updatePlan(
    payload.planId as string,
    {
      workouts: updatedWorkouts,
    } as IPlan,
  );

  return workout;
}

export async function createWorkoutService(
  payload: Omit<IWorkout, "userId">,
  userId: string,
) {
  const normalizedExercises = payload.exercises
    ? normalizeExercisesOrder(payload.exercises as WorkoutExerciseItem[])
    : [];

  // Create the workout first to get the _id
  const newWorkout = await workoutRepository.createWorkout({
    ...payload,
    userId: userId,
    exercises: normalizedExercises,
  });

  // Then update the plan with the new workout's _id
  if (payload.planId) {
    const plan = await planRepository.findById(payload.planId as string);
    if (plan) {
      const updatedWorkouts = [...plan.workouts, newWorkout.id as string];
      await planRepository.updatePlan(
        payload.planId as string,
        {
          workouts: updatedWorkouts,
        } as IPlan,
      );
    }
  }
  return newWorkout;
}

export async function updateWorkoutService(
  id: string,
  payload: Partial<Omit<IWorkout, "userId">>,
  userId: string,
) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if ((existingWorkout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  const payloadWithUserId = { ...payload, userId: userId } as Partial<IWorkout>;

  if (payload.exercises) {
    payloadWithUserId.exercises = normalizeExercisesOrder(
      payload.exercises as WorkoutExerciseItem[],
    );
  }

  return await workoutRepository.updateWorkout(id, payloadWithUserId);
}

export async function reorderWorkoutExercisesService(
  workoutId: string,
  exerciseIds: string[],
  userId: string,
) {
  const existingWorkout = await workoutRepository.findById(workoutId);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  if ((existingWorkout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  const activeExercises = existingWorkout.exercises.filter(
    (exercise) => exercise.isActive,
  );
  const inactiveExercises = existingWorkout.exercises.filter(
    (exercise) => !exercise.isActive,
  );

  if (exerciseIds.length !== activeExercises.length) {
    throw new BadRequestError(
      "Exercise IDs must include all active workout exercises",
    );
  }

  const uniqueExerciseIds = new Set(exerciseIds);
  if (uniqueExerciseIds.size !== exerciseIds.length) {
    throw new BadRequestError("Exercise IDs must be unique");
  }

  const activeExerciseById = new Map(
    activeExercises.map((exercise) => [getExerciseId(exercise), exercise]),
  );

  for (const exerciseId of exerciseIds) {
    if (!activeExerciseById.has(exerciseId)) {
      throw new BadRequestError(
        "Exercise IDs can only include active workout exercises",
      );
    }
  }

  const reorderedActiveExercises = exerciseIds.map((exerciseId, index) => {
    const exercise = activeExerciseById.get(exerciseId)!;

    return {
      exercise: exerciseId,
      restTime: exercise.restTime,
      isActive: true,
      order: index + 1,
    };
  });

  const normalizedInactiveExercises = inactiveExercises.map((exercise) => ({
    exercise: getExerciseId(exercise),
    restTime: exercise.restTime,
    isActive: false,
    order: null,
  }));

  return await workoutRepository.updateWorkout(workoutId, {
    exercises: [...reorderedActiveExercises, ...normalizedInactiveExercises],
    userId,
  });
}

export async function deleteWorkoutService(id: string, userId: string) {
  const existingWorkout = await workoutRepository.findById(id);

  if (!existingWorkout) {
    throw new NotFoundError("Workout not found");
  }

  // Verify ownership
  if ((existingWorkout.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to workout");
  }

  return await workoutRepository.deleteWorkout(id);
}
