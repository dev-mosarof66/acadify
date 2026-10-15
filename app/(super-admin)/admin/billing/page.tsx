import { AlertTriangle, CircleCheck, Clock, Wallet } from "lucide-react";

import { NewInvoiceButton } from "@/components/super-admin/billing-actions";
import { GatewayByMonthChart, MonthlyRevenueChart } from "@/components/super-admin/billing-charts";
import { InvoicesTable } from "@/components/super-admin/invoices-table";
import { PageHeader, StatCard } from "@/components/super-admin/ui";
import { formatPeriod, formatTaka } from "@/lib/super-admin/data";
import { getInstitutes, getInvoices, getPlatformTotals, getRequestTime } from "@/lib/super-admin/queries";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const [totals, invoices, institutes, now] = await Promise.all([getPlatformTotals(), getInvoices(), getInstitutes(), getRequestTime()]);
  // Today in Dhaka, for the payment date picker
  const today = new Date(now + 6 * 3600_000).toISOString().slice(0, 10);

  const latestPeriod = invoices[0]?.periodStart;
  const latest = invoices.filter((i) => i.periodStart === latestPeriod);
  const collected = latest.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const billed = latest.reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue");
  const due = invoices.filter((i) => i.status === "due");
  const monthName = latestPeriod ? formatPeriod(latestPeriod).split(" ")[0] : "this month";

  return (
    <>
      <PageHeader
        title="Billing"
        description="Subscription invoices issued to institutes"
        actions={<NewInvoiceButton institutes={institutes.map((i) => ({ slug: i.slug, name: i.name, mrr: i.mrr }))} now={now} />}
      />

      <section aria-label="Billing summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={formatTaka(totals.mrr)} icon={Wallet} note="from active and past-due institutes" />
        <StatCard
          label={`Collected in ${monthName}`}
          value={formatTaka(collected)}
          icon={CircleCheck}
          note={billed ? `${Math.round((collected / billed) * 100)}% of ${formatTaka(billed)} billed` : "Nothing billed yet"}
        />
        <StatCard label="Due" value={formatTaka(due.reduce((s, i) => s + i.amount, 0))} icon={Clock} note={`${due.length} invoices not yet late`} />
        <StatCard
          label="Overdue"
          value={formatTaka(overdue.reduce((s, i) => s + i.amount, 0))}
          icon={AlertTriangle}
          note={`${overdue.length} invoices past their due date`}
        />
      </section>

      <section aria-label="Billing charts" className="grid gap-4 xl:grid-cols-2">
        <MonthlyRevenueChart invoices={invoices} />
        <GatewayByMonthChart invoices={invoices} />
      </section>

      <InvoicesTable invoices={invoices} today={today} />
    </>
  );
}
