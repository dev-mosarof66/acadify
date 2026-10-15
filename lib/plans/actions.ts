"use server";

import { and, asc, count, eq, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { assertSuperAdmin } from "@/lib/auth/session";
import { db, institutes, plans } from "@/lib/db";
import { slugify, TRIAL_PLAN } from "@/lib/super-admin/data";
import { PLANS_TAG } from "./queries";

export type PlanFormResult = { ok: true; key: string } | { ok: false; error: string; field?: string };

const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

/** "4,500" / "৪৫০০" / "" → 4500 / null; NaN when it isn't a whole number. */
function readAmount(raw: FormDataEntryValue | null) {
  const v = toAsciiDigits(String(raw ?? "")).replace(/[,\s৳]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/** One feature per line; blank lines dropped. */
const readLines = (raw: FormDataEntryValue | null) =>
  String(raw ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);

/** Everything that shows plans: the website's pricing section (cached) and the console. */
function refresh() {
  updateTag(PLANS_TAG);
  revalidatePath("/admin", "layout");
}

/** Creates a plan (no `key` in the form) or updates one. */
export async function savePlan(form: FormData): Promise<PlanFormResult> {
  await assertSuperAdmin();
  const key = String(form.get("key") ?? "").trim();
  const get = (k: string, max = 160) => String(form.get(k) ?? "").trim().slice(0, max);

  const name = get("name", 60);
  const customPrice = form.get("customPrice") === "on";
  const price = customPrice ? null : readAmount(form.get("price"));
  const yearly = customPrice ? null : readAmount(form.get("yearlyPrice"));
  const limit = readAmount(form.get("studentLimit"));
  const features = readLines(form.get("features"));
  const featuresBn = readLines(form.get("featuresBn"));

  if (!name) return { ok: false, error: "Enter the plan name.", field: "name" };
  const isTrial = key === TRIAL_PLAN;
  if (!isTrial && !customPrice && (price === null || Number.isNaN(price) || price <= 0)) {
    return { ok: false, error: "Enter the monthly price in taka, or tick \"Custom price\".", field: "price" };
  }
  if (Number.isNaN(yearly)) return { ok: false, error: "Enter the yearly price as a whole number, or leave it empty.", field: "yearlyPrice" };
  if (yearly !== null && price !== null && yearly >= price * 12) {
    return { ok: false, error: `The yearly price should be less than 12 months at the monthly price (৳${(price * 12).toLocaleString("en-IN")}).`, field: "yearlyPrice" };
  }
  if (Number.isNaN(limit) || limit === 0) return { ok: false, error: "Enter the student limit as a whole number, or leave it empty for no limit.", field: "studentLimit" };
  if (!features.length) return { ok: false, error: "Add at least one feature (one per line).", field: "features" };

  const values = {
    name,
    nameBn: get("nameBn", 60),
    tagline: get("tagline", 80),
    taglineBn: get("taglineBn", 80),
    // The free trial always costs nothing
    priceBdt: isTrial ? 0 : price,
    yearlyPriceBdt: isTrial ? null : yearly,
    studentLimit: limit,
    features,
    featuresBn,
  };

  if (key) {
    const [row] = await db.update(plans).set(values).where(eq(plans.key, key)).returning({ key: plans.key });
    if (!row) return { ok: false, error: "This plan no longer exists." };
    refresh();
    return { ok: true, key };
  }

  // New plan: its key comes from the name and never changes
  const newKey = slugify(name);
  if (newKey.length < 2) return { ok: false, error: "Use English letters or numbers in the plan name.", field: "name" };
  const [{ last }] = await db.select({ last: count() }).from(plans);
  const [row] = await db
    .insert(plans)
    .values({ key: newKey, ...values, sortOrder: last })
    .onConflictDoNothing()
    .returning({ key: plans.key });
  if (!row) return { ok: false, error: `There's already a plan called "${name}". Use a different name.`, field: "name" };
  refresh();
  return { ok: true, key: newKey };
}

type Flag = "isPublic" | "isActive" | "featured";

/** Show/hide on the website, archive/restore, or make the one featured plan. */
export async function setPlanFlag(key: string, flag: Flag, value: boolean): Promise<{ ok: boolean; error?: string }> {
  await assertSuperAdmin();
  if (key === TRIAL_PLAN && flag !== "isPublic" && !(flag === "isActive" && value)) {
    return { ok: false, error: "The free trial can't be archived or featured; every new institute can start on it." };
  }
  if (flag === "featured" && value) {
    // Only one "Most popular" plan
    await db.update(plans).set({ featured: false }).where(ne(plans.key, key));
  }
  const [row] = await db.update(plans).set({ [flag]: value }).where(eq(plans.key, key)).returning({ key: plans.key });
  if (!row) return { ok: false, error: "This plan no longer exists." };
  refresh();
  return { ok: true };
}

/** Moves a plan one place earlier or later in the website and console order. */
export async function movePlan(key: string, direction: -1 | 1): Promise<{ ok: boolean }> {
  await assertSuperAdmin();
  const rows = await db.select({ key: plans.key }).from(plans).orderBy(asc(plans.sortOrder), asc(plans.name));
  const order = rows.map((r) => r.key);
  const from = order.indexOf(key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];
  await Promise.all(order.map((k, i) => db.update(plans).set({ sortOrder: i }).where(eq(plans.key, k))));
  refresh();
  return { ok: true };
}

/** Deletes a plan nobody uses. Plans with institutes can only be archived. */
export async function deletePlan(key: string): Promise<{ ok: boolean; error?: string }> {
  await assertSuperAdmin();
  if (key === TRIAL_PLAN) return { ok: false, error: "The free trial can't be deleted." };
  const [{ n }] = await db.select({ n: count() }).from(institutes).where(eq(institutes.plan, key));
  if (n > 0) return { ok: false, error: `${n} ${n === 1 ? "institute uses" : "institutes use"} this plan. Archive it instead.` };
  await db.delete(plans).where(and(eq(plans.key, key), ne(plans.key, TRIAL_PLAN)));
  refresh();
  return { ok: true };
}
