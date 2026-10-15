import "server-only";

import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { db, instituteMembers, institutes } from "@/lib/db";
import { isAdminVerified } from "./admin-code";
import { auth } from "./server";
import { can, isSuperAdmin, needsAdminCode, type InstituteRole, type Permission } from "./rbac";

export interface Membership {
  /** institute_members.id */
  memberId: string;
  instituteId: string;
  instituteSlug: string;
  instituteName: string;
  instituteType: string;
  role: InstituteRole;
}

export interface Viewer {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  platformRole: string;
  isSuperAdmin: boolean;
  memberships: Membership[];
  sessionId: string;
  sessionExpires: Date | string | null;
  /** Admin accounts (super admin, principal, institute admin) confirm an emailed code at every sign-in. */
  needsAdminCode: boolean;
  /** True once this session's admin code was entered (always true for accounts that don't need one). */
  adminVerified: boolean;
}

/** The signed-in user with their roles, or null. Reads cookies, so call it inside a Suspense boundary. */
export async function getViewer(): Promise<Viewer | null> {
  const { data } = await auth.getSession();
  const session = data?.session as { id: string; expiresAt?: Date | string | null } | undefined;
  const user = data?.user as ({ id: string; name: string; email: string; image?: string | null; role?: string | null; banned?: boolean | null } | undefined);
  if (!user || user.banned || !session) return null;

  const memberships = await getMemberships(user.id);
  const platformRole = user.role ?? "user";
  const needsCode = needsAdminCode(platformRole, memberships.map((m) => m.role));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    platformRole,
    isSuperAdmin: isSuperAdmin(platformRole),
    memberships,
    sessionId: session.id,
    sessionExpires: session.expiresAt ?? null,
    needsAdminCode: needsCode,
    adminVerified: needsCode ? await isAdminVerified(user.id, session.id) : true,
  };
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const rows = await db
    .select({ memberId: instituteMembers.id, instituteId: institutes.id, instituteSlug: institutes.slug, instituteName: institutes.name, instituteType: institutes.type, role: instituteMembers.role })
    .from(instituteMembers)
    .innerJoin(institutes, eq(instituteMembers.instituteId, institutes.id))
    .where(eq(instituteMembers.userId, userId));
  return rows;
}

/** Where a signed-in, verified account lands. */
export const homeFor = (viewer: Pick<Viewer, "isSuperAdmin">) => (viewer.isSuperAdmin ? "/admin" : "/dashboard");

/** Page/layout guard for the Super Admin console. */
export async function requireSuperAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isSuperAdmin) redirect(viewer.memberships.length ? "/dashboard" : "/login?error=forbidden");
  if (!viewer.adminVerified) redirect("/login/verify");
  return viewer;
}

/** Page/layout guard for the institute dashboard; optionally requires a permission in the active institute. */
export async function requireInstituteMember(permission?: Permission): Promise<Viewer & { active: Membership }> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.adminVerified) redirect("/login/verify");
  const active = viewer.memberships[0];
  if (!active) redirect(viewer.isSuperAdmin ? "/admin" : "/login?error=no-institute");
  if (permission && !can(active.role, permission)) redirect("/dashboard?error=forbidden");
  // After the response, so recording activity never slows the page down
  after(() => touchInstituteActivity(viewer.id, [active.instituteId]));
  return { ...viewer, active };
}

/**
 * Guard for institute Server Actions: the signed-in, verified member's active institute, if their role
 * allows `permission`. Returns null instead of redirecting, so actions can answer with an error.
 */
export async function assertInstituteMember(permission: Permission): Promise<(Viewer & { active: Membership }) | null> {
  const viewer = await getViewer();
  const active = viewer?.memberships[0];
  if (!viewer || !viewer.adminVerified || !active || !can(active.role, permission)) return null;
  return { ...viewer, active };
}

/**
 * Records that this person used these institutes (sign-in, dashboard), in institute_members.last_active_at
 * and institutes.last_active_at. Writes at most once per 10 minutes per row.
 */
export async function touchInstituteActivity(userId: string, instituteIds: string[]) {
  if (!instituteIds.length) return;
  const stale = (col: typeof institutes.lastActiveAt | typeof instituteMembers.lastActiveAt) =>
    or(isNull(col), lt(col, sql`now() - interval '10 minutes'`));
  await Promise.all([
    db
      .update(instituteMembers)
      .set({ lastActiveAt: sql`now()` })
      .where(and(eq(instituteMembers.userId, userId), inArray(instituteMembers.instituteId, instituteIds), stale(instituteMembers.lastActiveAt))),
    db
      .update(institutes)
      .set({ lastActiveAt: sql`now()` })
      .where(and(inArray(institutes.id, instituteIds), stale(institutes.lastActiveAt))),
  ]);
}

/** Throwing guard for Server Actions (redirects are not useful there). */
export async function assertSuperAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isSuperAdmin || !viewer.adminVerified) throw new Error("Not authorized");
  return viewer;
}

/** True once at least one platform super admin exists (gates the one-time setup page). */
export async function hasSuperAdmin() {
  const rows = await db.execute<{ n: number }>(sql`select count(*)::int as n from neon_auth."user" where role = 'admin'`);
  return (rows.rows[0]?.n ?? 0) > 0;
}
