"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db, demoRequests, platformActivity } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { demoConfirmationEmail, demoRequestAlertEmail } from "@/lib/email/templates";

const TYPES = ["school", "college", "qawmi", "alia", "hifz", "coaching", "unified"] as const;
const STUDENT_RANGES: Record<string, string> = {
  "under-300": "Under 300",
  "300-1500": "300 – 1,500",
  "1500-5000": "1,500 – 5,000",
  "over-5000": "Over 5,000",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (v: string) => v.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DemoRequestResult = { ok: true } | { ok: false; fields?: string[] };

/** Public action behind the website's "Book a Free Demo" form. Re-validates everything the client checked. */
export async function submitDemoRequest(formData: FormData): Promise<DemoRequestResult> {
  const get = (k: string, max = 200) => String(formData.get(k) ?? "").trim().slice(0, max);

  // Honeypot: real visitors never see or fill this field
  if (get("website")) return { ok: true };

  const name = get("name");
  const institute = get("institute");
  const type = get("type") as (typeof TYPES)[number];
  const phone = toAscii(get("phone", 30)).replace(/[\s-]/g, "");
  const email = get("email");
  const students = get("students");
  const message = get("message", 2000);

  const bad: string[] = [];
  if (!name) bad.push("name");
  if (!institute) bad.push("institute");
  if (!TYPES.includes(type)) bad.push("type");
  if (!BD_MOBILE.test(phone)) bad.push("phone");
  // Required: accepting or rejecting a request is answered by email
  if (!EMAIL.test(email)) bad.push("email");
  if (bad.length) return { ok: false, fields: bad };

  const [row] = await db
    .insert(demoRequests)
    .values({
      name,
      instituteName: institute,
      type,
      phone,
      email,
      studentsRange: STUDENT_RANGES[students] ?? null,
      message: message || null,
    })
    .returning({ id: demoRequests.id });

  await db.insert(platformActivity).values({ kind: "demo", text: `New demo request from ${institute} (DR-${row.id})` });

  // Emails go out after the response is sent, so the visitor never waits on them
  const details = { id: row.id, name, institute, type, phone, email, students: STUDENT_RANGES[students], message, receivedAt: new Date() };
  const salesInbox = process.env.SALES_NOTIFY_EMAIL || process.env.EMAIL_FROM;
  after(async () => {
    await Promise.all([
      salesInbox && sendEmail({ to: { email: salesInbox }, ...demoRequestAlertEmail(details), replyTo: { email, name } }),
      sendEmail({ to: { email, name }, ...demoConfirmationEmail(details), replyTo: salesInbox ? { email: salesInbox, name: "Acadify" } : undefined }),
    ]);
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}
