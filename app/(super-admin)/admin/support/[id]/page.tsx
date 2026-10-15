import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Building2, CalendarDays, Mail, MessageSquare, UserRound } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { TicketControls, TicketReplyBox, TicketStatusBadge, TicketThread } from "@/components/super-admin/support";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { formatDate } from "@/lib/super-admin/data";
import { getRequestTime } from "@/lib/super-admin/queries";
import { CHANNEL_LABELS, ticketRef } from "@/lib/support/labels";
import { getTicket } from "@/lib/support/queries";

export async function generateMetadata({ params }: PageProps<"/admin/support/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getTicket(Number(id));
  return { title: ticket ? `${ticketRef(ticket.id)} · ${ticket.subject}` : "Ticket" };
}

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dt className="w-20 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, now] = await Promise.all([getTicket(Number(id)), getRequestTime()]);
  if (!ticket) notFound();

  return (
    <>
      <div className="grid gap-3">
        <Link href="/admin/support" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          All tickets
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground tabular-nums">{ticketRef(ticket.id)}</span>
          <TicketStatusBadge status={ticket.status} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{ticket.subject}</h1>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <TicketThread thread={ticket.thread} now={now} />
          <TicketReplyBox id={ticket.id} contactName={ticket.contactName} contactEmail={ticket.contactEmail} />
        </div>
        <div className="grid content-start gap-4">
          <Panel>
            <PanelHeader title="Ticket" />
            <div className="p-5">
              <TicketControls id={ticket.id} status={ticket.status} priority={ticket.priority} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Details" />
            <dl className="divide-y divide-border">
              <Row icon={Building2} label="Institute">
                <Link href={`/admin/institutes/${ticket.instituteSlug}`} className="hover:text-primary">
                  {ticket.instituteName}
                </Link>
              </Row>
              <Row icon={UserRound} label="Contact">
                {ticket.contactName}
              </Row>
              <Row icon={Mail} label="Email">
                {ticket.contactEmail}
              </Row>
              <Row icon={MessageSquare} label="Came in by">
                {CHANNEL_LABELS[ticket.channel]}
              </Row>
              <Row icon={CalendarDays} label="Opened">
                {formatDate(ticket.createdAt)}
              </Row>
            </dl>
          </Panel>
        </div>
      </section>
    </>
  );
}

/** Params are read inside Suspense so navigation stays instant (Cache Components). */
export default function TicketPage({ params }: PageProps<"/admin/support/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[480px] rounded-2xl" />}>
      <TicketDetail params={params} />
    </Suspense>
  );
}
