"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, CircleDot, Copy, Download, ListFilter, RotateCcw, Search, Receipt, SearchX, Wallet } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoiceRowMenu } from "@/components/super-admin/billing-actions";
import { InvoiceStatusBadge, Panel } from "@/components/super-admin/ui";
import {
  BulkAction,
  BulkBar,
  downloadCsv,
  FilterChip,
  PaginationBar,
  RowCheckbox,
  SelectAllCheckbox,
  useCopy,
  usePagination,
  useSelection,
} from "@/components/super-admin/list-kit";
import { formatDate, formatTaka, type Invoice, type InvoiceStatus } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

type Tab = "all" | InvoiceStatus;
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due", label: "Due" },
  { value: "paid", label: "Paid" },
];
const statusLabel = (t: Tab) => TABS.find((x) => x.value === t)?.label ?? "All";

type Method = "all" | NonNullable<Invoice["method"]>;
const METHODS: Method[] = ["all", "bKash", "Nagad", "Bank"];
export function InvoicesTable({ invoices, today }: { invoices: Invoice[]; today: string }) {
  /** Billing periods present in the data, newest first. */
  const PERIODS = React.useMemo(
    () =>
      [...new Map(invoices.map((i) => [i.periodStart, i.period])).entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([, label]) => label),
    [invoices]
  );
  const [tab, setTab] = React.useState<Tab>("all");
  const [query, setQuery] = React.useState("");
  const [method, setMethod] = React.useState<Method>("all");
  const [period, setPeriod] = React.useState("all");

  const q = query.trim().toLowerCase();
  const rows = invoices.filter((inv) => {
    const name = inv.instituteName;
    return (
      (tab === "all" || inv.status === tab) &&
      (method === "all" || inv.method === method) &&
      (period === "all" || inv.period === period) &&
      (!q || [inv.id, name, inv.period].some((v) => v.toLowerCase().includes(q)))
    );
  });
  const selection = useSelection<Invoice>(React.useCallback((i: Invoice) => i.id, []));
  const pager = usePagination(rows, `${tab}|${method}|${period}|${q}`);
  const activeFilters = [tab, method, period].filter((v) => v !== "all").length;
  const resetFilters = () => {
    setTab("all");
    setMethod("all");
    setPeriod("all");
  };
  const ids = useCopy();
  const selectedRows = invoices.filter(selection.isSelected);
  const selectedTotal = selectedRows.reduce((s, i) => s + i.amount, 0);

  const exportSelected = () =>
    downloadCsv(
      `acadify-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      selectedRows.map((inv) => ({
        Invoice: inv.id,
        Institute: inv.instituteName,
        Period: inv.period,
        "Amount (BDT)": inv.amount,
        Status: inv.status,
        Issued: formatDate(inv.issuedOn),
        Paid: inv.paidOn ? formatDate(inv.paidOn) : "",
        Method: inv.method,
      }))
    );

  const count = (t: Tab) => (t === "all" ? invoices.length : invoices.filter((i) => i.status === t).length);

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="invoice-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice or institute"
            aria-label="Search invoices"
            className="h-10 rounded-xl bg-card pl-9 dark:bg-card"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className={cn("h-10 gap-2 rounded-xl bg-card px-3.5 font-semibold dark:bg-card", activeFilters > 0 && "border-primary text-primary")}
                aria-label={activeFilters ? `Filters, ${activeFilters} active` : "Filters"}
              />
            }
          >
            <ListFilter className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground tabular-nums">
                {activeFilters}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter invoices</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CircleDot />
                  Status
                  <span className="ml-auto text-xs text-muted-foreground">{statusLabel(tab)}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuRadioGroup value={tab} onValueChange={(v) => setTab(v as Tab)}>
                    {TABS.map((t) => (
                      <DropdownMenuRadioItem key={t.value} value={t.value}>
                        {t.value === "all" ? "All statuses" : t.label}
                        <span className="ml-auto pr-5 text-xs text-muted-foreground tabular-nums">{count(t.value)}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Wallet />
                  Payment method
                  <span className="ml-auto text-xs text-muted-foreground">{method === "all" ? "All" : method}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuRadioGroup value={method} onValueChange={(v) => setMethod(v as Method)}>
                    {METHODS.map((m) => (
                      <DropdownMenuRadioItem key={m} value={m}>
                        {m === "all" ? "All methods" : m}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CalendarDays />
                  Period
                  <span className="ml-auto text-xs text-muted-foreground">{period === "all" ? "All" : period}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuRadioGroup value={period} onValueChange={(v) => setPeriod(String(v))}>
                    {["all", ...PERIODS].map((p) => (
                      <DropdownMenuRadioItem key={p} value={p}>
                        {p === "all" ? "All periods" : p}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={activeFilters === 0} onClick={resetFilters}>
              <RotateCcw />
              Reset filters
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {tab !== "all" && <FilterChip label={`Status: ${statusLabel(tab)}`} onRemove={() => setTab("all")} />}
        {method !== "all" && <FilterChip label={`Method: ${method}`} onRemove={() => setMethod("all")} />}
        {period !== "all" && <FilterChip label={`Period: ${period}`} onRemove={() => setPeriod("all")} />}
      </div>

      <BulkBar count={selection.count} total={rows.length} onSelectAll={() => selection.selectMany(rows)} onClear={selection.clear}>
        <span className="font-semibold tabular-nums">{formatTaka(selectedTotal)}</span>
        <BulkAction onClick={() => ids.copy(selectedRows.map((i) => i.id).join(", "))}>
          <Copy className="size-3.5" />
          {ids.copied ? "Copied" : "Copy invoice numbers"}
        </BulkAction>
        <BulkAction onClick={exportSelected}>
          <Download className="size-3.5" />
          Export CSV
        </BulkAction>
      </BulkBar>

      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <SelectAllCheckbox items={pager.pageItems} isSelected={selection.isSelected} onToggle={() => selection.toggleMany(pager.pageItems)} />
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">Invoice</TableHead>
              <TableHead className="font-bold text-muted-foreground">Institute</TableHead>
              <TableHead className="font-bold text-muted-foreground">Period</TableHead>
              <TableHead className="text-right font-bold text-muted-foreground">Amount</TableHead>
              <TableHead className="font-bold text-muted-foreground">Status</TableHead>
              <TableHead className="font-bold text-muted-foreground">Issued</TableHead>
              <TableHead className="font-bold text-muted-foreground">Paid</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pager.pageItems.map((inv) => {
              const checked = selection.isSelected(inv);
              return (
                <TableRow key={inv.id} data-state={checked ? "selected" : undefined}>
                  <TableCell className="pl-4">
                    <RowCheckbox checked={checked} onToggle={() => selection.toggle(inv)} label={`Select invoice ${inv.id}`} />
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">{inv.id}</TableCell>
                  <TableCell>
                    <Link href={`/admin/institutes/${inv.institute}`} className="font-bold hover:text-primary">
                      {inv.instituteName}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.period}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatTaka(inv.amount)}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{formatDate(inv.issuedOn)}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{inv.paidOn ? `${formatDate(inv.paidOn)} · ${inv.method}` : "—"}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <InvoiceRowMenu invoice={inv} today={today} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {invoices.length === 0 && (
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <Receipt className="size-8 text-muted-foreground" />
            <p className="font-bold">No invoices yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Create one with &quot;New invoice&quot;. It&apos;s emailed to the institute with how to pay.</p>
          </div>
        )}
        {invoices.length > 0 && rows.length === 0 && (
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-bold">No invoices match</p>
          </div>
        )}
      </div>

      <PaginationBar {...pager} noun="invoices" />
    </Panel>
  );
}

export default InvoicesTable;
