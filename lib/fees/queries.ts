import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { classes, db, feeBillItems, feeBills, feeHeadAmounts, feeHeads, feePaymentAllocations, feePayments, institutes, sections, students } from "@/lib/db";

/*
 * Fees for one institute. Callers pass the signed-in member's active institute id, never one from the browser.
 * Amounts are whole taka.
 */

export type FeeFrequency = "monthly" | "one_time";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "rocket" | "bank";
export type BillStatus = "due" | "partial" | "paid" | "waived";

export { METHOD_LABELS } from "./format";

/** "2026-10" for a Dhaka date. */
export const monthOf = (ms: number) => new Date(ms + 6 * 3600_000).toISOString().slice(0, 7);
const dhakaMonthStart = (ms: number) => {
  const d = new Date(ms + 6 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 6 * 3600_000);
};
const dhakaDayStart = (ms: number) => {
  const d = new Date(ms + 6 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 6 * 3600_000);
};

export interface FeeHeadView {
  id: string;
  name: string;
  nameBn: string;
  frequency: FeeFrequency;
  amount: number;
  isActive: boolean;
  /** classId → amount, where a class differs from the default. */
  classAmounts: Record<string, number>;
}

export async function getFeeHeads(instituteId: string): Promise<FeeHeadView[]> {
  const [heads, overrides] = await Promise.all([
    db.select().from(feeHeads).where(eq(feeHeads.instituteId, instituteId)).orderBy(asc(feeHeads.sortOrder), asc(feeHeads.name)),
    db
      .select({ feeHeadId: feeHeadAmounts.feeHeadId, classId: feeHeadAmounts.classId, amount: feeHeadAmounts.amount })
      .from(feeHeadAmounts)
      .innerJoin(feeHeads, eq(feeHeadAmounts.feeHeadId, feeHeads.id))
      .where(eq(feeHeads.instituteId, instituteId)),
  ]);
  return heads.map((h) => ({
    id: h.id,
    name: h.name,
    nameBn: h.nameBn,
    frequency: h.frequency,
    amount: h.amount,
    isActive: h.isActive,
    classAmounts: Object.fromEntries(overrides.filter((o) => o.feeHeadId === h.id).map((o) => [o.classId, o.amount])),
  }));
}

export interface PaymentRow {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: PaymentMethod;
  receivedByName: string;
  paidAt: string;
}

const paymentSelect = {
  id: feePayments.id,
  receiptNo: feePayments.receiptNo,
  studentId: feePayments.studentId,
  studentName: students.name,
  amount: feePayments.amount,
  method: feePayments.method,
  receivedByName: feePayments.receivedByName,
  paidAt: feePayments.paidAt,
};

export async function getFeeOverview(instituteId: string, now: number) {
  const today = new Date(now + 6 * 3600_000).toISOString().slice(0, 10);
  const [[month], [day], [outstanding], [overdue], recent] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${feePayments.amount}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(feePayments)
      .where(and(eq(feePayments.instituteId, instituteId), gte(feePayments.paidAt, dhakaMonthStart(now)))),
    db
      .select({ total: sql<number>`coalesce(sum(${feePayments.amount}), 0)::int` })
      .from(feePayments)
      .where(and(eq(feePayments.instituteId, instituteId), gte(feePayments.paidAt, dhakaDayStart(now)))),
    db
      .select({ total: sql<number>`coalesce(sum(${feeBills.total} - ${feeBills.paid}), 0)::int`, students: sql<number>`count(distinct ${feeBills.studentId})::int` })
      .from(feeBills)
      .where(and(eq(feeBills.instituteId, instituteId), inArray(feeBills.status, ["due", "partial"]))),
    db
      .select({ students: sql<number>`count(distinct ${feeBills.studentId})::int` })
      .from(feeBills)
      .where(and(eq(feeBills.instituteId, instituteId), inArray(feeBills.status, ["due", "partial"]), lt(feeBills.dueDate, today))),
    db
      .select(paymentSelect)
      .from(feePayments)
      .innerJoin(students, eq(feePayments.studentId, students.id))
      .where(eq(feePayments.instituteId, instituteId))
      .orderBy(desc(feePayments.paidAt))
      .limit(10),
  ]);
  return {
    collectedThisMonth: month?.total ?? 0,
    paymentsThisMonth: month?.n ?? 0,
    collectedToday: day?.total ?? 0,
    outstanding: outstanding?.total ?? 0,
    studentsOwing: outstanding?.students ?? 0,
    studentsOverdue: overdue?.students ?? 0,
    recent: recent.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() })) as PaymentRow[],
  };
}

export interface BillView {
  id: string;
  billNo: string;
  title: string;
  month: string | null;
  total: number;
  paid: number;
  status: BillStatus;
  dueDate: string;
  items: { label: string; amount: number }[];
}

/** A student's bills (newest first) and payments, for the counter and their fee page. */
export async function getStudentFees(instituteId: string, studentId: string) {
  const bills = await db
    .select()
    .from(feeBills)
    .where(and(eq(feeBills.instituteId, instituteId), eq(feeBills.studentId, studentId)))
    .orderBy(desc(feeBills.dueDate), desc(feeBills.billNo));
  const items = bills.length
    ? await db
        .select({ billId: feeBillItems.billId, label: feeBillItems.label, amount: feeBillItems.amount })
        .from(feeBillItems)
        .where(
          inArray(
            feeBillItems.billId,
            bills.map((b) => b.id)
          )
        )
    : [];
  const payments = await db
    .select(paymentSelect)
    .from(feePayments)
    .innerJoin(students, eq(feePayments.studentId, students.id))
    .where(and(eq(feePayments.instituteId, instituteId), eq(feePayments.studentId, studentId)))
    .orderBy(desc(feePayments.paidAt));

  return {
    bills: bills.map<BillView>((b) => ({
      id: b.id,
      billNo: b.billNo,
      title: b.title,
      month: b.month,
      total: b.total,
      paid: b.paid,
      status: b.status,
      dueDate: b.dueDate,
      items: items.filter((i) => i.billId === b.id).map((i) => ({ label: i.label, amount: i.amount })),
    })),
    payments: payments.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() })) as PaymentRow[],
    outstanding: bills.filter((b) => b.status === "due" || b.status === "partial").reduce((n, b) => n + b.total - b.paid, 0),
  };
}

export interface DueRow {
  studentId: string;
  studentCode: string;
  name: string;
  className: string;
  sectionName: string;
  roll: number;
  guardianPhone: string;
  owed: number;
  bills: number;
  oldestDue: string;
}

/** Students who owe money, most owed first. */
export async function getDues(instituteId: string): Promise<DueRow[]> {
  const rows = await db
    .select({
      studentId: students.id,
      studentCode: students.studentCode,
      name: students.name,
      className: classes.name,
      sectionName: sections.name,
      roll: students.roll,
      guardianPhone: students.guardianPhone,
      owed: sql<number>`sum(${feeBills.total} - ${feeBills.paid})::int`,
      bills: sql<number>`count(*)::int`,
      oldestDue: sql<string>`min(${feeBills.dueDate})::text`,
    })
    .from(feeBills)
    .innerJoin(students, eq(feeBills.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .where(and(eq(feeBills.instituteId, instituteId), inArray(feeBills.status, ["due", "partial"])))
    .groupBy(students.id, classes.name, classes.sortOrder, sections.name)
    .orderBy(desc(sql`sum(${feeBills.total} - ${feeBills.paid})`));
  return rows;
}

/** For a month: how many active students in each class already have that month's bill. */
export async function getMonthBilling(instituteId: string, month: string) {
  const rows = await db
    .select({
      classId: classes.id,
      className: classes.name,
      students: sql<number>`count(distinct ${students.id}) filter (where ${students.status} = 'active')::int`,
      billed: sql<number>`count(distinct ${feeBills.studentId})::int`,
      total: sql<number>`coalesce(sum(${feeBills.total}), 0)::int`,
    })
    .from(classes)
    .leftJoin(students, eq(students.classId, classes.id))
    .leftJoin(feeBills, and(eq(feeBills.studentId, students.id), eq(feeBills.month, month)))
    .where(eq(classes.instituteId, instituteId))
    .groupBy(classes.id, classes.name, classes.sortOrder)
    .orderBy(asc(classes.sortOrder));
  return rows;
}

/** Active students with what they owe, for the counter's search box. */
export async function getCounterStudents(instituteId: string) {
  return db
    .select({
      id: students.id,
      name: students.name,
      code: students.studentCode,
      className: classes.name,
      sectionName: sections.name,
      roll: students.roll,
      owed: sql<number>`coalesce(sum(${feeBills.total} - ${feeBills.paid}) filter (where ${feeBills.status} in ('due', 'partial')), 0)::int`,
    })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .leftJoin(feeBills, eq(feeBills.studentId, students.id))
    .where(and(eq(students.instituteId, instituteId), eq(students.status, "active")))
    .groupBy(students.id, classes.name, classes.sortOrder, sections.name)
    .orderBy(asc(classes.sortOrder), asc(students.roll));
}

/** Everything a printed receipt needs. */
export async function getReceipt(instituteId: string, paymentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return null;
  const [row] = await db
    .select({
      p: feePayments,
      studentName: students.name,
      studentCode: students.studentCode,
      roll: students.roll,
      guardianName: students.guardianName,
      className: classes.name,
      sectionName: sections.name,
      instituteName: institutes.name,
      instituteDistrict: institutes.district,
      institutePhone: institutes.contactPhone,
    })
    .from(feePayments)
    .innerJoin(students, eq(feePayments.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(sections, eq(students.sectionId, sections.id))
    .innerJoin(institutes, eq(feePayments.instituteId, institutes.id))
    .where(and(eq(feePayments.instituteId, instituteId), eq(feePayments.id, paymentId)))
    .limit(1);
  if (!row) return null;

  const lines = await db
    .select({ amount: feePaymentAllocations.amount, billNo: feeBills.billNo, title: feeBills.title, total: feeBills.total, paid: feeBills.paid })
    .from(feePaymentAllocations)
    .innerJoin(feeBills, eq(feePaymentAllocations.billId, feeBills.id))
    .where(eq(feePaymentAllocations.paymentId, paymentId));
  const [{ remaining }] = await db
    .select({ remaining: sql<number>`coalesce(sum(${feeBills.total} - ${feeBills.paid}), 0)::int` })
    .from(feeBills)
    .where(and(eq(feeBills.studentId, row.p.studentId), inArray(feeBills.status, ["due", "partial"])));

  return {
    receiptNo: row.p.receiptNo,
    amount: row.p.amount,
    method: row.p.method,
    reference: row.p.reference,
    note: row.p.note,
    paidAt: row.p.paidAt.toISOString(),
    receivedByName: row.p.receivedByName,
    student: { id: row.p.studentId, name: row.studentName, code: row.studentCode, roll: row.roll, guardianName: row.guardianName, className: row.className, sectionName: row.sectionName },
    institute: { name: row.instituteName, district: row.instituteDistrict, phone: row.institutePhone },
    lines,
    remaining,
  };
}
