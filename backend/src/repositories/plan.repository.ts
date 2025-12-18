import type { FilterQuery } from 'mongoose';
import PlanModel, { type IPlan } from '../models/plan.model.js';
import { toCamelCase, toSnakeCase } from '../utils/transformer.js';

export async function findAll(where: FilterQuery<IPlan> = {}) {
  const query = toSnakeCase(where);
  const plans = await PlanModel.find(query).lean();
  return toCamelCase(plans) as IPlan[];
}

export async function findOne(where: FilterQuery<IPlan> = {}) {
  const query = toSnakeCase(where);
  const plan = await PlanModel.findOne(query).lean();
  return plan ? toCamelCase(plan) as IPlan : null;
}

export async function findById(id: string) {
  const plan = await PlanModel.findById(id).lean();
  return plan ? toCamelCase(plan) as IPlan : null;
}

export async function createPlan(plan: IPlan) {
  const payload = toSnakeCase(plan);
  const doc = await PlanModel.create(payload);
  return toCamelCase(doc.toObject()) as IPlan;
}

export async function updatePlan(id: string, plan: Partial<IPlan>) {
  const payload = toSnakeCase(plan);
  const doc = await PlanModel.findByIdAndUpdate(id, payload, { new: true, lean: true }).lean();
  return doc ? toCamelCase(doc) as IPlan : null;
}

export async function deletePlan(id: string) {
  const doc = await PlanModel.findByIdAndDelete(id).lean();
  return doc ? toCamelCase(doc) as IPlan : null;
}

