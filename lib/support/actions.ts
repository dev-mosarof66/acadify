"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { assertSuperAdmin } from "@/lib/auth/session";
import { db, institutes, supportTickets, ticketMessages } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { ticketOpenedEmail, ticketReplyEmail } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings/queries";
import type { TicketChannel, TicketPriority, TicketStatus } from "./queries";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHANNELS: TicketChannel[] = ["phone", "email", "whatsapp", "in_person"];
const PRIORITIES: TicketPriority[] = ["low", "normal", "high"];
const STATUSES: TicketStatus[] = ["open", "pending", "resolved"];

export type TicketResult = { ok: true; id: number; emailed?: boolean } | { ok: false; error: string; field?: string };

/** Replies come back to the support address from Platform Settings. */
async function replyTo() {
  const { supportEmail } = await getSettings();
  return { email: supportEmail, name: "Acadify support" };
}

function refresh(id?: number) {
  revalidatePath("/admin/support");
  if (id) revalidatePath(`/admin/support/${id}`);
}

/** Logs a ticket for an institute (from a call, email, WhatsApp or visit), optionally emailing an acknowledgement. */
export async function createTicket(form: FormData): Promise<TicketResult> {
  const admin = await assertSuperAdmin();
  const get = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const slug = get("institute");
  const subject = get("subject", 140);
  const message = get("message", 5000);
  const channel = get("channel") as TicketChannel;
  const priority = get("priority") as TicketPriority;
  const contactName = get("contactName", 100);
  const contactEmail = get("contactEmail", 160).toLowerCase();

  const [inst] = await db.select({ id: institutes.id, name: institutes.name }).from(institutes).where(eq(institutes.slug, slug)).limit(1);
  if (!inst) return { ok: false, error: "Choose the institute.", field: "institute" };
  if (!subject) return { ok: false, error: "Write a short subject.", field: "subject" };
  if (!message) return { ok: false, error: "Describe what they need.", field: "message" };
  if (!CHANNELS.includes(channel)) return { ok: false, error: "Choose how they contacted you.", field: "channel" };
  if (!PRIORITIES.includes(priority)) return { ok: false, error: "Choose a priority.", field: "priority" };
  if (!contactName) return { ok: false, error: "Enter the contact's name.", field: "contactName" };
  if (!EMAIL.test(contactEmail)) return { ok: false, error: "Enter the contact's email; replies are sent there.", field: "contactEmail" };

  const [ticket] = await db
    .insert(supportTickets)
    .values({ instituteId: inst.id, subject, channel, priority, contactName, contactEmail, createdBy: admin.id })
    .returning({ id: supportTickets.id });
  await db.insert(ticketMessages).values({ ticketId: ticket.id, author: "institute", authorName: contactName, body: message });

  let emailed: boolean | undefined;
  if (form.get("notify") === "on") {
    const mail = await sendEmail({
      to: { email: contactEmail, name: contactName },
      ...ticketOpenedEmail({ id: ticket.id, name: contactName, subject, instituteName: inst.name }),
      replyTo: await replyTo(),
    });
    emailed = mail.ok;
  }
  refresh();
  return { ok: true, id: ticket.id, emailed };
}

/**
 * Adds a reply (emailed to the contact) or an internal note (never emailed), and optionally changes the status.
 * A reply without a status choice moves the ticket to "waiting on institute".
 */
export async function replyToTicket(id: number, form: FormData): Promise<TicketResult> {
  const admin = await assertSuperAdmin();
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  const internal = form.get("internal") === "on";
  const requested = String(form.get("status") ?? "") as TicketStatus;
  if (!body) return { ok: false, error: internal ? "Write the note." : "Write the reply.", field: "body" };

  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return { ok: false, error: "This ticket no longer exists." };

  const status: TicketStatus = STATUSES.includes(requested) ? requested : internal ? ticket.status : "pending";
  let emailed = false;
  if (!internal) {
    const mail = await sendEmail({
      to: { email: ticket.contactEmail, name: ticket.contactName },
      ...ticketReplyEmail({ id, name: ticket.contactName, subject: ticket.subject, reply: body, staffName: admin.name, resolved: status === "resolved" }),
      replyTo: await replyTo(),
    });
    emailed = mail.ok;
    if (!mail.ok) return { ok: false, error: "The email couldn't be sent, so the reply wasn't saved. Try again, or save it as an internal note." };
  }

  await db.insert(ticketMessages).values({ ticketId: id, author: "staff", authorName: admin.name, body, internal, emailed });
  await db
    .update(supportTickets)
    .set({ status, resolvedAt: status === "resolved" ? (ticket.resolvedAt ?? new Date()) : null })
    .where(eq(supportTickets.id, id));
  refresh(id);
  return { ok: true, id, emailed };
}

/** Records what the institute said (e.g. on a follow-up call) and reopens the ticket. */
export async function logInstituteMessage(id: number, form: FormData): Promise<TicketResult> {
  await assertSuperAdmin();
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (!body) return { ok: false, error: "Write what they said.", field: "body" };
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return { ok: false, error: "This ticket no longer exists." };
  await db.insert(ticketMessages).values({ ticketId: id, author: "institute", authorName: ticket.contactName, body });
  await db.update(supportTickets).set({ status: "open", resolvedAt: null }).where(eq(supportTickets.id, id));
  refresh(id);
  return { ok: true, id };
}

export async function updateTicket(id: number, change: { status?: TicketStatus; priority?: TicketPriority }): Promise<{ ok: boolean }> {
  await assertSuperAdmin();
  const set: Partial<typeof supportTickets.$inferInsert> = {};
  if (change.status && STATUSES.includes(change.status)) {
    set.status = change.status;
    set.resolvedAt = change.status === "resolved" ? new Date() : null;
  }
  if (change.priority && PRIORITIES.includes(change.priority)) set.priority = change.priority;
  if (!Object.keys(set).length) return { ok: false };
  await db.update(supportTickets).set(set).where(eq(supportTickets.id, id));
  refresh(id);
  return { ok: true };
}
