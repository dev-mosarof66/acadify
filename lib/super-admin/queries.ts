import "server-only";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { connection } from "next/server";

import { db, demoRequests, institutes, platformActivity, platformInvoices, type InstituteRow } from "@/lib/db";
import { formatPeriod, type ActivityItem, type DemoRequest, type Institute, type Invoice, type PlatformTotals } from "./data";

const iso = (d: Date | string | null | undefined) => (d instanceof Date ? d.toISOString() : (d ?? ""));

function toInstitute(r: InstituteRow): Institute {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    type: r.type,
    district: r.district,
    plan: r.plan,
    status: r.status,
    students: r.studentCount,
    staff: r.staffCount,
    mrr: r.mrrBdt,
    smsUsed: r.smsUsed,
    smsCredit: r.smsCredit,
    joined: r.joinedOn,
    renewsOn: r.renewsOn,
    lastActive: iso(r.lastActiveAt),
    contact: { name: r.contactName, role: r.contactRole, phone: r.contactPhone, email: r.contactEmail },
    modules: r.modules,
  };
}

/** Time of this request, read once on the server and passed to components so server and client agree on "2 days ago". */
export async function getRequestTime() {
  // Mark the render as request-time before reading the clock (Cache Components)
  await connection();
  return Date.now();
}

export async function getInstitutes(): Promise<Institute[]> {
  const rows = await db.select().from(institutes).orderBy(desc(institutes.mrrBdt), asc(institutes.name));
  return rows.map(toInstitute);
}

export async function getInstitute(slug: string): Promise<Institute | undefined> {
  const [row] = await db.select().from(institutes).where(eq(institutes.slug, slug)).limit(1);
  return row ? toInstitute(row) : undefined;
}

export async function getInvoices(instituteSlug?: string): Promise<Invoice[]> {
  const rows = await db
    .select({ inv: platformInvoices, slug: institutes.slug, name: institutes.name })
    .from(platformInvoices)
    .innerJoin(institutes, eq(platformInvoices.instituteId, institutes.id))
    .where(instituteSlug ? eq(institutes.slug, instituteSlug) : undefined)
    .orderBy(desc(platformInvoices.periodStart), desc(platformInvoices.id));

  return rows.map(({ inv, slug, name }) => ({
    id: inv.id,
    institute: slug,
    instituteName: name,
    period: formatPeriod(inv.periodStart),
    periodStart: inv.periodStart,
    amount: inv.amountBdt,
    status: inv.status,
    method: inv.method ?? undefined,
    issuedOn: inv.issuedOn,
    paidOn: inv.paidOn ?? undefined,
  }));
}

export async function getDemoRequests(): Promise<DemoRequest[]> {
  const rows = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
  return rows.map((r) => ({
    dbId: r.id,
    id: `DR-${r.id}`,
    name: r.name,
    institute: r.instituteName,
    type: r.type,
    phone: r.phone,
    email: r.email ?? undefined,
    students: r.studentsRange ?? "Not given",
    message: r.message ?? undefined,
    createdAt: iso(r.createdAt),
    status: r.status,
  }));
}

/** One demo request, used to pre-fill "Add institute" when converting a request. */
export async function getDemoRequestById(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [r] = await db.select().from(demoRequests).where(eq(demoRequests.id, id)).limit(1);
  return r ?? null;
}

export async function getNewDemoCount() {
  const [row] = await db.select({ n: count() }).from(demoRequests).where(eq(demoRequests.status, "new"));
  return row?.n ?? 0;
}

export async function getActivity(options: { instituteSlug?: string; limit?: number } = {}): Promise<ActivityItem[]> {
  const rows = await db
    .select({ a: platformActivity, slug: institutes.slug, name: institutes.name })
    .from(platformActivity)
    .leftJoin(institutes, eq(platformActivity.instituteId, institutes.id))
    .where(options.instituteSlug ? eq(institutes.slug, options.instituteSlug) : undefined)
    .orderBy(desc(platformActivity.createdAt))
    .limit(options.limit ?? 20);

  return rows.map(({ a, slug, name }) => ({
    id: a.id,
    kind: a.kind,
    text: a.text,
    institute: slug && name ? { slug, name } : undefined,
    at: iso(a.createdAt),
  }));
}

export async function getPlatformTotals(): Promise<PlatformTotals> {
  const [[inst], [inv], newDemos] = await Promise.all([
    db
      .select({
        institutes: count(),
        active: sql<number>`count(*) filter (where ${institutes.status} = 'active')::int`,
        trials: sql<number>`count(*) filter (where ${institutes.status} = 'trial')::int`,
        pastDue: sql<number>`count(*) filter (where ${institutes.status} = 'past_due')::int`,
        suspended: sql<number>`count(*) filter (where ${institutes.status} = 'suspended')::int`,
        students: sql<number>`coalesce(sum(${institutes.studentCount}), 0)::int`,
        mrr: sql<number>`coalesce(sum(${institutes.mrrBdt}) filter (where ${institutes.status} in ('active', 'past_due')), 0)::int`,
        smsThisMonth: sql<number>`coalesce(sum(${institutes.smsUsed}), 0)::int`,
      })
      .from(institutes),
    db
      .select({ outstanding: sql<number>`coalesce(sum(${platformInvoices.amountBdt}) filter (where ${platformInvoices.status} <> 'paid'), 0)::int` })
      .from(platformInvoices),
    getNewDemoCount(),
  ]);

  return { ...inst, outstanding: inv.outstanding, newDemos };
}

export interface InstituteMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: import("@/lib/auth/rbac").InstituteRole;
  addedAt: string;
  /** ISO time of their last sign-in or dashboard use; "" if never. */
  lastActive: string;
  banned: boolean;
}

/** Members of one institute, with names/emails from Neon Auth's user table. */
export async function getInstituteMembers(instituteSlug: string): Promise<InstituteMemberView[]> {
  const result = await db.execute<{
    id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    role: InstituteMemberView["role"];
    created_at: string;
    last_active_at: string | null;
    banned: boolean | null;
  }>(sql`
    select m.id, m.user_id, u.name, u.email, m.role, m.created_at, m.last_active_at, u.banned
    from institute_members m
    join institutes i on i.id = m.institute_id
    -- neon_auth ids are uuid; ours are stored as text
    left join neon_auth."user" u on u.id::text = m.user_id
    where i.slug = ${instituteSlug}
    order by m.created_at
  `);
  return result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name ?? "Unknown user",
    email: r.email ?? "",
    role: r.role,
    addedAt: new Date(r.created_at).toISOString(),
    lastActive: r.last_active_at ? new Date(r.last_active_at).toISOString() : "",
    banned: !!r.banned,
  }));
}
