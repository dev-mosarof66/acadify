"use server";

import { and, asc, eq, inArray, isNull, like, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertInstituteMember } from "@/lib/auth/session";
import { classes, db, feeBillItems, feeBills, feeHeadAmounts, feeHeads, feePaymentAllocations, feePayments, students } from "@/lib/db";
import { sendInstituteSms } from "@/lib/sms/send";
import type { FeeFrequency, PaymentMethod } from "./queries";

export type FeeResult = { ok: true; id?: string; message?: string } | { ok: false; error: string; field?: string };

const NO_PERMISSION: FeeResult = { ok: false, error: "Your role can't do this. Ask your principal." };
const METHODS: PaymentMethod[] = ["cash", "bkash", "nagad", "rocket", "bank"];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const amountOf = (raw: FormDataEntryValue | null) => {
  const v = toAsciiDigits(String(raw ?? "")).replace(/[,\s৳]/g, "");
  return v ? Number(v) : NaN;
};
const field = (form: FormData, k: string, max = 120) => String(form.get(k) ?? "").trim().slice(0, max);
const dhakaToday = () => new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
const yymm = () => dhakaToday().slice(2, 7).replace("-", "");

function refresh() {
  revalidatePath("/dashboard", "layout");
}

/** Next number like B-2610-0007 for bills or R-2610-0007 for receipts (per institute, per month). */
async function nextNumber(kind: "B" | "R", instituteId: string) {
  const prefix = `${kind}-${yymm()}-`;
  const col = kind === "B" ? feeBills.billNo : feePayments.receiptNo;
  const table = kind === "B" ? feeBills : feePayments;
  const rows = await db
    .select({ no: col })
    .from(table)
    .where(and(eq(table.instituteId, instituteId), like(col, `${prefix}%`)));
  const last = rows.reduce((m, r) => Math.max(m, Number(r.no.slice(prefix.length)) || 0), 0);
  return (offset = 0) => `${prefix}${String(last + 1 + offset).padStart(4, "0")}`;
}

/* ---------------------------------------------------------------- fee heads */

export async function saveFeeHead(form: FormData): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const id = field(form, "id");
  const name = field(form, "name", 60);
  const nameBn = field(form, "nameBn", 60);
  const frequency = field(form, "frequency") as FeeFrequency;
  const amount = amountOf(form.get("amount"));

  if (!name) return { ok: false, error: "Enter the fee name, e.g. Tuition.", field: "name" };
  if (frequency !== "monthly" && frequency !== "one_time") return { ok: false, error: "Choose monthly or one time.", field: "frequency" };
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: "Enter the amount in taka.", field: "amount" };

  if (id) {
    const [row] = await db
      .update(feeHeads)
      .set({ name, nameBn, frequency, amount })
      .where(and(eq(feeHeads.id, id), eq(feeHeads.instituteId, instituteId)))
      .returning({ id: feeHeads.id });
    if (!row) return { ok: false, error: "This fee no longer exists." };
  } else {
    const [{ last }] = await db.select({ last: max(feeHeads.sortOrder) }).from(feeHeads).where(eq(feeHeads.instituteId, instituteId));
    await db.insert(feeHeads).values({ instituteId, name, nameBn, frequency, amount, sortOrder: (last ?? -1) + 1 });
  }
  refresh();
  return { ok: true };
}

export async function setFeeHeadActive(id: string, isActive: boolean): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  await db.update(feeHeads).set({ isActive }).where(and(eq(feeHeads.id, id), eq(feeHeads.instituteId, me.active.instituteId)));
  refresh();
  return { ok: true };
}

/** Sets a class's own amount for a fee, or clears it (null) to use the default. */
export async function setClassFeeAmount(feeHeadId: string, classId: string, raw: string): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const [[head], [cls]] = await Promise.all([
    db.select({ id: feeHeads.id }).from(feeHeads).where(and(eq(feeHeads.id, feeHeadId), eq(feeHeads.instituteId, instituteId))).limit(1),
    db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.instituteId, instituteId))).limit(1),
  ]);
  if (!head || !cls) return { ok: false, error: "That fee or class isn't in your institute." };

  if (!raw.trim()) {
    await db.delete(feeHeadAmounts).where(and(eq(feeHeadAmounts.feeHeadId, feeHeadId), eq(feeHeadAmounts.classId, classId)));
  } else {
    const amount = amountOf(raw);
    if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: "Enter a whole amount in taka." };
    await db
      .insert(feeHeadAmounts)
      .values({ feeHeadId, classId, amount })
      .onConflictDoUpdate({ target: [feeHeadAmounts.feeHeadId, feeHeadAmounts.classId], set: { amount } });
  }
  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- bills */

const MONTH_NAME = (m: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

/**
 * 1-click monthly bills: every active student (optionally one class) who doesn't have that month's bill yet
 * gets one, with each active monthly fee at their class's amount.
 */
export async function generateMonthlyBills(month: string, classId: string | null, dueDay: number): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  if (!MONTH.test(month)) return { ok: false, error: "Choose the month." };
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) return { ok: false, error: "The due day must be between 1 and 28." };
  const instituteId = me.active.instituteId;

  const heads = await db
    .select()
    .from(feeHeads)
    .where(and(eq(feeHeads.instituteId, instituteId), eq(feeHeads.isActive, true), eq(feeHeads.frequency, "monthly")))
    .orderBy(asc(feeHeads.sortOrder));
  if (!heads.length) return { ok: false, error: "Add at least one monthly fee (like Tuition) under Fee setup first." };
  const overrides = await db
    .select()
    .from(feeHeadAmounts)
    .where(
      inArray(
        feeHeadAmounts.feeHeadId,
        heads.map((h) => h.id)
      )
    );

  const pending = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .leftJoin(feeBills, and(eq(feeBills.studentId, students.id), eq(feeBills.month, month)))
    .where(and(eq(students.instituteId, instituteId), eq(students.status, "active"), classId ? eq(students.classId, classId) : undefined, isNull(feeBills.id)));
  if (!pending.length) return { ok: true, message: `Everyone already has a bill for ${MONTH_NAME(month)}.` };

  const dueDate = `${month}-${String(dueDay).padStart(2, "0")}`;
  const number = await nextNumber("B", instituteId);
  let made = 0;
  let total = 0;
  for (const s of pending) {
    const items = heads
      .map((h) => ({ feeHeadId: h.id, label: h.name, amount: overrides.find((o) => o.feeHeadId === h.id && o.classId === s.classId)?.amount ?? h.amount }))
      .filter((i) => i.amount > 0);
    const sum = items.reduce((n, i) => n + i.amount, 0);
    if (!sum) continue;
    const [bill] = await db
      .insert(feeBills)
      .values({ instituteId, studentId: s.id, billNo: number(made), title: `${MONTH_NAME(month)} fees`, month, total: sum, dueDate, createdBy: me.id })
      .onConflictDoNothing()
      .returning({ id: feeBills.id });
    if (!bill) continue;
    await db.insert(feeBillItems).values(items.map((i) => ({ billId: bill.id, ...i })));
    made++;
    total += sum;
  }
  refresh();
  return { ok: true, message: `${made} bills made for ${MONTH_NAME(month)}, ৳${total.toLocaleString("en-IN")} in total.` };
}

/** A one-time charge (admission, exam fee…) for a whole class or one student. */
export async function createOneTimeBills(form: FormData): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const feeHeadId = field(form, "feeHeadId");
  const target = field(form, "target"); // "class:<id>" or "student:<id>"
  const dueDate = field(form, "dueDate");

  const [head] = await db.select().from(feeHeads).where(and(eq(feeHeads.id, feeHeadId), eq(feeHeads.instituteId, instituteId))).limit(1);
  if (!head) return { ok: false, error: "Choose the fee.", field: "feeHeadId" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: "Choose the due date.", field: "dueDate" };

  const [kind, targetId] = target.split(":");
  const list = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(
      and(
        eq(students.instituteId, instituteId),
        eq(students.status, "active"),
        kind === "class" ? eq(students.classId, targetId) : kind === "student" ? eq(students.id, targetId) : sql`false`
      )
    );
  if (!list.length) return { ok: false, error: "Choose a class with active students, or a student.", field: "target" };

  const overrides = await db.select().from(feeHeadAmounts).where(eq(feeHeadAmounts.feeHeadId, head.id));
  const number = await nextNumber("B", instituteId);
  let made = 0;
  for (const s of list) {
    const amount = overrides.find((o) => o.classId === s.classId)?.amount ?? head.amount;
    if (!amount) continue;
    const [bill] = await db
      .insert(feeBills)
      .values({ instituteId, studentId: s.id, billNo: number(made), title: head.name, month: null, total: amount, dueDate, createdBy: me.id })
      .onConflictDoNothing()
      .returning({ id: feeBills.id });
    if (!bill) continue;
    await db.insert(feeBillItems).values({ billId: bill.id, feeHeadId: head.id, label: head.name, amount });
    made++;
  }
  refresh();
  return { ok: true, message: `${made} ${made === 1 ? "bill" : "bills"} made for ${head.name}.` };
}

export async function waiveBill(billId: string): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:manage");
  if (!me) return NO_PERMISSION;
  const [bill] = await db
    .update(feeBills)
    .set({ status: "waived" })
    .where(and(eq(feeBills.id, billId), eq(feeBills.instituteId, me.active.instituteId), inArray(feeBills.status, ["due", "partial"])))
    .returning({ id: feeBills.id });
  if (!bill) return { ok: false, error: "This bill is already paid or waived." };
  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- payments */

/** Takes a payment at the counter and pays off the student's oldest bills first. Returns the payment id for the receipt. */
export async function collectPayment(form: FormData): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:collect");
  if (!me) return NO_PERMISSION;
  const instituteId = me.active.instituteId;
  const studentId = field(form, "studentId");
  const amount = amountOf(form.get("amount"));
  const method = field(form, "method") as PaymentMethod;
  const reference = field(form, "reference", 60);
  const note = field(form, "note", 200);

  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Enter the amount received.", field: "amount" };
  if (!METHODS.includes(method)) return { ok: false, error: "Choose how they paid.", field: "method" };
  if (method !== "cash" && !reference) return { ok: false, error: "Enter the transaction ID or bank reference.", field: "reference" };

  const open = await db
    .select({ id: feeBills.id, total: feeBills.total, paid: feeBills.paid })
    .from(feeBills)
    .where(and(eq(feeBills.instituteId, instituteId), eq(feeBills.studentId, studentId), inArray(feeBills.status, ["due", "partial"])))
    .orderBy(asc(feeBills.dueDate), asc(feeBills.billNo));
  const owed = open.reduce((n, b) => n + b.total - b.paid, 0);
  if (!open.length) return { ok: false, error: "This student has nothing to pay." };
  if (amount > owed) return { ok: false, error: `That's more than they owe (৳${owed.toLocaleString("en-IN")}).`, field: "amount" };

  const number = await nextNumber("R", instituteId);
  let payment: { id: string } | undefined;
  for (let attempt = 0; attempt < 3 && !payment; attempt++) {
    [payment] = await db
      .insert(feePayments)
      .values({ instituteId, studentId, receiptNo: number(attempt), amount, method, reference, note, receivedBy: me.id, receivedByName: me.name })
      .onConflictDoNothing()
      .returning({ id: feePayments.id });
  }
  if (!payment) return { ok: false, error: "Couldn't number the receipt. Try again." };

  // Oldest bills first
  let left = amount;
  for (const b of open) {
    if (!left) break;
    const take = Math.min(left, b.total - b.paid);
    left -= take;
    const paid = b.paid + take;
    await db.update(feeBills).set({ paid, status: paid >= b.total ? "paid" : "partial" }).where(eq(feeBills.id, b.id));
    await db.insert(feePaymentAllocations).values({ paymentId: payment.id, billId: b.id, amount: take });
  }
  refresh();
  return { ok: true, id: payment.id };
}

/** SMS reminders to guardians of students who owe money. */
export async function sendDueReminders(studentIds: string[]): Promise<FeeResult> {
  const me = await assertInstituteMember("fees:collect");
  if (!me) return NO_PERMISSION;
  if (!studentIds.length) return { ok: false, error: "Choose who to remind." };
  const rows = await db
    .select({
      name: students.name,
      nameBn: students.nameBn,
      phone: students.guardianPhone,
      owed: sql<number>`sum(${feeBills.total} - ${feeBills.paid})::int`,
    })
    .from(feeBills)
    .innerJoin(students, eq(feeBills.studentId, students.id))
    .where(and(eq(feeBills.instituteId, me.active.instituteId), inArray(feeBills.status, ["due", "partial"]), inArray(feeBills.studentId, studentIds.slice(0, 500))))
    .groupBy(students.id);

  const result = await sendInstituteSms(
    me.active.instituteId,
    rows.map((r) => ({ to: r.phone, body: `প্রিয় অভিভাবক, ${r.nameBn || r.name}-এর ${r.owed} টাকা বেতন বকেয়া আছে। অনুগ্রহ করে পরিশোধ করুন। - ${me.active.instituteName}` }))
  );
  if (!result.ok) {
    if (result.reason === "not-connected") return { ok: false, error: "SMS isn't set up yet. Acadify will turn it on soon." };
    if (result.reason === "no-credit") return { ok: false, error: `Not enough SMS credit: this needs ${result.needed} and ${result.balance} are left.` };
    return { ok: false, error: "There was nothing to send." };
  }
  return { ok: true, message: result.failed ? `${result.sent} reminders sent, ${result.failed} failed.` : `${result.sent} guardians reminded.` };
}
