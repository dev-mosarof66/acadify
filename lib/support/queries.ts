import "server-only";

import { asc, count, desc, eq, max } from "drizzle-orm";

import { db, institutes, supportTickets, ticketMessages } from "@/lib/db";

export type TicketStatus = "open" | "pending" | "resolved";
export type TicketPriority = "low" | "normal" | "high";
export type TicketChannel = "phone" | "email" | "whatsapp" | "in_person";

export interface TicketSummary {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  instituteSlug: string;
  instituteName: string;
  contactName: string;
  contactEmail: string;
  messages: number;
  createdAt: string;
  /** Time of the latest message (or creation). */
  lastActivity: string;
  resolvedAt: string | null;
}

export interface TicketMessage {
  id: string;
  author: "staff" | "institute";
  authorName: string;
  body: string;
  internal: boolean;
  emailed: boolean;
  createdAt: string;
}

export async function getTickets(): Promise<TicketSummary[]> {
  const rows = await db
    .select({
      t: supportTickets,
      slug: institutes.slug,
      name: institutes.name,
      messages: count(ticketMessages.id),
      last: max(ticketMessages.createdAt),
    })
    .from(supportTickets)
    .innerJoin(institutes, eq(supportTickets.instituteId, institutes.id))
    .leftJoin(ticketMessages, eq(ticketMessages.ticketId, supportTickets.id))
    .groupBy(supportTickets.id, institutes.slug, institutes.name)
    .orderBy(desc(supportTickets.updatedAt));

  return rows.map(({ t, slug, name, messages, last }) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    channel: t.channel,
    instituteSlug: slug,
    instituteName: name,
    contactName: t.contactName,
    contactEmail: t.contactEmail,
    messages,
    createdAt: t.createdAt.toISOString(),
    lastActivity: (last ? new Date(last) : t.updatedAt).toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
  }));
}

export async function getTicket(id: number): Promise<(TicketSummary & { thread: TicketMessage[] }) | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = await db
    .select({ t: supportTickets, slug: institutes.slug, name: institutes.name })
    .from(supportTickets)
    .innerJoin(institutes, eq(supportTickets.instituteId, institutes.id))
    .where(eq(supportTickets.id, id))
    .limit(1);
  if (!row) return null;

  const thread = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt));
  const { t } = row;
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    channel: t.channel,
    instituteSlug: row.slug,
    instituteName: row.name,
    contactName: t.contactName,
    contactEmail: t.contactEmail,
    messages: thread.length,
    createdAt: t.createdAt.toISOString(),
    lastActivity: (thread.at(-1)?.createdAt ?? t.updatedAt).toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    thread: thread.map((m) => ({
      id: m.id,
      author: m.author === "staff" ? "staff" : "institute",
      authorName: m.authorName,
      body: m.body,
      internal: m.internal,
      emailed: m.emailed,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Open and waiting tickets, for the sidebar badge. */
export async function getOpenTicketCount() {
  const [row] = await db.select({ n: count() }).from(supportTickets).where(eq(supportTickets.status, "open"));
  return row?.n ?? 0;
}
