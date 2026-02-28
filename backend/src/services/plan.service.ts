import type { IPlan } from "../models/plan.model.js";
import * as planRepository from "../repositories/plan.repository.js";
import * as workoutRepository from "../repositories/workout.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";

export async function getAllPlansService(userId: string) {
  return await planRepository.findAll({ userId });
}

export async function getPlanByIdService(id: string, userId: string) {
  const plan = await planRepository.findById(id);

  if (!plan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if ((plan.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  // Get the workouts for the plan
  const workouts = await workoutRepository.findAll({ planId: id });

  return {
    ...plan,
    workouts: workouts,
  };
}

export async function createPlanService(
  payload: Omit<IPlan, "userId">,
  userId: string,
) {
  return await planRepository.createPlan({ ...payload, userId: userId });
}

export async function updatePlanService(
  id: string,
  payload: Partial<Omit<IPlan, "userId">>,
  userId: string,
) {
  const existingPlan = await planRepository.findById(id);

  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if ((existingPlan.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  const payloadWithUserId = { ...payload, userId: userId };

  return await planRepository.updatePlan(id, payloadWithUserId);
}

export async function deletePlanService(id: string, userId: string) {
  const existingPlan = await planRepository.findById(id);

  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if ((existingPlan.userId as string) !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  return await planRepository.deletePlan(id);
}
