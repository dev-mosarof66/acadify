import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, CheckCircle2, Globe, Mail, MessageSquareText, Phone, UserRound, Users, Wallet } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InstituteStatusBadge, InvoiceStatusBadge, initials, Panel, PanelHeader, StatCard } from "@/components/super-admin/ui";
import { ALL_MODULE_COUNT, webAddress, findPlan, formatDate, formatNumber, formatTaka, timeAgo, TYPE_LABELS } from "@/lib/super-admin/data";
import { getPlans } from "@/lib/plans/queries";
import { getSettings } from "@/lib/settings/queries";
import { getActivity, getInstitute, getInstituteMembers, getInvoices, getRequestTime } from "@/lib/super-admin/queries";
import { MembersPanel } from "@/components/super-admin/members-panel";
import { InstituteActions } from "@/components/super-admin/institute-actions";

export async function generateMetadata({ params }: PageProps<"/admin/institutes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await getInstitute(slug))?.name ?? "Institute" };
}

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dt className="w-28 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

async function InstituteDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inst = await getInstitute(slug);
  if (!inst) notFound();

  const [plans, settings] = await Promise.all([getPlans(), getSettings()]);
  const plan = findPlan(plans, inst.plan);
  const [invoices, activity, members, now] = await Promise.all([
    getInvoices(inst.slug),
    getActivity({ instituteSlug: inst.slug }),
    getInstituteMembers(inst.slug),
    getRequestTime(),
  ]);
  const smsPct = Math.min(100, Math.round((inst.smsUsed / inst.smsCredit) * 100));
  const seatPct = plan.studentLimit ? Math.min(100, Math.round((inst.students / plan.studentLimit) * 100)) : null;

  return (
    <>
      <div className="grid gap-4">
        <Link href="/admin/institutes" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" />
          All institutes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14 rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">{initials(inst.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{inst.name}</h1>
                <InstituteStatusBadge status={inst.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {TYPE_LABELS[inst.type]} · {inst.district} · <span className="font-semibold">{webAddress(inst.slug)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="outline" nativeButton={false} render={<a href={`mailto:${inst.contact.email}`} />} className="h-10 gap-2 rounded-full px-4 font-bold">
              <Mail className="size-4" />
              Email {inst.contact.role.toLowerCase()}
            </Button>
            <InstituteActions institute={inst} plans={plans} trialDays={settings.trialDays} />
          </div>
        </div>
      </div>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={formatNumber(inst.students)}
          icon={Users}
          note={plan.studentLimit ? `${seatPct}% of the ${formatNumber(plan.studentLimit)} plan limit` : "No student limit"}
        />
        <StatCard label="Staff accounts" value={formatNumber(inst.staff)} icon={UserRound} note={`Last active ${timeAgo(inst.lastActive, now)}`} />
        <StatCard label="Monthly revenue" value={inst.mrr ? formatTaka(inst.mrr) : "—"} icon={Wallet} note={`${plan.name} plan`} />
        <StatCard
          label="SMS this month"
          value={formatNumber(inst.smsUsed)}
          icon={MessageSquareText}
          note={`${smsPct}% of ${formatNumber(inst.smsCredit)} credit`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="Subscription" />
          <dl className="divide-y divide-border">
            <DetailRow icon={Wallet} label="Plan">
              {plan.name}
              {plan.price ? ` · ${formatTaka(plan.price)}/month` : plan.price === null && inst.mrr ? ` · ${formatTaka(inst.mrr)}/month (custom)` : ""}
            </DetailRow>
            <DetailRow icon={CalendarDays} label="Joined">
              {formatDate(inst.joined)}
            </DetailRow>
            <DetailRow icon={CalendarDays} label={inst.status === "trial" ? "Trial ends" : "Renews on"}>
              {formatDate(inst.renewsOn)}
            </DetailRow>
            <DetailRow icon={Globe} label="Web address">
              {webAddress(inst.slug)}
            </DetailRow>
          </dl>
          <div className="grid gap-4 border-t border-border p-5">
            {seatPct !== null && (
              <div className="grid gap-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Student seats</span>
                  <span className="font-bold tabular-nums">
                    {formatNumber(inst.students)} / {formatNumber(plan.studentLimit ?? 0)}
                  </span>
                </div>
                <Progress value={seatPct} aria-label="Student seats used" className="[&_[data-slot=progress-track]]:h-2" />
              </div>
            )}
            <div className="grid gap-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">SMS credit</span>
                <span className="font-bold tabular-nums">{smsPct}%</span>
              </div>
              <Progress
                value={smsPct}
                aria-label="SMS credit used"
                className={smsPct >= 90 ? "[&_[data-slot=progress-indicator]]:bg-warning [&_[data-slot=progress-track]]:h-2" : "[&_[data-slot=progress-track]]:h-2"}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Main contact" />
          <dl className="divide-y divide-border">
            <DetailRow icon={UserRound} label="Name">
              {inst.contact.name}
            </DetailRow>
            <DetailRow icon={UserRound} label="Role">
              {inst.contact.role}
            </DetailRow>
            <DetailRow icon={Phone} label="Phone">
              {inst.contact.phone}
            </DetailRow>
            <DetailRow icon={Mail} label="Email">
              {inst.contact.email}
            </DetailRow>
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title="Modules in use" description={`${inst.modules.length} of ${ALL_MODULE_COUNT} modules`} />
          <div className="flex flex-wrap gap-2 p-5">
            {inst.modules.length === 0 && <p className="text-sm text-muted-foreground">No modules turned on yet.</p>}
            {inst.modules.map((m) => (
              <Badge key={m} variant="secondary" className="h-7 gap-1.5 rounded-full bg-primary-light px-3 text-[12.5px] font-bold text-primary [&>svg]:size-3.5!">
                <CheckCircle2 />
                {m}
              </Badge>
            ))}
          </div>
        </Panel>
      </section>

      <MembersPanel instituteSlug={inst.slug} instituteName={inst.name} instituteType={inst.type} members={members} now={now} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Invoices" description={invoices.length ? `${invoices.length} invoices` : undefined} />
          {invoices.length ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-muted-foreground">Invoice</TableHead>
                    <TableHead className="font-bold text-muted-foreground">Period</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground">Amount</TableHead>
                    <TableHead className="font-bold text-muted-foreground">Status</TableHead>
                    <TableHead className="font-bold text-muted-foreground">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold tabular-nums">{inv.id}</TableCell>
                      <TableCell>{inv.period}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatTaka(inv.amount)}</TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">
                        {inv.paidOn ? `${formatDate(inv.paidOn)} · ${inv.method}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {inst.status === "trial" ? "No invoices yet. The first one is issued when the trial ends." : "No invoices yet."}
            </p>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Activity" />
          {activity.length ? (
            <ul className="divide-y divide-border">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <span>{a.text}</span>
                  <span className="shrink-0 text-[12.5px] text-muted-foreground">{timeAgo(a.at, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No recent activity.</p>
          )}
        </Panel>
      </section>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading institute">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="grid gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** URL params are read inside Suspense so navigation into the route stays instant (Cache Components). */
export default function InstituteDetailPage({ params }: PageProps<"/admin/institutes/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InstituteDetail params={params} />
    </Suspense>
  );
}
