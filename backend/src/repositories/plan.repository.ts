import type { FilterQuery } from 'mongoose';
import PlanModel, { type IPlan } from '../models/plan.model.js';

export async function findAll(where?: FilterQuery<IPlan>) {
  return await PlanModel.find(where || {}).populate('workouts').lean();
}

export async function findOne(where: FilterQuery<IPlan>) {
  return await PlanModel.findOne(where).populate('workouts').lean();
}

export async function findById(id: string) {
  return await PlanModel.findById(id).populate('workouts').lean();
}

export async function createPlan(plan: Partial<IPlan>) {
  return await PlanModel.create(plan);
}

export async function updatePlan(id: string, plan: Partial<IPlan>) {
  return await PlanModel.findByIdAndUpdate(id, plan, { new: true }).populate('workouts').lean();
}

export async function deletePlan(id: string) {
  return await PlanModel.findByIdAndDelete(id).lean();
}

