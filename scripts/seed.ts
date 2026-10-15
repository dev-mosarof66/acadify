/**
 * Sets up the subscription plans. Fake sample data (institutes, invoices, demo requests)
 * is only loaded when you ask for it, e.g. for a local demo database.
 *
 *   npm run db:seed                     # plans only (safe to re-run)
 *   npm run db:seed -- --sample         # plans + sample data, if the tables are empty
 *   npm run db:seed -- --sample --reset # clears the platform tables first (never touches neon_auth)
 *
 * Sample invoices are generated for every month each paying institute has been active, so revenue
 * and gateway charts are computed from real rows instead of a formula.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";

import { createDb } from "../lib/db/client";
import { demoRequests, institutes, plans, platformActivity, platformInvoices } from "../lib/db/schema";
import { ACTIVITY, DEMO_REQUESTS, INSTITUTES, INVOICES, PLANS } from "./seed-data";

const LAST_BILLED_MONTH = "2026-10";
const db = createDb();
const sample = process.argv.includes("--sample");
const reset = sample && process.argv.includes("--reset");

/** Small deterministic hash so re-seeding gives identical data. */
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;

function monthsBetween(fromIso: string, toKey: string) {
  const out: string[] = [];
  const d = new Date(`${fromIso.slice(0, 7)}-01T00:00:00Z`);
  while (monthKey(d) <= toKey) {
    out.push(monthKey(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** "Oct 2026" -> "2026-10" */
function periodToKey(period: string) {
  const d = new Date(`1 ${period} UTC`);
  return monthKey(d);
}

async function main() {
  if (!sample) {
    const added = await db
      .insert(plans)
      .values(Object.values(PLANS).map((p, i) => ({ key: p.key, name: p.name, priceBdt: p.price, studentLimit: p.studentLimit, sortOrder: i })))
      .onConflictDoNothing()
      .returning({ key: plans.key });
    console.log(added.length ? `Added ${added.length} plans.` : "Plans are already set up.");
    return;
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(institutes);
  if (count > 0 && !reset) {
    console.log(`institutes already has ${count} rows. Run with --reset to replace the sample data.`);
    return;
  }

  if (reset) {
    console.log("Clearing platform tables…");
    await db.delete(platformActivity);
    await db.delete(platformInvoices);
    await db.delete(demoRequests);
    await db.delete(institutes);
    await db.delete(plans);
    await db.execute(sql`alter table demo_requests alter column id restart with 1001`);
  }

  console.log("Plans…");
  await db
    .insert(plans)
    .values(Object.values(PLANS).map((p, i) => ({ key: p.key, name: p.name, priceBdt: p.price, studentLimit: p.studentLimit, sortOrder: i })))
    .onConflictDoNothing();

  console.log("Institutes…");
  const inserted = await db
    .insert(institutes)
    .values(
      INSTITUTES.map((i) => ({
        slug: i.slug,
        name: i.name,
        type: i.type,
        district: i.district,
        plan: i.plan,
        status: i.status,
        mrrBdt: i.mrr,
        studentCount: i.students,
        staffCount: i.staff,
        smsUsed: i.smsUsed,
        smsCredit: i.smsCredit,
        modules: i.modules,
        contactName: i.contact.name,
        contactRole: i.contact.role,
        contactPhone: i.contact.phone,
        contactEmail: i.contact.email,
        joinedOn: i.joined,
        renewsOn: i.renewsOn,
        lastActiveAt: new Date(i.lastActive),
      }))
    )
    .returning({ id: institutes.id, slug: institutes.slug });
  const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));

  console.log("Invoices…");
  // Known Sep/Oct 2026 outcomes from the sample list override the generated defaults
  const overrides = new Map(INVOICES.map((inv) => [`${inv.institute}|${periodToKey(inv.period)}`, inv]));
  const rows: (typeof platformInvoices.$inferInsert)[] = [];
  const counterByMonth = new Map<string, number>();
  const billable = [...INSTITUTES].filter((i) => i.status !== "trial").sort((a, b) => a.joined.localeCompare(b.joined));

  for (const inst of billable) {
    const amount = inst.mrr || PLANS[inst.plan].price || 0;
    if (!amount) continue;
    // Suspended institutes stop being billed after the month their renewal lapsed
    const lastMonth = inst.status === "suspended" ? inst.renewsOn.slice(0, 7) : LAST_BILLED_MONTH;

    for (const m of monthsBetween(inst.joined, lastMonth)) {
      const n = (counterByMonth.get(m) ?? 0) + 1;
      counterByMonth.set(m, n);
      const override = overrides.get(`${inst.slug}|${m}`);
      const h = hash(`${inst.slug}${m}`);
      const status = override?.status ?? (inst.status === "suspended" && m === lastMonth ? "overdue" : "paid");
      const method = status === "paid" ? (override?.method ?? (h % 100 < 45 ? "bKash" : h % 100 < 65 ? "Nagad" : "Bank")) : null;
      const issuedOn = `${m}-01`;
      const paidOn = status === "paid" ? (override?.paidOn ?? `${m}-${pad(2 + (h % 8))}`) : null;

      rows.push({
        id: `ACD-${m}-${String(n).padStart(3, "0")}`,
        instituteId: idBySlug.get(inst.slug)!,
        periodStart: issuedOn,
        amountBdt: amount,
        status,
        method,
        issuedOn,
        paidOn,
      });
    }
  }
  for (let i = 0; i < rows.length; i += 100) await db.insert(platformInvoices).values(rows.slice(i, i + 100));

  console.log("Demo requests…");
  await db.insert(demoRequests).values(
    [...DEMO_REQUESTS]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((d) => ({
        name: d.name,
        instituteName: d.institute,
        type: d.type,
        phone: d.phone,
        email: d.email ?? null,
        studentsRange: d.students,
        message: d.message ?? null,
        status: d.status,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.createdAt),
      }))
  );

  console.log("Activity…");
  await db.insert(platformActivity).values(
    ACTIVITY.map((a) => ({
      kind: a.kind,
      text: a.text,
      instituteId: a.institute ? (idBySlug.get(a.institute) ?? null) : null,
      createdAt: new Date(a.at),
    }))
  );

  console.log(
    `Done: ${Object.keys(PLANS).length} plans, ${inserted.length} institutes, ${rows.length} invoices, ${DEMO_REQUESTS.length} demo requests, ${ACTIVITY.length} activity items.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
