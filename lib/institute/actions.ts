"use server";

import { randomBytes } from "node:crypto";
import { and, asc, count, eq, like, max, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { ensureAuthUser, linkPhone, phoneInUse } from "@/lib/auth/accounts";
import { toE164 } from "@/lib/auth/phone";
import { roleLabel, STAFF_ROLES_GRANTABLE, type InstituteRole } from "@/lib/auth/rbac";
import { STUDY_GROUPS, type StudyGroup } from "@/lib/ui/labels";
import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, instituteMembers, sections, students } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { memberWelcomeEmail } from "@/lib/email/templates";
import { deleteObject, putObject } from "@/lib/files/storage";
import { BD_MOBILE, localMobile, toAsciiDigits } from "./rules";
import type { Gender, Shift, StudentStatus } from "./queries";

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string; field?: string };

const NO_PERMISSION: ActionResult = { ok: false, error: "Your role can't do this. Ask your principal." };
const SHIFTS: Shift[] = ["morning", "day", "evening"];
const GENDERS: Gender[] = ["male", "female"];
const STATUSES: StudentStatus[] = ["active", "left", "graduated"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f-]{36}$/i;

const field = (form: FormData, k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);

function refresh(...paths: string[]) {
  for (const p of ["/dashboard", ...paths]) revalidatePath(p);
}

/* ---------------------------------------------------------------- classes */

export async function saveClass(form: FormData): Promise<ActionResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const id = field(form, "id");
  const name = field(form, "name", 60);
  const nameBn = field(form, "nameBn", 60);
  if (!name) return { ok: false, error: "Enter the class name, e.g. Class 6.", field: "name" };

  const instituteId = me.active.instituteId;
  const [clash] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.instituteId, instituteId), sql`lower(${classes.name}) = ${name.toLowerCase()}`, id ? ne(classes.id, id) : undefined))
    .limit(1);
  if (clash) return { ok: false, error: `There's already a class called "${name}".`, field: "name" };

  if (id) {
    const [row] = await db.update(classes).set({ name, nameBn }).where(and(eq(classes.id, id), eq(classes.instituteId, instituteId))).returning({ id: classes.id });
    if (!row) return { ok: false, error: "This class no longer exists." };
    refresh("/dashboard/classes", "/dashboard/students");
    return { ok: true, id };
  }

  const [{ last }] = await db.select({ last: max(classes.sortOrder) }).from(classes).where(eq(classes.instituteId, instituteId));
  const [row] = await db
    .insert(classes)
    .values({ instituteId, name, nameBn, sortOrder: (last ?? -1) + 1 })
    .returning({ id: classes.id });
  // Every class starts with one section so students can be added straight away
  await db.insert(sections).values({ instituteId, classId: row.id, name: "A", shift: "day" });
  refresh("/dashboard/classes");
  return { ok: true, id: row.id };
}

export async function deleteClass(id: string): Promise<ActionResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const [{ n }] = await db.select({ n: count() }).from(students).where(and(eq(students.classId, id), eq(students.instituteId, instituteId)));
  if (n > 0) return { ok: false, error: `This class has ${n} student records. Move them to another class first.` };
  await db.delete(classes).where(and(eq(classes.id, id), eq(classes.instituteId, instituteId)));
  refresh("/dashboard/classes");
  return { ok: true };
}

/** Moves a class one place up or down in the list (and in every dropdown). */
export async function moveClass(id: string, direction: -1 | 1): Promise<ActionResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const rows = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.instituteId, me.active.instituteId))
    .orderBy(asc(classes.sortOrder), asc(classes.name));
  const order = rows.map((r) => r.id);
  const from = order.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];
  await Promise.all(order.map((cid, i) => db.update(classes).set({ sortOrder: i }).where(eq(classes.id, cid))));
  refresh("/dashboard/classes");
  return { ok: true };
}

/* ---------------------------------------------------------------- sections */

export async function saveSection(form: FormData): Promise<ActionResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const id = field(form, "id");
  const classId = field(form, "classId");
  const name = field(form, "name", 30);
  const shift = field(form, "shift") as Shift;
  const capacityRaw = toAsciiDigits(field(form, "capacity"));
  const capacity = capacityRaw ? Number(capacityRaw) : null;

  if (!name) return { ok: false, error: "Enter the section name, e.g. A or Boys.", field: "name" };
  if (!SHIFTS.includes(shift)) return { ok: false, error: "Choose the shift.", field: "shift" };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { ok: false, error: "Seats must be a whole number, or leave it empty.", field: "capacity" };

  const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.instituteId, instituteId))).limit(1);
  if (!cls) return { ok: false, error: "This class no longer exists." };

  const [clash] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.classId, classId), sql`lower(${sections.name}) = ${name.toLowerCase()}`, eq(sections.shift, shift), id ? ne(sections.id, id) : undefined))
    .limit(1);
  if (clash) return { ok: false, error: `Section ${name} already exists in this shift.`, field: "name" };

  if (id) {
    const [row] = await db
      .update(sections)
      .set({ name, shift, capacity })
      .where(and(eq(sections.id, id), eq(sections.instituteId, instituteId)))
      .returning({ id: sections.id });
    if (!row) return { ok: false, error: "This section no longer exists." };
  } else {
    await db.insert(sections).values({ instituteId, classId, name, shift, capacity });
  }
  refresh("/dashboard/classes", "/dashboard/students");
  return { ok: true };
}

export async function deleteSection(id: string): Promise<ActionResult> {
  const me = await assertInstituteMember("institute:settings");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const [{ n }] = await db.select({ n: count() }).from(students).where(and(eq(students.sectionId, id), eq(students.instituteId, instituteId)));
  if (n > 0) return { ok: false, error: `This section has ${n} student records. Move them first.` };
  await db.delete(sections).where(and(eq(sections.id, id), eq(sections.instituteId, instituteId)));
  refresh("/dashboard/classes");
  return { ok: true };
}

/* ---------------------------------------------------------------- students */

/** Next free roll in a section (among active students). */
async function nextRoll(sectionId: string) {
  const [{ last }] = await db
    .select({ last: max(students.roll) })
    .from(students)
    .where(and(eq(students.sectionId, sectionId), eq(students.status, "active")));
  return (last ?? 0) + 1;
}

/** "260001": two-digit admission year + the institute's next number for that year. */
async function nextStudentCode(instituteId: string) {
  const prefix = String(new Date().getUTCFullYear()).slice(2);
  const rows = await db
    .select({ code: students.studentCode })
    .from(students)
    .where(and(eq(students.instituteId, instituteId), like(students.studentCode, `${prefix}%`)));
  const last = rows.reduce((m, r) => Math.max(m, Number(r.code.slice(2)) || 0), 0);
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

export async function saveStudent(form: FormData): Promise<ActionResult> {
  const me = await assertInstituteMember("students:write");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const id = field(form, "id");

  const values = {
    name: field(form, "name", 120),
    nameBn: field(form, "nameBn", 120),
    gender: field(form, "gender") as Gender,
    dateOfBirth: field(form, "dateOfBirth") || null,
    sectionId: field(form, "sectionId"),
    guardianName: field(form, "guardianName", 120),
    guardianRelation: field(form, "guardianRelation", 40),
    guardianPhone: localMobile(field(form, "guardianPhone", 30)),
    address: field(form, "address", 300),
    studyGroup: ((STUDY_GROUPS as readonly string[]).includes(field(form, "group")) ? field(form, "group") : null) as StudyGroup | null,
  };
  const rollRaw = toAsciiDigits(field(form, "roll"));

  if (!values.name) return { ok: false, error: "Enter the student's name.", field: "name" };
  if (!GENDERS.includes(values.gender)) return { ok: false, error: "Choose boy or girl.", field: "gender" };
  if (values.dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(values.dateOfBirth) || values.dateOfBirth > new Date().toISOString().slice(0, 10))) {
    return { ok: false, error: "Enter a valid date of birth.", field: "dateOfBirth" };
  }
  if (!values.guardianName) return { ok: false, error: "Enter the guardian's name.", field: "guardianName" };
  if (!BD_MOBILE.test(values.guardianPhone)) return { ok: false, error: "Enter the guardian's mobile number (01XXXXXXXXX). Absence and fee SMS go here.", field: "guardianPhone" };
  if (rollRaw && (!Number.isInteger(Number(rollRaw)) || Number(rollRaw) < 1)) return { ok: false, error: "Roll must be a whole number, or leave it empty.", field: "roll" };

  const [sec] = await db
    .select({ id: sections.id, classId: sections.classId, capacity: sections.capacity })
    .from(sections)
    .where(and(eq(sections.id, values.sectionId), eq(sections.instituteId, instituteId)))
    .limit(1);
  if (!sec) return { ok: false, error: "Choose the class and section.", field: "sectionId" };

  const current = id
    ? (await db.select().from(students).where(and(eq(students.id, id), eq(students.instituteId, instituteId))).limit(1))[0]
    : undefined;
  if (id && !current) return { ok: false, error: "This student record no longer exists." };

  const movingIn = !current || current.sectionId !== sec.id;
  if (movingIn && sec.capacity) {
    const [{ n }] = await db.select({ n: count() }).from(students).where(and(eq(students.sectionId, sec.id), eq(students.status, "active")));
    if (n >= sec.capacity) return { ok: false, error: `This section is full (${sec.capacity} seats). Choose another section or raise its seats.`, field: "sectionId" };
  }

  const roll = rollRaw ? Number(rollRaw) : movingIn ? await nextRoll(sec.id) : current!.roll;
  const [taken] = await db
    .select({ name: students.name })
    .from(students)
    .where(and(eq(students.sectionId, sec.id), eq(students.roll, roll), eq(students.status, "active"), id ? ne(students.id, id) : undefined))
    .limit(1);
  if (taken) return { ok: false, error: `Roll ${roll} belongs to ${taken.name} in this section. Pick another or leave it empty.`, field: "roll" };

  const row = { ...values, classId: sec.classId, sectionId: sec.id, roll };
  if (current) {
    await db.update(students).set(row).where(eq(students.id, current.id));
    refresh("/dashboard/students", `/dashboard/students/${current.id}`, "/dashboard/classes");
    return { ok: true, id: current.id };
  }

  // Two people saving at the same moment could pick the same ID; try the next number
  for (let attempt = 0; attempt < 3; attempt++) {
    const studentCode = await nextStudentCode(instituteId);
    const [created] = await db
      .insert(students)
      .values({ instituteId, studentCode, ...row })
      .onConflictDoNothing()
      .returning({ id: students.id });
    if (created) {
      refresh("/dashboard/students", "/dashboard/classes");
      return { ok: true, id: created.id };
    }
  }
  return { ok: false, error: "Couldn't save the student. Try again." };
}

/** Marks a student as left or graduated (frees their roll), or back to active. */
export async function setStudentStatus(id: string, status: StudentStatus): Promise<ActionResult> {
  const me = await assertInstituteMember("students:write");
  if (!me) return NO_PERMISSION;
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };
  const instituteId = me.active.instituteId;
  const [s] = await db.select().from(students).where(and(eq(students.id, id), eq(students.instituteId, instituteId))).limit(1);
  if (!s) return { ok: false, error: "This student record no longer exists." };

  let roll = s.roll;
  if (status === "active" && s.status !== "active") {
    // Their old roll may have been given to someone else meanwhile
    const [taken] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.sectionId, s.sectionId), eq(students.roll, s.roll), eq(students.status, "active")))
      .limit(1);
    if (taken) roll = await nextRoll(s.sectionId);
  }
  await db.update(students).set({ status, roll }).where(eq(students.id, id));
  refresh("/dashboard/students", `/dashboard/students/${id}`, "/dashboard/classes");
  return { ok: true, message: roll !== s.roll ? `Back as active with roll ${roll} (their old roll is taken).` : undefined };
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadStudentPhoto(id: string, form: FormData): Promise<ActionResult> {
  const me = await assertInstituteMember("students:write");
  if (!me) return NO_PERMISSION;
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo." };
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: "The photo must be under 2 MB." };

  const instituteId = me.active.instituteId;
  const [s] = await db.select({ photoKey: students.photoKey }).from(students).where(and(eq(students.id, id), eq(students.instituteId, instituteId))).limit(1);
  if (!s) return { ok: false, error: "This student record no longer exists." };

  const key = `institutes/${instituteId}/students/${id}-${randomBytes(4).toString("hex")}.${ext}`;
  try {
    await putObject(key, await file.arrayBuffer(), file.type);
  } catch {
    return { ok: false, error: "The photo couldn't be uploaded. Try again." };
  }
  await db.update(students).set({ photoKey: key }).where(eq(students.id, id));
  if (s.photoKey) await deleteObject(s.photoKey);
  refresh("/dashboard/students", `/dashboard/students/${id}`);
  return { ok: true };
}

/* ---------------------------------------------------------------- staff */

const CAN_ADD = STAFF_ROLES_GRANTABLE;

export async function addStaff(form: FormData): Promise<ActionResult> {
  const me = await assertInstituteMember("members:manage");
  if (!me) return NO_PERMISSION;
  const name = field(form, "name", 120);
  const email = field(form, "email", 160).toLowerCase();
  const role = field(form, "role") as InstituteRole;
  const allowed = CAN_ADD[me.active.role] ?? [];

  if (!name) return { ok: false, error: "Enter their name.", field: "name" };
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email; they sign in with it.", field: "email" };
  if (!allowed.includes(role)) return { ok: false, error: "Choose a role you're allowed to give.", field: "role" };

  // Optional mobile: lets them sign in with an SMS code too
  const phoneRaw = field(form, "phone", 30);
  const phone = phoneRaw ? toE164(phoneRaw) : null;
  if (phoneRaw && !phone) return { ok: false, error: "Enter a valid mobile number (01XXXXXXXXX), or leave it empty.", field: "phone" };
  if (phone && (await phoneInUse(phone))) return { ok: false, error: "This mobile number already belongs to another account.", field: "phone" };

  let account: { id: string; created: boolean };
  try {
    account = await ensureAuthUser(email, name);
  } catch {
    return { ok: false, error: "The sign-in account couldn't be created. Try again in a minute." };
  }
  if (phone && account.created) await linkPhone(account.id, phone);

  const instituteId = me.active.instituteId;
  const [existing] = await db
    .select({ id: instituteMembers.id, role: instituteMembers.role })
    .from(instituteMembers)
    .where(and(eq(instituteMembers.userId, account.id), eq(instituteMembers.instituteId, instituteId)))
    .limit(1);
  if (existing) return { ok: false, error: `${email} already has access as ${roleLabel(existing.role, me.active.instituteType)}.`, field: "email" };

  await db.insert(instituteMembers).values({ userId: account.id, instituteId, role, invitedBy: me.id });
  const mail = await sendEmail({
    to: { email, name },
    ...memberWelcomeEmail({ name, email, instituteName: me.active.instituteName, instituteType: me.active.instituteType, role, newAccount: account.created, addedBy: me.name }),
  });
  refresh("/dashboard/staff");
  return {
    ok: true,
    message: mail.ok
      ? `${name} was added as ${roleLabel(role, me.active.instituteType)} and emailed how to sign in.`
      : `${name} was added as ${roleLabel(role, me.active.instituteType)}, but the email couldn't be sent. Ask them to use "Forgot password?" on the sign-in page.`,
  };
}

export async function removeStaff(memberId: string): Promise<ActionResult> {
  const me = await assertInstituteMember("members:manage");
  if (!me) return NO_PERMISSION;
  if (!UUID.test(memberId)) return { ok: false, error: "Unknown person." };
  const [member] = await db
    .select()
    .from(instituteMembers)
    .where(and(eq(instituteMembers.id, memberId), eq(instituteMembers.instituteId, me.active.instituteId)))
    .limit(1);
  if (!member) return { ok: false, error: "This person no longer has access." };
  if (member.userId === me.id) return { ok: false, error: "You can't remove yourself." };
  if (!(CAN_ADD[me.active.role] ?? []).includes(member.role)) return { ok: false, error: `Only Acadify can remove a ${roleLabel(member.role, me.active.instituteType)}.` };
  await db.delete(instituteMembers).where(eq(instituteMembers.id, memberId));
  refresh("/dashboard/staff");
  return { ok: true };
}
