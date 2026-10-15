import "server-only";

import { asc, count, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db, institutes, plans } from "@/lib/db";
import type { Plan } from "@/lib/super-admin/data";

/** Cache tag for everything that shows plans; plan actions call updateTag(PLANS_TAG) after a change. */
export const PLANS_TAG = "plans";

type PlanRow = typeof plans.$inferSelect;

export function toPlan(r: PlanRow): Plan {
  return {
    key: r.key,
    name: r.name,
    nameBn: r.nameBn,
    tagline: r.tagline,
    taglineBn: r.taglineBn,
    price: r.priceBdt,
    yearlyPrice: r.yearlyPriceBdt,
    studentLimit: r.studentLimit,
    features: r.features,
    featuresBn: r.featuresBn,
    featured: r.featured,
    isPublic: r.isPublic,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  };
}

/** Every plan, in display order (console). */
export async function getPlans(): Promise<Plan[]> {
  const rows = await db.select().from(plans).orderBy(asc(plans.sortOrder), asc(plans.name));
  return rows.map(toPlan);
}

/** Every plan with how many institutes use it (the Plans & Pricing page). */
export async function getPlansWithUsage(): Promise<(Plan & { institutes: number })[]> {
  const [rows, usage] = await Promise.all([
    getPlans(),
    db.select({ plan: institutes.plan, n: count() }).from(institutes).groupBy(institutes.plan),
  ]);
  const byPlan = new Map(usage.map((u) => [u.plan, u.n]));
  return rows.map((p) => ({ ...p, institutes: byPlan.get(p.key) ?? 0 }));
}

/** Plans on the public website's pricing section. Cached until a plan changes. */
export async function getPublicPlans(): Promise<Plan[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("max");
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.isPublic, true))
    .orderBy(asc(plans.sortOrder), asc(plans.name));
  return rows.filter((r) => r.isActive).map(toPlan);
}
