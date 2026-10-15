"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ensureAuthUser } from "@/lib/auth/accounts";
import { roleLabel, type InstituteRole } from "@/lib/auth/rbac";
import { assertInstituteMember } from "@/lib/auth/session";
import { db, instituteMembers, studentAccess, students } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { memberWelcomeEmail } from "@/lib/email/templates";

export type PortalResult = { ok: true; message?: string } | { ok: false; error: string; field?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PORTAL_ROLES: InstituteRole[] = ["guardian", "student"];

/**
 * Gives a guardian or the student their own sign-in to see this student in the portal.
 * A guardian with several children at the institute uses one account linked to each.
 */
export async function grantPortalAccess(studentId: string, form: FormData): Promise<PortalResult> {
  const me = await assertInstituteMember("students:write");
  if (!me) return { ok: false, error: "Your role can't give portal access." };
  const instituteId = me.active.instituteId;
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const role = String(form.get("role") ?? "") as InstituteRole;

  if (!PORTAL_ROLES.includes(role)) return { ok: false, error: "Choose guardian or student.", field: "role" };
  if (!name) return { ok: false, error: "Enter their name.", field: "name" };
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email; they sign in with it.", field: "email" };

  const [st] = await db.select({ id: students.id, name: students.name }).from(students).where(and(eq(students.id, studentId), eq(students.instituteId, instituteId))).limit(1);
  if (!st) return { ok: false, error: "This student isn't in your institute." };

  let account: { id: string; created: boolean };
  try {
    account = await ensureAuthUser(email, name);
  } catch {
    return { ok: false, error: "The sign-in account couldn't be created. Try again in a minute." };
  }

  const [existing] = await db
    .select({ id: instituteMembers.id, role: instituteMembers.role })
    .from(instituteMembers)
    .where(and(eq(instituteMembers.userId, account.id), eq(instituteMembers.instituteId, instituteId)))
    .limit(1);
  if (existing && !PORTAL_ROLES.includes(existing.role)) {
    return { ok: false, error: `${email} is a staff account (${roleLabel(existing.role, me.active.instituteType)}). Use a different email for portal access.`, field: "email" };
  }
  if (existing && existing.role !== role) {
    return { ok: false, error: `${email} already has ${roleLabel(existing.role, me.active.instituteType)} portal access. Use the same role or a different email.`, field: "role" };
  }

  const memberId =
    existing?.id ??
    (await db.insert(instituteMembers).values({ userId: account.id, instituteId, role, invitedBy: me.id }).returning({ id: instituteMembers.id }))[0].id;
  const [link] = await db.insert(studentAccess).values({ instituteId, memberId, studentId, createdBy: me.id }).onConflictDoNothing().returning({ id: studentAccess.id });
  if (!link) return { ok: false, error: `${email} can already see ${st.name}.`, field: "email" };

  // The first link sends the welcome email; later children just appear in their portal
  let emailed = false;
  if (!existing) {
    const mail = await sendEmail({
      to: { email, name },
      ...memberWelcomeEmail({ name, email, instituteName: me.active.instituteName, instituteType: me.active.instituteType, role, newAccount: account.created, addedBy: me.name }),
    });
    emailed = mail.ok;
  }
  revalidatePath(`/dashboard/students/${studentId}`);
  return {
    ok: true,
    message: existing
      ? `${name} can now see ${st.name} too, in the portal they already use.`
      : emailed
        ? `${name} was emailed how to sign in and see ${st.name}.`
        : `${name} has access, but the email couldn't be sent. Ask them to use "Forgot password?" on the sign-in page.`,
  };
}

/** Removes one portal link; an account with no children left loses access to the institute. */
export async function revokePortalAccess(accessId: string): Promise<PortalResult> {
  const me = await assertInstituteMember("students:write");
  if (!me) return { ok: false, error: "Your role can't change portal access." };
  const [link] = await db
    .delete(studentAccess)
    .where(and(eq(studentAccess.id, accessId), eq(studentAccess.instituteId, me.active.instituteId)))
    .returning({ memberId: studentAccess.memberId, studentId: studentAccess.studentId });
  if (!link) return { ok: false, error: "This access was already removed." };
  const [{ n }] = await db.select({ n: count() }).from(studentAccess).where(eq(studentAccess.memberId, link.memberId));
  if (n === 0) await db.delete(instituteMembers).where(eq(instituteMembers.id, link.memberId));
  revalidatePath(`/dashboard/students/${link.studentId}`);
  return { ok: true };
}
