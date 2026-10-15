"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, like, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/server";
import { INSTITUTE_ROLES, type InstituteRole } from "@/lib/auth/rbac";
import { assertSuperAdmin } from "@/lib/auth/session";
import { db, demoRequests, instituteMembers, institutes, plans, platformActivity, platformInvoices } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { getSettings } from "@/lib/settings/queries";
import { demoAcceptedEmail, demoRejectedEmail, instituteWelcomeEmail, invoiceEmail, memberWelcomeEmail, paymentReceiptEmail } from "@/lib/email/templates";
import { BD_DISTRICTS, slugify, TRIAL_PLAN, webAddress, type DemoStatus, type InstituteStatus, type InstituteType, type PlanKey } from "./data";

const DEMO_STATUSES: DemoStatus[] = ["new", "contacted", "scheduled", "won", "lost"];

export async function updateDemoStatus(ids: number[], status: DemoStatus) {
  await assertSuperAdmin();
  if (!DEMO_STATUSES.includes(status)) throw new Error("Unknown status");
  const clean = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (!clean.length) return { updated: 0 };

  const rows = await db.update(demoRequests).set({ status }).where(inArray(demoRequests.id, clean)).returning({ id: demoRequests.id });
  revalidatePath("/admin", "layout");
  return { updated: rows.length };
}

/** Rejects a demo request and emails the requester (with the optional reason). */
export async function rejectDemoRequest(id: number, reason: string): Promise<{ ok: boolean; emailed: boolean; error?: string }> {
  await assertSuperAdmin();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, emailed: false, error: "Unknown request." };

  const [row] = await db.update(demoRequests).set({ status: "lost" }).where(eq(demoRequests.id, id)).returning();
  if (!row) return { ok: false, emailed: false, error: "Request not found." };
  revalidatePath("/admin", "layout");
  if (!row.email) return { ok: true, emailed: false };

  const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
  const mail = await sendEmail({
    to: { email: row.email, name: row.name },
    ...demoRejectedEmail({ id: row.id, name: row.name, institute: row.instituteName, reason: reason.slice(0, 1000) }),
    replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined,
  });
  return { ok: true, emailed: mail.ok };
}

export type AddMemberResult ={ ok: true; created: boolean; emailed: boolean } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isStrongPassword(pw: string) {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^\p{L}\p{M}0-9\s]/u.test(pw);
}

/** Unguessable password nobody sees; the person sets their own from the welcome email. */
function placeholderPassword() {
  return `${randomBytes(18).toString("base64url")}aA1!`;
}

/**
 * Creates an institute user (or links an existing account) and gives them a role in the institute.
 * Uses the super admin's own session to call Neon Auth's admin API.
 */
export async function addInstituteMember(instituteSlug: string, form: FormData): Promise<AddMemberResult> {
  const admin = await assertSuperAdmin();

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "") as InstituteRole;

  if (!name) return { ok: false, error: "Enter the person's name." };
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!INSTITUTE_ROLES.includes(role)) return { ok: false, error: "Choose a role." };

  const [inst] = await db.select({ id: institutes.id, name: institutes.name, type: institutes.type }).from(institutes).where(eq(institutes.slug, instituteSlug)).limit(1);
  if (!inst) return { ok: false, error: "Institute not found." };

  const access = await grantAccess(inst.id, { name, email, role, password }, admin.id);
  if (!access.ok) return access;
  revalidatePath(`/admin/institutes/${instituteSlug}`);

  const mail = await sendEmail({ to: { email, name }, ...memberWelcomeEmail({ name, email, instituteName: inst.name, instituteType: inst.type, role, newAccount: access.created, addedBy: admin.name || undefined }) });
  return { ok: true, created: access.created, emailed: mail.ok };
}

/**
 * Creates the person's sign-in account (or reuses one with this email) and gives them a role in the institute.
 * Uses the super admin's own session to call Neon Auth's admin API. Sends no email; callers pick the right one.
 */
async function grantAccess(
  instituteId: string,
  person: { name: string; email: string; role: InstituteRole; password?: string },
  invitedBy: string
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const { name, email, role, password } = person;
  const existing = await auth.admin.listUsers({ query: { searchField: "email", searchValue: email, searchOperator: "contains", limit: 5 } });
  let userId = (existing.data as { users?: { id: string; email: string }[] } | null)?.users?.find((u) => u.email.toLowerCase() === email)?.id;
  let created = false;

  if (!userId) {
    if (password && !isStrongPassword(password)) {
      return { ok: false, error: "A temporary password needs 8+ characters, upper and lower case letters, a number and a special character. Or leave it empty." };
    }
    const { data, error } = await auth.admin.createUser({ email, name, password: password || placeholderPassword(), role: "user" });
    if (error || !data) return { ok: false, error: error?.message || "Could not create the account." };
    userId = (data as { user?: { id: string } }).user?.id ?? (data as { id?: string }).id;
    if (!userId) return { ok: false, error: "The account was created but no user id came back. Try again." };
    created = true;
  }

  const [already] = await db
    .select({ id: instituteMembers.id })
    .from(instituteMembers)
    .where(and(eq(instituteMembers.userId, userId), eq(instituteMembers.instituteId, instituteId)))
    .limit(1);
  if (already) {
    await db.update(instituteMembers).set({ role }).where(eq(instituteMembers.id, already.id));
  } else {
    await db.insert(instituteMembers).values({ userId, instituteId, role, invitedBy });
  }

  await db.insert(platformActivity).values({ kind: "signup", text: `${name} added as ${role.replace("_", " ")}`, instituteId });
  return { ok: true, created };
}

export async function removeInstituteMember(memberId: string, instituteSlug: string) {
  await assertSuperAdmin();
  await db.delete(instituteMembers).where(eq(instituteMembers.id, memberId));
  revalidatePath(`/admin/institutes/${instituteSlug}`);
}

/* ---------------------------------------------------------------- institutes */

const INSTITUTE_TYPES: InstituteType[] = ["school", "college", "qawmi", "alia", "hifz", "coaching", "unified"];
const STATUSES: InstituteStatus[] = ["active", "trial", "past_due", "suspended"];
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Next renewal: the trial length from Platform Settings for the free trial, one month for paid plans. */
async function addPeriod(from: Date, plan: PlanKey) {
  const d = new Date(from);
  if (plan === TRIAL_PLAN) d.setUTCDate(d.getUTCDate() + (await getSettings()).trialDays);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return isoDate(d);
}

type PlanRow = typeof plans.$inferSelect;

/** Monthly price on a plan; plans without a fixed price use the price agreed with the institute. */
function priceFor(plan: PlanRow, customPrice: number | null) {
  if (plan.key === TRIAL_PLAN) return 0;
  return plan.priceBdt ?? customPrice ?? 0;
}

const getPlanRow = async (key: string) => (await db.select().from(plans).where(eq(plans.key, key)).limit(1))[0] ?? null;

/**
 * The chosen plan, if it can be used: it must exist and be open to new institutes (an institute already on an
 * archived plan may keep it). Plans without a fixed price need the agreed monthly price.
 */
async function planFor(input: InstituteInput, keepKey?: string): Promise<{ plan: PlanRow } | { error: string; field: string }> {
  const plan = await getPlanRow(input.plan);
  if (!plan || (!plan.isActive && plan.key !== keepKey)) return { error: "Choose a plan.", field: "plan" };
  if (plan.priceBdt === null && !(input.customPrice && Number.isInteger(input.customPrice) && input.customPrice > 0)) {
    return { error: `Enter the agreed monthly price for the ${plan.name} plan.`, field: "customPrice" };
  }
  return { plan };
}

/** The web address is the institute's name exactly (see slugify), so two institutes can't share a name. */
async function slugForName(name: string): Promise<{ slug: string } | { error: string }> {
  const slug = slugify(name);
  if (slug.length < 3) return { error: "The web address is made from the name, so the name needs at least 3 English letters or numbers." };
  const [taken] = await db.select({ name: institutes.name }).from(institutes).where(eq(institutes.slug, slug)).limit(1);
  if (taken) return { error: `${taken.name} already uses ${webAddress(slug)}. Add something to the name to tell them apart, such as the district.` };
  return { slug };
}

export type InstituteFormResult = { ok: true; slug: string } | { ok: false; error: string; field?: string };

type InstituteInput = {
  name: string;
  type: InstituteType;
  district: string;
  plan: PlanKey;
  customPrice: number | null;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
};

function readInstituteForm(form: FormData): InstituteInput | { error: string; field: string } {
  const get = (k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
  const price = toAsciiDigits(get("customPrice")).replace(/[,\s৳]/g, "");
  const input: InstituteInput = {
    name: get("name", 160),
    type: get("type") as InstituteType,
    district: get("district", 60),
    plan: get("plan") as PlanKey,
    customPrice: price ? Number(price) : null,
    contactName: get("contactName"),
    contactRole: get("contactRole", 60),
    contactPhone: toAsciiDigits(get("contactPhone", 30)).replace(/[\s-]/g, ""),
    contactEmail: get("contactEmail", 160).toLowerCase(),
  };
  if (!input.name) return { error: "Enter the institute's name.", field: "name" };
  if (!INSTITUTE_TYPES.includes(input.type)) return { error: "Choose the institute type.", field: "type" };
  if (!(BD_DISTRICTS as readonly string[]).includes(input.district)) return { error: "Choose the district from the list.", field: "district" };
  if (!input.plan) return { error: "Choose a plan.", field: "plan" };
  if (!input.contactName) return { error: "Enter the main contact's name.", field: "contactName" };
  if (!input.contactRole) return { error: "Enter the main contact's role, e.g. Principal.", field: "contactRole" };
  if (!BD_MOBILE.test(input.contactPhone)) return { error: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).", field: "contactPhone" };
  if (!EMAIL.test(input.contactEmail)) return { error: "Enter a valid email address.", field: "contactEmail" };
  return input;
}

/** What happened to the main contact's account and welcome email after "Add institute". */
export type OnboardingOutcome = { skipped: true } | { skipped: false; created: boolean; emailed: boolean; error?: string };

/**
 * Adds an institute. `fromDemo` (a demo request id) marks that request as won.
 * With `onboard` checked, the main contact gets Principal access and the welcome email with next steps.
 */
export async function createInstitute(form: FormData): Promise<InstituteFormResult & { onboarding?: OnboardingOutcome; demoEmailed?: boolean }> {
  const admin = await assertSuperAdmin();
  const input = readInstituteForm(form);
  if ("error" in input) return { ok: false, error: input.error, field: input.field };
  const chosen = await planFor(input);
  if ("error" in chosen) return { ok: false, error: chosen.error, field: chosen.field };
  const plan = chosen.plan;

  const address = await slugForName(input.name);
  if ("error" in address) return { ok: false, error: address.error, field: "name" };
  const slug = address.slug;

  const now = new Date();
  const [row] = await db
    .insert(institutes)
    .values({
      slug,
      name: input.name,
      type: input.type,
      district: input.district,
      plan: input.plan,
      status: input.plan === TRIAL_PLAN ? "trial" : "active",
      mrrBdt: priceFor(plan, input.customPrice),
      contactName: input.contactName,
      contactRole: input.contactRole,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      joinedOn: isoDate(now),
      renewsOn: await addPeriod(now, input.plan),
    })
    // The unique web address is the final guard: if someone saved the same name a moment ago, nothing is inserted
    .onConflictDoNothing({ target: institutes.slug })
    .returning({ id: institutes.id, slug: institutes.slug, mrr: institutes.mrrBdt, renewsOn: institutes.renewsOn });
  if (!row) {
    return { ok: false, error: `${webAddress(slug)} was just taken by another institute. Add something to the name to tell them apart, such as the district.`, field: "name" };
  }

  const demoId = Number(form.get("fromDemo"));
  const [demo] =
    Number.isInteger(demoId) && demoId > 0 ? await db.update(demoRequests).set({ status: "won" }).where(eq(demoRequests.id, demoId)).returning() : [];

  await db.insert(platformActivity).values({
    kind: "signup",
    text: `${input.name} joined${input.plan === TRIAL_PLAN ? ` on a ${(await getSettings()).trialDays}-day trial` : ` on the ${plan.name} plan`}`,
    instituteId: row.id,
  });

  // The institute is saved either way; a failed account or email is reported, not rolled back
  let onboarding: OnboardingOutcome = { skipped: true };
  if (form.get("onboard") === "on") {
    const access = await grantAccess(row.id, { name: input.contactName, email: input.contactEmail, role: "principal" }, admin.id);
    if (!access.ok) {
      onboarding = { skipped: false, created: false, emailed: false, error: access.error };
    } else {
      const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
      const mail = await sendEmail({
        to: { email: input.contactEmail, name: input.contactName },
        ...instituteWelcomeEmail({
          name: input.contactName,
          email: input.contactEmail,
          instituteName: input.name,
          instituteType: input.type,
          planName: plan.name,
          monthlyPrice: row.mrr,
          trial: input.plan === TRIAL_PLAN,
          renewsOn: row.renewsOn,
          newAccount: access.created,
        }),
        // Replies ("here's our class list…") reach the team, not a no-reply inbox
        replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined,
      });
      onboarding = { skipped: false, created: access.created, emailed: mail.ok };
    }
  }

  // Tell the person who asked for the demo, unless the welcome email just went to the same address
  let demoEmailed: boolean | undefined;
  const welcomedSameAddress = !onboarding.skipped && onboarding.emailed && demo?.email?.toLowerCase() === input.contactEmail;
  if (demo?.email && !welcomedSameAddress) {
    const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
    const mail = await sendEmail({
      to: { email: demo.email, name: demo.name },
      ...demoAcceptedEmail({ id: demo.id, name: demo.name, institute: input.name, phone: demo.phone, principalEmailed: !onboarding.skipped && onboarding.emailed }),
      replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined,
    });
    demoEmailed = mail.ok;
  }

  revalidatePath("/admin", "layout");
  return { ok: true, slug: row.slug, onboarding, demoEmailed };
}

/** Edits an institute's details and plan. The web address stays fixed once created. */
export async function updateInstituteDetails(slug: string, form: FormData): Promise<InstituteFormResult> {
  await assertSuperAdmin();
  const input = readInstituteForm(form);
  if ("error" in input) return { ok: false, error: input.error, field: input.field };

  const [current] = await db
    .select({ id: institutes.id, plan: institutes.plan, status: institutes.status })
    .from(institutes)
    .where(eq(institutes.slug, slug))
    .limit(1);
  if (!current) return { ok: false, error: "Institute not found." };
  const chosen = await planFor(input, current.plan);
  if ("error" in chosen) return { ok: false, error: chosen.error, field: chosen.field };
  const plan = chosen.plan;

  const planChanged = current.plan !== input.plan;
  const leavingTrial = planChanged && current.plan === TRIAL_PLAN && input.plan !== TRIAL_PLAN;
  await db
    .update(institutes)
    .set({
      name: input.name,
      type: input.type,
      district: input.district,
      plan: input.plan,
      mrrBdt: current.status === "suspended" ? 0 : priceFor(plan, input.customPrice),
      contactName: input.contactName,
      contactRole: input.contactRole,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      // Moving from the trial to a paid plan starts billing today
      ...(leavingTrial ? { status: "active" as const, renewsOn: await addPeriod(new Date(), input.plan) } : {}),
    })
    .where(eq(institutes.id, current.id));

  if (planChanged) {
    await db.insert(platformActivity).values({ kind: "upgrade", text: `${input.name} moved to the ${plan.name} plan`, instituteId: current.id });
  }
  revalidatePath("/admin", "layout");
  return { ok: true, slug };
}

/** Activate, mark past due or suspend. Suspending stops revenue; reactivating restores the plan price. */
export async function setInstituteStatus(slug: string, status: InstituteStatus): Promise<{ ok: boolean; error?: string }> {
  await assertSuperAdmin();
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };

  const [inst] = await db.select().from(institutes).where(eq(institutes.slug, slug)).limit(1);
  if (!inst) return { ok: false, error: "Institute not found." };
  if (status === "trial" && inst.plan !== TRIAL_PLAN) return { ok: false, error: "Only institutes on the Free Trial plan can be on trial." };
  if (inst.status === status) return { ok: true };

  const restoring = inst.status === "suspended";
  const plan = restoring ? await getPlanRow(inst.plan) : null;
  await db
    .update(institutes)
    .set({
      status,
      ...(status === "suspended" ? { mrrBdt: 0 } : {}),
      // A custom-priced plan's price isn't stored elsewhere; re-enter it with "Edit details" after reactivating
      ...(plan && plan.priceBdt !== null ? { mrrBdt: priceFor(plan, null) } : {}),
      ...(restoring && status === "active" ? { renewsOn: await addPeriod(new Date(), inst.plan) } : {}),
    })
    .where(eq(institutes.id, inst.id));

  const verb = { active: "reactivated", trial: "put back on trial", past_due: "marked past due", suspended: "suspended" }[status];
  await db.insert(platformActivity).values({ kind: status === "past_due" ? "overdue" : "signup", text: `${inst.name} ${verb}`, instituteId: inst.id });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- billing */

const PAYMENT_METHODS = ["bKash", "Nagad", "Bank"] as const;
type Method = (typeof PAYMENT_METHODS)[number];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type InvoiceResult = { ok: true; invoiceId: string; emailed: boolean } | { ok: false; error: string; field?: string };

/** Next number in the month, e.g. ACD-2026-10-007. */
async function nextInvoiceId(month: string) {
  const prefix = `ACD-${month}-`;
  const rows = await db.select({ id: platformInvoices.id }).from(platformInvoices).where(like(platformInvoices.id, `${prefix}%`));
  const max = rows.reduce((m, r) => Math.max(m, Number(r.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Issues an invoice for one institute and month, and emails it to the institute's main contact. */
export async function createInvoice(form: FormData): Promise<InvoiceResult> {
  await assertSuperAdmin();
  const slug = String(form.get("institute") ?? "");
  const month = String(form.get("month") ?? "");
  const amount = Number(toAsciiDigits(String(form.get("amount") ?? "")).replace(/[,\s৳]/g, ""));

  const [inst] = await db.select().from(institutes).where(eq(institutes.slug, slug)).limit(1);
  if (!inst) return { ok: false, error: "Choose an institute.", field: "institute" };
  if (!MONTH.test(month)) return { ok: false, error: "Choose the month this invoice is for.", field: "month" };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Enter the amount in taka, e.g. 4500.", field: "amount" };

  const periodStart = `${month}-01`;
  const [existing] = await db
    .select({ id: platformInvoices.id })
    .from(platformInvoices)
    .where(and(eq(platformInvoices.instituteId, inst.id), eq(platformInvoices.periodStart, periodStart)))
    .limit(1);
  if (existing) return { ok: false, error: `${inst.name} already has invoice ${existing.id} for this month.`, field: "month" };

  // Retry once if another invoice took the same number at the same moment
  let invoiceId = "";
  for (let attempt = 0; attempt < 3 && !invoiceId; attempt++) {
    const id = await nextInvoiceId(month);
    const [row] = await db
      .insert(platformInvoices)
      .values({ id, instituteId: inst.id, periodStart, amountBdt: amount, status: "due", issuedOn: isoDate(new Date()) })
      .onConflictDoNothing()
      .returning({ id: platformInvoices.id });
    if (row) invoiceId = row.id;
  }
  if (!invoiceId) return { ok: false, error: "Couldn't number the invoice. Try again." };

  const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
  const mail = await sendEmail({
    to: { email: inst.contactEmail, name: inst.contactName },
    ...invoiceEmail({ howToPay: (await getSettings()).paymentInstructions, invoiceId, name: inst.contactName, instituteName: inst.name, planName: (await getPlanRow(inst.plan))?.name ?? inst.plan, periodStart, amount }),
    replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, invoiceId, emailed: mail.ok };
}

/** Marks an invoice paid, emails a receipt, and reactivates a past-due institute once nothing is left unpaid. */
export async function recordPayment(invoiceId: string, method: Method, paidOn: string): Promise<{ ok: boolean; emailed?: boolean; error?: string }> {
  await assertSuperAdmin();
  if (!PAYMENT_METHODS.includes(method)) return { ok: false, error: "Choose how it was paid." };
  if (!DAY.test(paidOn) || paidOn > isoDate(new Date())) return { ok: false, error: "Choose the payment date (today or earlier)." };

  const [inv] = await db
    .update(platformInvoices)
    .set({ status: "paid", method, paidOn })
    .where(and(eq(platformInvoices.id, invoiceId), ne(platformInvoices.status, "paid")))
    .returning();
  if (!inv) return { ok: false, error: "This invoice is already paid or no longer exists." };

  const [inst] = await db.select().from(institutes).where(eq(institutes.id, inv.instituteId)).limit(1);
  const [{ open }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(platformInvoices)
    .where(and(eq(platformInvoices.instituteId, inv.instituteId), ne(platformInvoices.status, "paid")));
  if (inst?.status === "past_due" && open === 0) await db.update(institutes).set({ status: "active" }).where(eq(institutes.id, inst.id));

  await db.insert(platformActivity).values({ kind: "payment", text: `${inst?.name ?? "Institute"} paid ${invoiceId} by ${method}`, instituteId: inv.instituteId });

  let emailed = false;
  if (inst) {
    const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
    const mail = await sendEmail({
      to: { email: inst.contactEmail, name: inst.contactName },
      ...paymentReceiptEmail({ invoiceId, name: inst.contactName, instituteName: inst.name, periodStart: inv.periodStart, amount: inv.amountBdt, method, paidOn }),
      replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined,
    });
    emailed = mail.ok;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, emailed };
}

/** Marks unpaid invoices overdue and their institutes past due. */
export async function markInvoicesOverdue(invoiceIds: string[]): Promise<{ ok: boolean; updated: number }> {
  await assertSuperAdmin();
  const ids = invoiceIds.filter((id) => typeof id === "string" && id.startsWith("ACD-"));
  if (!ids.length) return { ok: true, updated: 0 };

  const rows = await db
    .update(platformInvoices)
    .set({ status: "overdue" })
    .where(and(inArray(platformInvoices.id, ids), eq(platformInvoices.status, "due")))
    .returning({ instituteId: platformInvoices.instituteId, id: platformInvoices.id });
  const instituteIds = [...new Set(rows.map((r) => r.instituteId))];
  if (instituteIds.length) {
    await db.update(institutes).set({ status: "past_due" }).where(and(inArray(institutes.id, instituteIds), eq(institutes.status, "active")));
    await db.insert(platformActivity).values(rows.map((r) => ({ kind: "overdue" as const, text: `${r.id} is overdue`, instituteId: r.instituteId })));
  }
  revalidatePath("/admin", "layout");
  return { ok: true, updated: rows.length };
}
