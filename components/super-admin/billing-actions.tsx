"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, MoreHorizontal, Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoice, markInvoicesOverdue, recordPayment } from "@/lib/super-admin/actions";
import { formatTaka, PAYMENT_METHODS, type Invoice, type PaymentMethod } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="gap-1 font-bold">
      {children}
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
    </Label>
  );
}

export type InvoiceInstitute = { slug: string; name: string; mrr: number };

/** "2026-10" for the month containing `t`, shifted by `offset` months (Dhaka time). */
function monthKey(t: number, offset: number) {
  const d = new Date(t + 6 * 3600_000);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
const monthLabel = (key: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${key}-01T00:00:00Z`));

/** "New invoice" button + dialog for the Billing page. */
export function NewInvoiceButton({ institutes, now }: { institutes: InvoiceInstitute[]; now: number }) {
  const router = useRouter();
  const months = React.useMemo(() => [-2, -1, 0, 1].map((o) => monthKey(now, o)), [now]);
  const monthItems = months.map((m) => ({ value: m, label: monthLabel(m) }));
  const names = React.useMemo(() => institutes.map((i) => i.name), [institutes]);

  const [open, setOpen] = React.useState(false);
  const [instituteName, setInstituteName] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState(months[2]);
  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [done, setDone] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const reset = () => {
    setInstituteName(null);
    setMonth(months[2]);
    setAmount("");
    setError(undefined);
    setDone(undefined);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = institutes.find((i) => i.name === instituteName);
    const form = new FormData();
    form.set("institute", inst?.slug ?? "");
    form.set("month", month);
    form.set("amount", amount);
    setError(undefined);
    startTransition(async () => {
      const result = await createInvoice(form);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        if (result.field) document.getElementById(`invoice-${result.field}`)?.focus();
        return;
      }
      setDone(
        result.emailed
          ? `Invoice ${result.invoiceId} was created and emailed to ${inst?.name}'s main contact.`
          : `Invoice ${result.invoiceId} was created, but the email couldn't be sent. Send it to them yourself.`
      );
      router.refresh();
    });
  };

  const invalid = (field: string) => (error?.field === field ? { "aria-invalid": true as const, "aria-describedby": "invoice-error" } : {});

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!institutes.length} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New invoice
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
            <DialogDescription>It&apos;s emailed to the institute&apos;s main contact with how to pay.</DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="grid gap-4">
              <p role="status" className="rounded-xl bg-primary-light px-4 py-3 text-sm font-semibold text-primary">
                {done}
              </p>
              <DialogFooter>
                <DialogClose render={<Button className="rounded-full px-5 font-bold" />}>Done</DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
              {error && (
                <p id="invoice-error" role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                  {error.message}
                </p>
              )}
              <div className="grid gap-2">
                <RequiredLabel htmlFor="invoice-institute">Institute</RequiredLabel>
                <Combobox
                  items={names}
                  value={instituteName}
                  onValueChange={(v) => {
                    const name = (v as string | null) ?? null;
                    setInstituteName(name);
                    const inst = institutes.find((i) => i.name === name);
                    if (inst?.mrr) setAmount(String(inst.mrr));
                  }}
                >
                  <ComboboxInput
                    id="invoice-institute"
                    placeholder="Search institutes"
                    autoComplete="off"
                    className={cn(CONTROL, "w-full", error?.field === "institute" && "border-destructive")}
                    {...invalid("institute")}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No institute matches</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <RequiredLabel htmlFor="invoice-month">Month</RequiredLabel>
                  <Select value={month} onValueChange={(v) => v && setMonth(v as string)} items={monthItems}>
                    <SelectTrigger id="invoice-month" className={`${CONTROL} w-full`} {...invalid("month")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <RequiredLabel htmlFor="invoice-amount">Amount (৳)</RequiredLabel>
                  <Input
                    id="invoice-amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 4500"
                    className={CONTROL}
                    {...invalid("amount")}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
                <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Create and email
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const METHOD_ITEMS = PAYMENT_METHODS.map((m) => ({ value: m, label: m === "Bank" ? "Bank transfer" : m }));

/** ⋯ menu on an invoice row: record a payment or mark it overdue. */
export function InvoiceRowMenu({ invoice, today }: { invoice: Invoice; today: string }) {
  const router = useRouter();
  const [paying, setPaying] = React.useState(false);
  const [method, setMethod] = React.useState<PaymentMethod>("bKash");
  const [paidOn, setPaidOn] = React.useState(today);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  if (invoice.status === "paid") return null;

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await recordPayment(invoice.id, method, paidOn);
      if (!result.ok) return setError(result.error);
      setPaying(false);
      router.refresh();
    });
  };

  const overdue = () =>
    startTransition(async () => {
      await markInvoicesOverdue([invoice.id]);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" disabled={pending} aria-label={`Actions for invoice ${invoice.id}`} className="size-8 rounded-lg" />}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setPaying(true)}>
            <Wallet className="size-4" />
            Record payment
          </DropdownMenuItem>
          {invoice.status === "due" && (
            <DropdownMenuItem onClick={overdue}>
              <Clock className="size-4" />
              Mark overdue
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={paying}
        onOpenChange={(o) => {
          setPaying(o);
          if (!o) setError(undefined);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {invoice.id} · {invoice.instituteName} · {formatTaka(invoice.amount)}. A receipt is emailed to their main contact.
            </DialogDescription>
          </DialogHeader>
          <form method="post" onSubmit={pay} noValidate className="grid gap-4">
            {error && (
              <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-2">
              <RequiredLabel htmlFor="pay-method">Paid by</RequiredLabel>
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
            <div className="grid gap-2">
              <RequiredLabel htmlFor="pay-date">Paid on</RequiredLabel>
              <Input id="pay-date" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={CONTROL} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Mark paid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
