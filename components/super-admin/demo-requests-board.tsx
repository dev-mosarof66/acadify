"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  Check,
  CircleCheck,
  CircleX,
  CircleDot,
  Download,
  Inbox,
  ListFilter,
  RotateCcw,
  Mail,
  MessageSquareQuote,
  MoreHorizontal,
  Phone,
  Search,
  SearchX,
  Trophy,
  Undo2,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { DEMO_STATUS_META, DemoStatusBadge, initials, Panel, StatCard } from "@/components/super-admin/ui";
import {
  BulkAction,
  BulkBar,
  downloadCsv,
  FilterChip,
  PaginationBar,
  RowCheckbox,
  SelectAllCheckbox,
  usePagination,
  useSelection,
} from "@/components/super-admin/list-kit";
import { formatDate, timeAgo, TYPE_LABELS, type DemoRequest, type DemoStatus, type InstituteType } from "@/lib/super-admin/data";
import { rejectDemoRequest, updateDemoStatus } from "@/lib/super-admin/actions";
import { cn } from "@/lib/utils";

type Tab = "all" | DemoStatus;
const TABS: Tab[] = ["all", "new", "contacted", "scheduled", "won", "lost"];
const TYPE_ITEMS = [{ value: "all", label: "All types" }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const STATUS_ITEMS = (Object.keys(DEMO_STATUS_META) as DemoStatus[]).map((s) => ({ value: s, label: DEMO_STATUS_META[s].label }));
/** In-progress steps for the dropdown; won/lost are set with Accept and Reject. */
const OPEN_STATUS_ITEMS = STATUS_ITEMS.filter((o) => o.value !== "won" && o.value !== "lost");

export function DemoRequestsBoard({ requests: initial, now }: { requests: DemoRequest[]; now: number }) {
  // Local copy so status changes show immediately; the Server Action saves them and refreshes the page data.
  const [requests, setRequests] = React.useState<DemoRequest[]>(initial);
  const [saveError, setSaveError] = React.useState<string>();
  const [rejecting, setRejecting] = React.useState<DemoRequest | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [notice, setNotice] = React.useState<string>();

  const reject = (r: DemoRequest, reason: string) => {
    const before = requests;
    setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "lost" } : x)));
    setSaveError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      try {
        const result = await rejectDemoRequest(r.dbId, reason);
        if (!result.ok) throw new Error(result.error);
        setNotice(
          result.emailed
            ? `${r.institute}'s request was rejected and ${r.email} was emailed.`
            : r.email
              ? `${r.institute}'s request was rejected, but the email to ${r.email} couldn't be sent.`
              : `${r.institute}'s request was rejected. It has no email address, so call them on ${r.phone}.`
        );
      } catch {
        setRequests(before);
        setSaveError("Could not reject the request. Check your connection and try again.");
      }
    });
  };
  const [, startTransition] = React.useTransition();
  const [tab, setTab] = React.useState<Tab>("all");
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<"all" | InstituteType>("all");
  // Bumped after each bulk change so the "Set status" select returns to its placeholder
  const [bulkKey, setBulkKey] = React.useState(0);

  const counts = React.useMemo(() => {
    const c = { all: requests.length } as Record<Tab, number>;
    (Object.keys(DEMO_STATUS_META) as DemoStatus[]).forEach((s) => (c[s] = requests.filter((r) => r.status === s).length));
    return c;
  }, [requests]);

  const q = query.trim().toLowerCase();
  const rows = requests.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (type === "all" || r.type === type) &&
      (!q || [r.institute, r.name, r.phone, r.id].some((v) => v.toLowerCase().includes(q))),
  );

  const selection = useSelection<DemoRequest>(React.useCallback((r: DemoRequest) => r.id, []));
  const pager = usePagination(rows, `${tab}|${type}|${q}`);
  const activeFilters = [tab, type].filter((v) => v !== "all").length;
  const resetFilters = () => {
    setTab("all");
    setType("all");
  };
  const selectedRows = requests.filter(selection.isSelected);

  const setStatus = (ids: Set<string>, status: DemoStatus) => {
    const before = requests;
    setRequests((rs) => rs.map((r) => (ids.has(r.id) ? { ...r, status } : r)));
    setSaveError(undefined);
    const dbIds = before.filter((r) => ids.has(r.id)).map((r) => r.dbId);
    startTransition(async () => {
      try {
        await updateDemoStatus(dbIds, status);
      } catch {
        setRequests(before);
        setSaveError("Could not save the status change. Check your connection and try again.");
      }
    });
  };

  const exportSelected = () =>
    downloadCsv(
      `acadify-demo-requests-${new Date().toISOString().slice(0, 10)}.csv`,
      selectedRows.map((r) => ({
        ID: r.id,
        Institute: r.institute,
        Type: TYPE_LABELS[r.type],
        Contact: r.name,
        Phone: r.phone,
        Email: r.email,
        Students: r.students,
        Status: DEMO_STATUS_META[r.status].label,
        Requested: formatDate(r.createdAt),
        Message: r.message,
      })),
    );

  const thisWeek = requests.filter((r) => now - new Date(r.createdAt).getTime() <= 7 * 86_400_000).length;
  const decided = counts.won + counts.lost;
  const conversion = decided ? Math.round((counts.won / decided) * 100) : 0;
  const open = counts.new + counts.contacted + counts.scheduled;

  return (
    <>
      <section aria-label="Demo request summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total requests" value={String(counts.all)} icon={Inbox} note={`${thisWeek} in the last 7 days`} />
        <StatCard label="Waiting for a call" value={String(counts.new)} icon={Phone} note={`${open} still open in total`} />
        <StatCard label="Demos scheduled" value={String(counts.scheduled)} icon={CalendarCheck} note={`${counts.contacted} contacted, not yet booked`} />
        <StatCard label="Conversion rate" value={decided ? `${conversion}%` : "—"} icon={Trophy} note={`${counts.won} accepted · ${counts.lost} rejected`} />
      </section>

      <Panel>
        {notice && (
          <p role="status" className="border-b border-border bg-primary-light px-5 py-3 text-sm font-semibold text-primary">
            {notice}
          </p>
        )}
        {saveError && (
          <p role="alert" className="border-b border-border bg-danger-light px-5 py-3 text-sm font-semibold text-destructive">
            {saveError}
          </p>
        )}
        <div className="grid gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="demo-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by institute, name, phone or ID"
                aria-label="Search demo requests"
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
                  <DropdownMenuLabel>Filter requests</DropdownMenuLabel>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <CircleDot />
                      Status
                      <span className="ml-auto text-xs text-muted-foreground">{tab === "all" ? "All" : DEMO_STATUS_META[tab].label}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      <DropdownMenuRadioGroup value={tab} onValueChange={(v) => setTab(v as Tab)}>
                        {TABS.map((st) => (
                          <DropdownMenuRadioItem key={st} value={st}>
                            {st === "all" ? "All statuses" : DEMO_STATUS_META[st].label}
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
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={activeFilters === 0} onClick={resetFilters}>
                  <RotateCcw />
                  Reset filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {tab !== "all" && <FilterChip label={`Status: ${DEMO_STATUS_META[tab].label}`} onRemove={() => setTab("all")} />}
            {type !== "all" && <FilterChip label={`Type: ${TYPE_LABELS[type]}`} onRemove={() => setType("all")} />}
          </div>
        </div>

        <BulkBar count={selection.count} total={rows.length} onSelectAll={() => selection.selectMany(rows)} onClear={selection.clear}>
          <Select
            key={bulkKey}
            onValueChange={(v) => {
              if (!v) return;
              setStatus(selection.selected, v as DemoStatus);
              setBulkKey((k) => k + 1);
            }}
            items={STATUS_ITEMS}
          >
            <SelectTrigger
              aria-label="Set status for selected requests"
              className="h-8 w-[150px] rounded-full border-primary/30 bg-card text-[13px] font-semibold dark:bg-card"
            >
              <SelectValue placeholder="Set status…" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <BulkAction onClick={exportSelected}>
            <Download className="size-3.5" />
            Export CSV
          </BulkAction>
        </BulkBar>

        {rows.length > 0 && (
          <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-5 py-2 text-[12.5px] font-semibold text-muted-foreground">
            <SelectAllCheckbox items={pager.pageItems} isSelected={selection.isSelected} onToggle={() => selection.toggleMany(pager.pageItems)} />
            Select this page
          </div>
        )}

        <ul className="divide-y divide-border">
          {pager.pageItems.map((r) => {
            const checked = selection.isSelected(r);
            return (
              <li
                key={r.id}
                className={cn(
                  "grid gap-4 p-5 transition-colors lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center",
                  checked && "bg-primary-light/50",
                )}
              >
                <div className="hidden pt-0.5 lg:block">
                  <RowCheckbox checked={checked} onToggle={() => selection.toggle(r)} label={`Select ${r.institute}`} />
                </div>
                <div className="flex min-w-0 items-start gap-3">
                  <div className="pt-3 lg:hidden">
                    <RowCheckbox checked={checked} onToggle={() => selection.toggle(r)} label={`Select ${r.institute}`} />
                  </div>
                  <Avatar className="size-11">
                    <AvatarFallback className="bg-primary-light font-bold text-primary">{initials(r.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{r.institute}</p>
                      <DemoStatusBadge status={r.status} />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {r.name} · {TYPE_LABELS[r.type]} · <span className="tabular-nums">{r.id}</span>
                    </p>
                    {r.message && (
                      <p className="mt-2 flex gap-1.5 rounded-xl bg-secondary px-3 py-2 text-[13px]">
                        <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {r.message}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="grid gap-1.5 text-[13px]">
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground" />
                    <dt className="sr-only">Phone</dt>
                    <dd className="font-semibold tabular-nums select-all">{r.phone}</dd>
                  </div>
                  {r.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      <dt className="sr-only">Email</dt>
                      <dd className="truncate font-semibold select-all">{r.email}</dd>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-muted-foreground" />
                    <dt className="sr-only">Students</dt>
                    <dd>{r.students} students</dd>
                  </div>
                  <p className="text-muted-foreground" title={formatDate(r.createdAt)}>
                    Requested{" "}
                    <time dateTime={r.createdAt} suppressHydrationWarning>
                      {timeAgo(r.createdAt, now)}
                    </time>
                  </p>
                </dl>

                <div className="grid gap-2 lg:w-[250px]">
                  {r.status === "won" ? (
                    <p className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary-light text-[13px] font-bold text-primary">
                      <CircleCheck className="size-4" />
                      Accepted
                    </p>
                  ) : r.status === "lost" ? (
                    <>
                      <p className="flex h-10 items-center justify-center gap-1.5 rounded-xl text-danger-light text-[13px] font-bold text-destructive">
                        <CircleX className="size-4" />
                        Rejected
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(new Set([r.id]), "new")} className="h-8 rounded-xl text-[12.5px] font-semibold text-muted-foreground">
                        <Undo2 className="size-3.5" />
                        Reopen
                      </Button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/admin/institutes?from=${r.dbId}`} />}
                        aria-label={`Accept ${r.institute}'s request and add the institute`}
                        className="h-10 flex-1 gap-1.5 rounded-xl text-[13px] font-bold"
                      >
                        <Check className="size-4" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRejecting(r)}
                        aria-label={`Reject ${r.institute}'s request`}
                        className="h-10 flex-1 gap-1.5 rounded-xl text-[13px] font-bold text-destructive hover:bg-danger-light hover:text-destructive"
                      >
                        <X className="size-4" />
                        Reject
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="outline" size="icon" aria-label={`More for ${r.institute}`} className="size-10 shrink-0 rounded-xl" />}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Progress</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={r.status} onValueChange={(v) => setStatus(new Set([r.id]), v as DemoStatus)}>
                              {OPEN_STATUS_ITEMS.map((o) => (
                                <DropdownMenuRadioItem key={o.value} value={o.value}>
                                  {o.label}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length === 0 && (
          <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-bold">No demo requests here</p>
            <p className="text-sm text-muted-foreground">Requests from the website&apos;s contact form appear on this page.</p>
          </div>
        )}

        <PaginationBar {...pager} noun="requests" />
      </Panel>

      <AlertDialog
        open={!!rejecting}
        onOpenChange={(o) => {
          if (!o) {
            setRejecting(null);
            setRejectReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejecting?.institute}&apos;s request?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejecting?.email
                ? `${rejecting.name} gets a polite email at ${rejecting.email} saying we can't go ahead. You can reopen the request later.`
                : `This request has no email address, so nobody is notified. Call ${rejecting?.name} on ${rejecting?.phone} if needed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejecting?.email && (
            <div className="grid gap-2">
              <Label htmlFor="reject-reason" className="gap-1 font-bold">
                Reason <span className="font-medium text-muted-foreground">(optional, included in the email)</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="e.g. We don't support institutes outside Bangladesh yet."
                className="rounded-xl bg-card dark:bg-card"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep open</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (rejecting) reject(rejecting, rejectReason.trim());
                setRejecting(null);
                setRejectReason("");
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DemoRequestsBoard;
