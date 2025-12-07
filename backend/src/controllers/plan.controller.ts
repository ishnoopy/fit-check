import type { Context } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { BadRequestError } from "../lib/errors.js";
import * as planService from "../services/plan.service.js";

const createPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  workouts: z.array(z.string()).default([]),
});

const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  workouts: z.array(z.string()).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(24).max(24),
});

export async function getPlans(c: Context) {
  const userId = c.get("user").id;

  const plans = await planService.getAllPlansService(userId);

  return c.json({
    success: true,
    data: plans,
  }, StatusCodes.OK);
}

export async function getPlan(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  const plan = await planService.getPlanByIdService(params.data.id, userId);

  return c.json({
    success: true,
    data: plan,
  }, StatusCodes.OK);
}

export async function createPlan(c: Context) {
  const body = await c.req.json();
  const validation = await createPlanSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }

  const userId = c.get("user").id;
  const plan = await planService.createPlanService(validation.data, userId);

  return c.json({
    success: true,
    data: plan,
  }, StatusCodes.CREATED);
}

export async function updatePlan(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const body = await c.req.json();
  const validation = await updatePlanSchema.safeParseAsync(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error);
  }


  const userId = c.get("user").id;
  const plan = await planService.updatePlanService(params.data.id, validation.data, userId);

  return c.json({
    success: true,
    data: plan,
  }, StatusCodes.OK);
}

export async function deletePlan(c: Context) {
  const params = await idParamSchema.safeParseAsync(c.req.param());

  if (!params.success) {
    throw new BadRequestError(params.error);
  }

  const userId = c.get("user").id;
  await planService.deletePlanService(params.data.id, userId);

  return c.json({
    success: true,
    message: "Plan deleted successfully",
  }, StatusCodes.OK);
}

