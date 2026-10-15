"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, CircleDot, Copy, Download, Eye, ListFilter, Mail, MoreHorizontal, Package, RotateCcw, Search, SearchX } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InstituteStatusBadge, Panel } from "@/components/super-admin/ui";
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
import {
  formatNumber,
  formatTaka,
  findPlan,
  type Plan,
  STATUS_LABELS,
  timeAgo,
  TYPE_LABELS,
  type Institute,
  type InstituteStatus,
  type InstituteType,
  type PlanKey,
  webAddress,
} from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

type SortKey = "name" | "students" | "mrr" | "lastActive";
type StatusTab = "all" | InstituteStatus;

const TYPE_ITEMS = [{ value: "all", label: "All types" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const STATUS_TABS: StatusTab[] = ["all", "active", "trial", "past_due", "suspended"];

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn(align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn("inline-flex items-center gap-1 font-bold hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}

function RowActions({ institute }: { institute: Institute }) {
  const [copied, setCopied] = React.useState(false);
  const address = webAddress(institute.slug);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-8 rounded-lg" aria-label={`Actions for ${institute.name}`} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link href={`/admin/institutes/${institute.slug}`} />}>
          <Eye />
          View details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => {
            navigator.clipboard?.writeText(address).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Copy />
          {copied ? "Copied" : "Copy web address"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InstitutesTable({ institutes, now, plans }: { institutes: Institute[]; now: number; plans: Plan[] }) {
  const PLAN_ITEMS = [{ value: "all", label: "All plans" }, ...plans.map((p) => ({ value: p.key, label: p.name }))];
  const planName = (key: string) => findPlan(plans, key).name;
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusTab>("all");
  const [type, setType] = React.useState<"all" | InstituteType>("all");
  const [plan, setPlan] = React.useState<"all" | PlanKey>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "mrr", dir: "desc" });

  const counts = React.useMemo(() => {
    const c: Record<StatusTab, number> = { all: institutes.length, active: 0, trial: 0, past_due: 0, suspended: 0 };
    institutes.forEach((i) => c[i.status]++);
    return c;
  }, [institutes]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = institutes.filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (type === "all" || i.type === type) &&
        (plan === "all" || i.plan === plan) &&
        (!q || [i.name, i.district, i.contact.name, i.slug].some((v) => v.toLowerCase().includes(q)))
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * dir;
    });
  }, [institutes, query, status, type, plan, sort]);

  const selection = useSelection<Institute>(React.useCallback((i: Institute) => i.slug, []));
  const pager = usePagination(rows, [query, status, type, plan, sort.key, sort.dir].join("|"));
  const emails = useCopy();
  const selectedRows = institutes.filter(selection.isSelected);

  const exportSelected = () =>
    downloadCsv(
      `acadify-institutes-${new Date().toISOString().slice(0, 10)}.csv`,
      selectedRows.map((i) => ({
        Institute: i.name,
        Type: TYPE_LABELS[i.type],
        District: i.district,
        Plan: planName(i.plan),
        Status: STATUS_LABELS[i.status],
        Students: i.students,
        "MRR (BDT)": i.mrr,
        "SMS used": i.smsUsed,
        "SMS credit": i.smsCredit,
        Contact: i.contact.name,
        Phone: i.contact.phone,
        Email: i.contact.email,
        "Web address": webAddress(i.slug),
      }))
    );

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  const activeFilters = [status, type, plan].filter((v) => v !== "all").length;
  const resetFilters = () => {
    setStatus("all");
    setType("all");
    setPlan("all");
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
    setPlan("all");
  };

  return (
    <Panel>
      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="institute-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, district or contact"
              aria-label="Search institutes"
              className="h-10 rounded-xl bg-card pl-9 dark:bg-card"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    "relative h-10 gap-2 rounded-xl bg-card px-3.5 font-semibold dark:bg-card",
                    activeFilters > 0 && "border-primary text-primary"
                  )}
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
                <DropdownMenuLabel>Filter institutes</DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CircleDot />
                    Status
                    <span className="ml-auto text-xs text-muted-foreground">{status === "all" ? "All" : STATUS_LABELS[status]}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    <DropdownMenuRadioGroup value={status} onValueChange={(v) => setStatus(v as StatusTab)}>
                      {STATUS_TABS.map((st) => (
                        <DropdownMenuRadioItem key={st} value={st}>
                          {st === "all" ? "All statuses" : STATUS_LABELS[st]}
                          <span className="ml-auto pr-5 text-xs text-muted-foreground tabular-nums">{counts[st]}</span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 />
                    Institute type
                    <span className="ml-auto truncate text-xs text-muted-foreground">{type === "all" ? "All" : TYPE_LABELS[type]}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52">
                    <DropdownMenuRadioGroup value={type} onValueChange={(v) => setType(v as typeof type)}>
                      {TYPE_ITEMS.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                          {o.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Package />
                    Plan
                    <span className="ml-auto text-xs text-muted-foreground">{plan === "all" ? "All" : planName(plan)}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    <DropdownMenuRadioGroup value={plan} onValueChange={(v) => setPlan(v as typeof plan)}>
                      {PLAN_ITEMS.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                          {o.label}
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

          {status !== "all" && <FilterChip label={`Status: ${STATUS_LABELS[status]}`} onRemove={() => setStatus("all")} />}
          {type !== "all" && (
            <FilterChip label={`Type: ${TYPE_LABELS[type]}`} onRemove={() => setType("all")} />
          )}
          {plan !== "all" && <FilterChip label={`Plan: ${planName(plan)}`} onRemove={() => setPlan("all")} />}
        </div>
      </div>

      <BulkBar count={selection.count} total={rows.length} onSelectAll={() => selection.selectMany(rows)} onClear={selection.clear}>
        <BulkAction onClick={() => emails.copy(selectedRows.map((i) => i.contact.email).join(", "))}>
          <Mail className="size-3.5" />
          {emails.copied ? "Copied" : "Copy emails"}
        </BulkAction>
        <BulkAction onClick={exportSelected}>
          <Download className="size-3.5" />
          Export CSV
        </BulkAction>
      </BulkBar>

      <div className="overflow-x-auto">
        <Table className="min-w-[1020px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <SelectAllCheckbox items={pager.pageItems} isSelected={selection.isSelected} onToggle={() => selection.toggleMany(pager.pageItems)} />
              </TableHead>
              <SortHeader label="Institute" column="name" sort={sort} onSort={onSort} />
              <TableHead className="font-bold text-muted-foreground">Plan</TableHead>
              <SortHeader label="Students" column="students" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="MRR" column="mrr" sort={sort} onSort={onSort} align="right" />
              <TableHead className="font-bold text-muted-foreground">SMS this month</TableHead>
              <TableHead className="font-bold text-muted-foreground">Status</TableHead>
              <SortHeader label="Last active" column="lastActive" sort={sort} onSort={onSort} />
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pager.pageItems.map((i) => {
              const smsPct = Math.min(100, Math.round((i.smsUsed / i.smsCredit) * 100));
              const checked = selection.isSelected(i);
              return (
                <TableRow key={i.slug} data-state={checked ? "selected" : undefined}>
                  <TableCell className="pl-4">
                    <RowCheckbox checked={checked} onToggle={() => selection.toggle(i)} label={`Select ${i.name}`} />
                  </TableCell>
                  <TableCell className="py-3">
                    <Link href={`/admin/institutes/${i.slug}`} className="block font-bold hover:text-primary">
                      {i.name}
                    </Link>
                    <span className="text-[12.5px] text-muted-foreground">
                      {TYPE_LABELS[i.type]} · {i.district}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{planName(i.plan)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(i.students)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{i.mrr ? formatTaka(i.mrr) : "—"}</TableCell>
                  <TableCell>
                    <div className="grid w-36 gap-1">
                      <Progress
                        value={smsPct}
                        aria-label={`${smsPct}% of SMS credit used`}
                        className={cn("[&_[data-slot=progress-track]]:h-1.5", smsPct >= 90 && "[&_[data-slot=progress-indicator]]:bg-warning")}
                      />
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        {formatNumber(i.smsUsed)} / {formatNumber(i.smsCredit)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <InstituteStatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    <time dateTime={i.lastActive} suppressHydrationWarning>
                      {timeAgo(i.lastActive, now)}
                    </time>
                  </TableCell>
                  <TableCell>
                    <RowActions institute={i} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {institutes.length === 0 && (
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <Building2 className="size-8 text-muted-foreground" />
            <p className="font-bold">No institutes yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">Add your first institute with the button above, or turn a won demo request into one from Demo Requests.</p>
          </div>
        )}
        {institutes.length > 0 && rows.length === 0 && (
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-bold">No institutes match these filters</p>
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1 rounded-full px-4">
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <PaginationBar {...pager} noun="institutes" />
    </Panel>
  );
}

export default InstitutesTable;
