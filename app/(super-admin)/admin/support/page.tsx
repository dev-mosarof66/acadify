import { AlertTriangle, CircleCheck, Clock, Inbox } from "lucide-react";

import { NewTicketButton, TicketsBoard } from "@/components/super-admin/support";
import { PageHeader, StatCard } from "@/components/super-admin/ui";
import { getInstitutes, getRequestTime } from "@/lib/super-admin/queries";
import { getTickets } from "@/lib/support/queries";

export const metadata = { title: "Support Tickets" };

export default async function SupportPage() {
  const [tickets, institutes, now] = await Promise.all([getTickets(), getInstitutes(), getRequestTime()]);
  const open = tickets.filter((t) => t.status === "open");
  const waiting = tickets.filter((t) => t.status === "pending").length;
  const high = open.filter((t) => t.priority === "high").length;
  const monthStart = new Date(now + 6 * 3600_000).toISOString().slice(0, 7);
  const resolvedThisMonth = tickets.filter((t) => t.resolvedAt && new Date(new Date(t.resolvedAt).getTime() + 6 * 3600_000).toISOString().startsWith(monthStart)).length;

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Requests from institutes, logged from calls, emails, WhatsApp and visits"
        actions={<NewTicketButton institutes={institutes.map((i) => ({ slug: i.slug, name: i.name, contactName: i.contact.name, contactEmail: i.contact.email }))} />}
      />
      <section aria-label="Support summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={String(open.length)} icon={Inbox} note="Need a reply from us" />
        <StatCard label="High priority" value={String(high)} icon={AlertTriangle} note="Open tickets marked high" />
        <StatCard label="Waiting on institute" value={String(waiting)} icon={Clock} note="We've replied; their turn" />
        <StatCard label="Resolved this month" value={String(resolvedThisMonth)} icon={CircleCheck} note={`${tickets.length} tickets in total`} />
      </section>
      <TicketsBoard tickets={tickets} now={now} />
    </>
  );
}
