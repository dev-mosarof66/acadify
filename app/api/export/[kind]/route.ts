import { and, asc, desc, eq, gte, lt } from "drizzle-orm";

import { toCsv } from "@/lib/csv";
import { assertInstituteMember } from "@/lib/auth/session";
import { db, feePayments, students } from "@/lib/db";
import { getDues } from "@/lib/fees/queries";
import { getStudents } from "@/lib/institute/queries";
import { METHOD_LABELS } from "@/lib/fees/format";

const csv = (name: string, rows: string[][]) =>
  new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });

/** Spreadsheet exports (CSV with a BOM, so Excel opens Bangla text correctly): students, dues, payments (?month=YYYY-MM). */
export async function GET(request: Request, { params }: RouteContext<"/api/export/[kind]">) {
  const { kind } = await params;
  const stamp = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);

  if (kind === "students") {
    const me = await assertInstituteMember("students:read");
    if (!me) return new Response("Not allowed", { status: 403 });
    const list = await getStudents(me.active.instituteId);
    return csv(`students-${stamp}.csv`, [
      ["ID", "Name", "Name (Bangla)", "Gender", "Class", "Section", "Roll", "Guardian", "Relation", "Guardian phone", "Address", "Status", "Admitted"],
      ...list.map((s) => [s.studentCode, s.name, s.nameBn, s.gender, s.className, s.sectionName, String(s.roll), s.guardianName, s.guardianRelation, s.guardianPhone, s.address, s.status, s.admittedOn]),
    ]);
  }

  if (kind === "dues") {
    const me = await assertInstituteMember("fees:read");
    if (!me) return new Response("Not allowed", { status: 403 });
    const dues = await getDues(me.active.instituteId);
    return csv(`dues-${stamp}.csv`, [
      ["ID", "Name", "Class", "Section", "Roll", "Guardian phone", "Unpaid bills", "Oldest due date", "Amount owed (BDT)"],
      ...dues.map((d) => [d.studentCode, d.name, d.className, d.sectionName, String(d.roll), d.guardianPhone, String(d.bills), d.oldestDue, String(d.owed)]),
    ]);
  }

  if (kind === "payments") {
    const me = await assertInstituteMember("fees:read");
    if (!me) return new Response("Not allowed", { status: 403 });
    const month = new URL(request.url).searchParams.get("month") ?? "";
    const filters = [eq(feePayments.instituteId, me.active.instituteId)];
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      // Dhaka is UTC+6
      filters.push(gte(feePayments.paidAt, new Date(`${month}-01T00:00:00+06:00`)), lt(feePayments.paidAt, new Date(`${next}-01T00:00:00+06:00`)));
    }
    const rows = await db
      .select({ receiptNo: feePayments.receiptNo, paidAt: feePayments.paidAt, code: students.studentCode, name: students.name, amount: feePayments.amount, method: feePayments.method, by: feePayments.receivedByName })
      .from(feePayments)
      .innerJoin(students, eq(feePayments.studentId, students.id))
      .where(and(...filters))
      .orderBy(desc(feePayments.paidAt), asc(feePayments.receiptNo))
      .limit(20000);
    return csv(`payments-${month || stamp}.csv`, [
      ["Receipt", "Date (Dhaka)", "Student ID", "Student", "Amount (BDT)", "Method", "Received by"],
      ...rows.map((r) => [r.receiptNo, new Date(r.paidAt.getTime() + 6 * 3600_000).toISOString().slice(0, 16).replace("T", " "), r.code, r.name, String(r.amount), METHOD_LABELS[r.method] ?? r.method, r.by]),
    ]);
  }

  return new Response("Not found", { status: 404 });
}
