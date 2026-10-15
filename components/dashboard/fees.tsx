"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Banknote, Loader2, MessageSquareText, Pencil, Plus, Printer, ReceiptText, Search, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { can, type InstituteRole } from "@/lib/auth/rbac";
import {
  collectPayment,
  createOneTimeBills,
  generateMonthlyBills,
  saveFeeHead,
  sendDueReminders,
  setClassFeeAmount,
  setFeeHeadActive,
  waiveBill,
} from "@/lib/fees/actions";
import { METHOD_LABELS, type BillStatus, type BillView, type DueRow, type FeeFrequency, type FeeHeadView, type PaymentMethod, type PaymentRow } from "@/lib/fees/queries";
import type { ClassView } from "@/lib/institute/queries";
import { formatDate, timeAgo } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

import { taka } from "@/lib/fees/format";

/* ---------------------------------------------------------------- section tabs */

const TABS: { href: string; label: string; permission: "fees:read" | "fees:collect" | "fees:manage" }[] = [
  { href: "/dashboard/fees", label: "Overview", permission: "fees:read" },
  { href: "/dashboard/fees/collect", label: "Collect", permission: "fees:collect" },
  { href: "/dashboard/fees/dues", label: "Dues", permission: "fees:read" },
  { href: "/dashboard/fees/bills", label: "Monthly bills", permission: "fees:manage" },
  { href: "/dashboard/fees/setup", label: "Fee setup", permission: "fees:manage" },
];

export function FeeTabs({ role }: { role: InstituteRole }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Fees" className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 sm:w-fit">
      {TABS.filter((t) => can(role, t.permission)).map((t) => {
        const active = t.href === "/dashboard/fees" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-full px-4 py-2 text-sm font-bold transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------------------------------------------------------------- shared bits */

const BILL_TONE: Record<BillStatus, string> = {
  due: "bg-warning-light text-accent-foreground dark:text-warning",
  partial: "bg-warning-light text-accent-foreground dark:text-warning",
  paid: "bg-primary-light text-primary",
  waived: "bg-secondary text-muted-foreground",
};
const BILL_LABEL: Record<BillStatus, string> = { due: "Due", partial: "Part paid", paid: "Paid", waived: "Waived" };

export function BillStatusBadge({ status }: { status: BillStatus }) {
  return <Badge className={cn("h-6 rounded-full px-2.5 text-[11.5px] font-bold", BILL_TONE[status])}>{BILL_LABEL[status]}</Badge>;
}

export function PaymentsList({ payments, now, empty, receiptsPath = "/dashboard/fees/receipts" }: { payments: PaymentRow[]; now: number; empty: string; receiptsPath?: string }) {
  if (!payments.length) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {payments.map((p) => (
        <li key={p.id}>
          <Link href={`${receiptsPath}/${p.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary/60">
            <ReceiptText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="font-bold">{p.studentName}</span>
              <span className="ml-2 text-muted-foreground tabular-nums">{p.receiptNo}</span>
            </span>
            <span className="text-muted-foreground">{METHOD_LABELS[p.method]}</span>
            <span className="font-extrabold tabular-nums">{taka(p.amount)}</span>
            <span className="w-24 text-right text-[12.5px] text-muted-foreground" suppressHydrationWarning>
              {timeAgo(p.paidAt, now)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- counter */

export type CounterStudent = { id: string; name: string; code: string; className: string; sectionName: string; roll: number; owed: number };

/** Search box for the counter: pick a student by name, ID or roll. */
export function CounterSearch({ students, selectedId }: { students: CounterStudent[]; selectedId?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const query = q.trim().toLowerCase();
  const matches = query ? students.filter((s) => s.name.toLowerCase().includes(query) || s.code.includes(query)).slice(0, 8) : [];

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        autoFocus={!selectedId}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a student by name or student ID"
        aria-label="Find a student"
        className="h-12 rounded-2xl bg-card pl-10 text-[15px] md:text-[15px] dark:bg-card"
      />
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border bg-popover shadow-lg">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  router.push(`/dashboard/fees/collect?student=${s.id}`);
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary-light"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-bold">{s.name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {s.className} · {s.sectionName} · Roll {s.roll} · {s.code}
                  </span>
                </span>
                {s.owed > 0 ? <span className="font-bold text-destructive tabular-nums">{taka(s.owed)} due</span> : <span className="text-muted-foreground">Nothing due</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const METHOD_ITEMS = (Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => ({ value: m, label: METHOD_LABELS[m] }));

export function PaymentForm({ studentId, owed }: { studentId: string; owed: number }) {
  const router = useRouter();
  const [amount, setAmount] = React.useState(String(owed));
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("studentId", studentId);
    form.set("method", method);
    form.set("amount", amount);
    setError(undefined);
    startTransition(async () => {
      const r = await collectPayment(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      router.push(`/dashboard/fees/receipts/${r.id}?new=1`);
    });
  };

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4 p-5">
      <FormError>{error?.message}</FormError>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <FieldLabel htmlFor="pay-amount">Amount received (৳)</FieldLabel>
          <Input id="pay-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(CONTROL, "text-lg font-bold md:text-lg")} aria-invalid={error?.field === "amount" || undefined} />
          <p className="text-[12.5px] text-muted-foreground">Pays the oldest bills first. Owed now: {taka(owed)}.</p>
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="pay-method">Paid by</FieldLabel>
          <Select value={method} onValueChange={(v) => v && setMethod(v as PaymentMethod)} items={METHOD_ITEMS}>
            <SelectTrigger id="pay-method" className={`${CONTROL} w-full`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_ITEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {method !== "cash" && (
          <div className="grid gap-2">
            <FieldLabel htmlFor="pay-reference">{method === "bank" ? "Bank reference" : "Transaction ID"}</FieldLabel>
            <Input id="pay-reference" name="reference" className={CONTROL} aria-invalid={error?.field === "reference" || undefined} />
          </div>
        )}
        <div className="grid gap-2">
          <FieldLabel htmlFor="pay-note" optional>
            Note
          </FieldLabel>
          <Input id="pay-note" name="note" className={CONTROL} />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="h-12 w-fit gap-2 rounded-full px-6 text-[15px] font-bold">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
        Take payment and print receipt
      </Button>
    </form>
  );
}

export function BillsTable({ bills, canWaive }: { bills: BillView[]; canWaive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string>();
  if (!bills.length) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No bills yet.</p>;

  return (
    <>
      {error && <p role="alert" className="border-b border-border bg-danger-light px-5 py-3 text-sm font-semibold text-destructive">{error}</p>}
      <ul className="divide-y divide-border">
        {bills.map((b) => (
          <li key={b.id} className="grid gap-1 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{b.title}</span>
              <span className="text-[12.5px] text-muted-foreground tabular-nums">{b.billNo}</span>
              <BillStatusBadge status={b.status} />
              <span className="ml-auto font-extrabold tabular-nums">{taka(b.total)}</span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              {b.items.map((i) => `${i.label} ${taka(i.amount)}`).join(" · ")} · due {formatDate(b.dueDate)}
              {b.status === "partial" && <span className="font-semibold text-foreground"> · {taka(b.total - b.paid)} left</span>}
            </p>
            {canWaive && (b.status === "due" || b.status === "partial") && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await waiveBill(b.id);
                    if (!r.ok) setError(r.error);
                    router.refresh();
                  })
                }
                className="w-fit cursor-pointer text-[12.5px] font-semibold text-muted-foreground hover:text-destructive"
              >
                Waive this bill
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------- dues */

export function DuesTable({ dues, today, canRemind }: { dues: DueRow[]; today: string; canRemind: boolean }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [onlyOverdue, setOnlyOverdue] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();
  const rows = dues.filter((d) => !onlyOverdue || d.oldestDue < today);
  const all = rows.length > 0 && rows.every((r) => selected.has(r.studentId));

  if (!dues.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <Wallet className="size-8 text-muted-foreground" />
          <p className="font-bold">Nobody owes anything</p>
          <p className="text-sm text-muted-foreground">Students appear here when they have unpaid bills.</p>
        </div>
      </Panel>
    );
  }

  const remind = () =>
    startTransition(async () => {
      const r = await sendDueReminders([...selected]);
      setMessage(r.ok ? { ok: true, text: r.message ?? "Sent." } : { ok: false, text: r.error });
    });

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(Boolean(v))} className="data-checked:border-primary data-checked:bg-primary" />
          Only past the due date
        </label>
        {message && <p className={cn("text-sm font-semibold", message.ok ? "text-primary" : "text-destructive")}>{message.text}</p>}
        {canRemind && (
          <Button size="sm" disabled={!selected.size || pending} onClick={remind} className="ml-auto gap-1.5 rounded-full px-4 font-bold">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <MessageSquareText className="size-3.5" />}
            SMS reminder{selected.size ? ` (${selected.size})` : ""}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canRemind && (
                <TableHead className="w-10 pl-5">
                  <Checkbox
                    aria-label="Select all"
                    checked={all}
                    onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.studentId)) : new Set())}
                    className="data-checked:border-primary data-checked:bg-primary"
                  />
                </TableHead>
              )}
              <TableHead className={cn("font-bold text-muted-foreground", !canRemind && "pl-5")}>Student</TableHead>
              <TableHead className="font-bold text-muted-foreground">Class</TableHead>
              <TableHead className="text-right font-bold text-muted-foreground">Owes</TableHead>
              <TableHead className="font-bold text-muted-foreground">Oldest due</TableHead>
              <TableHead className="pr-5">
                <span className="sr-only">Collect</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.studentId}>
                {canRemind && (
                  <TableCell className="pl-5">
                    <Checkbox
                      aria-label={`Select ${d.name}`}
                      checked={selected.has(d.studentId)}
                      onCheckedChange={(v) =>
                        setSelected((s) => {
                          const next = new Set(s);
                          if (v) next.add(d.studentId);
                          else next.delete(d.studentId);
                          return next;
                        })
                      }
                      className="data-checked:border-primary data-checked:bg-primary"
                    />
                  </TableCell>
                )}
                <TableCell className={cn(!canRemind && "pl-5")}>
                  <span className="font-bold">{d.name}</span>
                  <span className="block text-[12.5px] text-muted-foreground tabular-nums">{d.studentCode}</span>
                </TableCell>
                <TableCell>
                  {d.className} · {d.sectionName} · Roll {d.roll}
                </TableCell>
                <TableCell className="text-right font-extrabold text-destructive tabular-nums">{taka(d.owed)}</TableCell>
                <TableCell className={cn(d.oldestDue < today ? "font-semibold text-destructive" : "text-muted-foreground")}>{formatDate(d.oldestDue)}</TableCell>
                <TableCell className="pr-5 text-right">
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/fees/collect?student=${d.studentId}`} />} className="rounded-full px-3 font-bold">
                    Collect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- monthly bills */

export function MonthlyBills({
  months,
  month,
  rows,
}: {
  months: { value: string; label: string }[];
  month: string;
  rows: { classId: string; className: string; students: number; billed: number; total: number }[];
}) {
  const router = useRouter();
  const [dueDay, setDueDay] = React.useState("10");
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const missing = rows.reduce((n, r) => n + Math.max(0, r.students - r.billed), 0);

  const run = (classId: string | null) => {
    setBusy(classId ?? "all");
    setMessage(undefined);
    startTransition(async () => {
      const r = await generateMonthlyBills(month, classId, Number(dueDay));
      setMessage(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
      setBusy(null);
      router.refresh();
    });
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-4 border-b border-border p-5">
        <div className="grid gap-2">
          <FieldLabel htmlFor="bills-month">Month</FieldLabel>
          <Select value={month} onValueChange={(v) => v && router.push(`/dashboard/fees/bills?month=${v}`)} items={months}>
            <SelectTrigger id="bills-month" className={`${CONTROL} w-[200px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="bills-due">Due on day</FieldLabel>
          <Input id="bills-due" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className={`${CONTROL} w-24`} />
        </div>
        <Button disabled={!missing || busy !== null} onClick={() => run(null)} className="h-11 gap-2 rounded-full px-5 font-bold">
          {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <ReceiptText className="size-4" />}
          {missing ? `Make ${missing} bills for everyone` : "Everyone is billed"}
        </Button>
      </div>
      {message && <p className={cn("border-b border-border px-5 py-3 text-sm font-semibold", message.ok ? "bg-primary-light text-primary" : "bg-danger-light text-destructive")}>{message.text}</p>}
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Add classes and students first.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const left = Math.max(0, r.students - r.billed);
            return (
              <li key={r.classId} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="min-w-[140px] flex-1 font-bold">{r.className}</span>
                <span className="text-muted-foreground">
                  {r.billed} of {r.students} billed
                </span>
                <span className="w-28 text-right font-semibold tabular-nums">{taka(r.total)}</span>
                <Button size="sm" variant="outline" disabled={!left || busy !== null} onClick={() => run(r.classId)} className="w-36 gap-1.5 rounded-full font-bold">
                  {busy === r.classId && <Loader2 className="size-3.5 animate-spin" />}
                  {left ? `Bill ${left}` : "Done"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function OneTimeCharge({ heads, classes, today }: { heads: FeeHeadView[]; classes: ClassView[]; today: string }) {
  const router = useRouter();
  const oneTime = heads.filter((h) => h.frequency === "one_time" && h.isActive);
  const [feeHeadId, setFeeHeadId] = React.useState(oneTime[0]?.id ?? "");
  const [classId, setClassId] = React.useState("");
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();
  const headItems = oneTime.map((h) => ({ value: h.id, label: `${h.name} (${taka(h.amount)})` }));
  const classItems = classes.map((c) => ({ value: c.id, label: c.name }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("feeHeadId", feeHeadId);
    form.set("target", `class:${classId}`);
    startTransition(async () => {
      const r = await createOneTimeBills(form);
      setMessage(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader title="One-time charge" description="Admission, exam or session fee for a whole class" />
      {!oneTime.length ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Add a one-time fee under Fee setup first.</p>
      ) : (
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div className="grid gap-2">
            <FieldLabel htmlFor="ot-head">Fee</FieldLabel>
            <Select value={feeHeadId} onValueChange={(v) => v && setFeeHeadId(v as string)} items={headItems}>
              <SelectTrigger id="ot-head" className={`${CONTROL} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {headItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="ot-class">Class</FieldLabel>
            <Select value={classId || null} onValueChange={(v) => setClassId((v as string) ?? "")} items={classItems}>
              <SelectTrigger id="ot-class" className={`${CONTROL} w-full`}>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {classItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="ot-due">Due date</FieldLabel>
            <Input id="ot-due" name="dueDate" type="date" min={today} defaultValue={today} className={CONTROL} />
          </div>
          <Button type="submit" disabled={pending || !classId} className="h-11 gap-2 rounded-full px-5 font-bold">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Bill the class
          </Button>
          {message && <p className={cn("text-sm font-semibold sm:col-span-4", message.ok ? "text-primary" : "text-destructive")}>{message.text}</p>}
        </form>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- setup */

const FREQ_ITEMS: { value: FeeFrequency; label: string }[] = [
  { value: "monthly", label: "Every month" },
  { value: "one_time", label: "One time" },
];

function FeeHeadDialog({ head, onClose }: { head?: FeeHeadView; onClose: () => void }) {
  const router = useRouter();
  const [frequency, setFrequency] = React.useState<FeeFrequency>(head?.frequency ?? "monthly");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("frequency", frequency);
    if (head) form.set("id", head.id);
    startTransition(async () => {
      const r = await saveFeeHead(form);
      if (!r.ok) return setError({ message: r.error, field: r.field });
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{head ? `Edit ${head.name}` : "New fee"}</DialogTitle>
          <DialogDescription>New amounts apply to bills made from now on.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError>{error?.message}</FormError>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="fee-name">Name</FieldLabel>
              <Input id="fee-name" name="name" autoFocus defaultValue={head?.name} placeholder="e.g. Tuition" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="fee-nameBn" optional>
                Name in Bangla
              </FieldLabel>
              <Input id="fee-nameBn" name="nameBn" lang="bn" defaultValue={head?.nameBn} placeholder="যেমন মাসিক বেতন" className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="fee-frequency">Charged</FieldLabel>
              <Select value={frequency} onValueChange={(v) => v && setFrequency(v as FeeFrequency)} items={FREQ_ITEMS}>
                <SelectTrigger id="fee-frequency" className={`${CONTROL} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQ_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="fee-amount">Amount (৳)</FieldLabel>
              <Input id="fee-amount" name="amount" inputMode="numeric" defaultValue={head?.amount} placeholder="e.g. 800" className={CONTROL} aria-invalid={error?.field === "amount" || undefined} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {head ? "Save" : "Add fee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewFeeHeadButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New fee
      </Button>
      {open && <FeeHeadDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/** Per-class amount: empty = the default. Saves when the field loses focus. */
function ClassAmount({ head, cls }: { head: FeeHeadView; cls: ClassView }) {
  const router = useRouter();
  const initial = head.classAmounts[cls.id];
  const [value, setValue] = React.useState(initial === undefined ? "" : String(initial));
  const [state, setState] = React.useState<"idle" | "saving" | "error">("idle");

  const save = async () => {
    if (value === (initial === undefined ? "" : String(initial))) return;
    setState("saving");
    const r = await setClassFeeAmount(head.id, cls.id, value);
    setState(r.ok ? "idle" : "error");
    if (r.ok) router.refresh();
  };

  return (
    <label className="grid gap-1 text-[12.5px]">
      <span className="font-semibold text-muted-foreground">{cls.name}</span>
      <Input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder={String(head.amount)}
        aria-invalid={state === "error" || undefined}
        className={cn("h-9 rounded-lg bg-card text-sm dark:bg-card", state === "saving" && "opacity-60")}
      />
    </label>
  );
}

export function FeeHeadsBoard({ heads, classes }: { heads: FeeHeadView[]; classes: ClassView[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<FeeHeadView | null>(null);
  const [, startTransition] = React.useTransition();

  if (!heads.length) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <Wallet className="size-8 text-muted-foreground" />
          <p className="font-bold">No fees set up yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add what you charge: monthly Tuition, plus one-time fees like Admission or Exam fee.</p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {heads.map((h) => (
          <Panel key={h.id} className={cn(!h.isActive && "opacity-70")}>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  {h.name}
                  {h.nameBn && <span className="ml-2 text-sm font-semibold text-muted-foreground">{h.nameBn}</span>}
                  {!h.isActive && <Badge variant="secondary" className="ml-2 rounded-full px-2 font-bold">Archived</Badge>}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {h.frequency === "monthly" ? "Every month" : "One time"} · {taka(h.amount)} by default
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(h)} className="gap-1.5 rounded-full px-3 font-bold">
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await setFeeHeadActive(h.id, !h.isActive);
                    router.refresh();
                  })
                }
                className="gap-1.5 rounded-full px-3 font-bold text-muted-foreground"
              >
                {h.isActive ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
                {h.isActive ? "Archive" : "Restore"}
              </Button>
            </div>
            {classes.length > 0 && (
              <div className="grid gap-3 p-5">
                <p className="text-[12.5px] font-bold tracking-wide text-muted-foreground uppercase">Different amount for a class? Leave empty to use {taka(h.amount)}.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {classes.map((c) => (
                    <ClassAmount key={c.id} head={h} cls={c} />
                  ))}
                </div>
              </div>
            )}
          </Panel>
        ))}
      </div>
      {editing && <FeeHeadDialog key={editing.id} head={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="gap-2 rounded-full px-5 font-bold print:hidden">
      <Printer className="size-4" />
      Print receipt
    </Button>
  );
}
