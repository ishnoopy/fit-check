import { BadRequestError, NotFoundError } from "../lib/errors.js";
import type { IPlan } from "../models/plan.model.js";
import * as planRepository from "../repositories/plan.repository.js";

export async function getAllPlansService(userId: string) {
  return await planRepository.findAll({ user_id: userId });
}

export async function getPlanByIdService(id: string, userId: string) {
  const plan = await planRepository.findById(id);

  if (!plan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if (plan.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  return plan;
}

export async function createPlanService(payload: Partial<IPlan>, userId: string) {
  const planData = {
    ...payload,
    user_id: userId,
    workouts: payload.workouts || [],
  };

  return await planRepository.createPlan(planData);
}

export async function updatePlanService(id: string, payload: Partial<IPlan>, userId: string) {
  const existingPlan = await planRepository.findById(id);

  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if (existingPlan.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  return await planRepository.updatePlan(id, payload);
}

export async function deletePlanService(id: string, userId: string) {
  const existingPlan = await planRepository.findById(id);

  if (!existingPlan) {
    throw new NotFoundError("Plan not found");
  }

  // Verify ownership
  if (existingPlan.user_id.toString() !== userId) {
    throw new BadRequestError("Unauthorized access to plan");
  }

  return await planRepository.deletePlan(id);
}

