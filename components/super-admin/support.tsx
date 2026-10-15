"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Clock, Inbox, Loader2, Lock, Mail, MessageCircle, Phone, Plus, Search, SearchX, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/super-admin/ui";
import { createTicket, logInstituteMessage, replyToTicket, updateTicket } from "@/lib/support/actions";
import type { TicketChannel, TicketMessage, TicketPriority, TicketStatus, TicketSummary } from "@/lib/support/queries";
import { formatDate, timeAgo } from "@/lib/super-admin/data";
import { ticketRef } from "@/lib/support/labels";
import { cn } from "@/lib/utils";

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: string; icon: React.ElementType }> = {
  open: { label: "Open", tone: "bg-primary-light text-primary", icon: Inbox },
  pending: { label: "Waiting on institute", tone: "bg-warning-light text-accent-foreground dark:text-warning", icon: Clock },
  resolved: { label: "Resolved", tone: "bg-secondary text-muted-foreground", icon: CircleCheck },
};
const PRIORITY: Record<TicketPriority, { label: string; tone: string }> = {
  high: { label: "High", tone: "bg-danger-light text-destructive" },
  normal: { label: "Normal", tone: "bg-secondary text-foreground" },
  low: { label: "Low", tone: "bg-secondary text-muted-foreground" },
};
const CHANNEL: Record<TicketChannel, { label: string; icon: React.ElementType }> = {
  phone: { label: "Phone call", icon: Phone },
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  in_person: { label: "In person", icon: UserRound },
};
const STATUS_ITEMS = (Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => ({ value: s, label: TICKET_STATUS[s].label }));
const PRIORITY_ITEMS = (["high", "normal", "low"] as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY[p].label }));
const CHANNEL_ITEMS = (Object.keys(CHANNEL) as TicketChannel[]).map((c) => ({ value: c, label: CHANNEL[c].label }));

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const s = TICKET_STATUS[status];
  return <Badge className={cn("h-6 gap-1 rounded-full px-2.5 text-[11.5px] font-bold [&>svg]:size-3!", s.tone)}>{<s.icon />}{s.label}</Badge>;
}

function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="gap-1 font-bold">
      {children}
      {optional ? (
        <span className="font-medium text-muted-foreground">(optional)</span>
      ) : (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </Label>
  );
}

function PlainSelect<T extends string>({ id, value, onChange, items }: { id: string; value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as T)} items={items}>
      <SelectTrigger id={id} className={`${CONTROL} w-full`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------------------------------------------------------------- new ticket */

export type TicketInstitute = { slug: string; name: string; contactName: string; contactEmail: string };

export function NewTicketButton({ institutes }: { institutes: TicketInstitute[] }) {
  const router = useRouter();
  const names = React.useMemo(() => institutes.map((i) => i.name), [institutes]);
  const [open, setOpen] = React.useState(false);
  const [instituteName, setInstituteName] = React.useState<string | null>(null);
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [channel, setChannel] = React.useState<TicketChannel>("phone");
  const [priority, setPriority] = React.useState<TicketPriority>("normal");
  const [notify, setNotify] = React.useState(true);
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("institute", institutes.find((i) => i.name === instituteName)?.slug ?? "");
    form.set("channel", channel);
    form.set("priority", priority);
    form.set("contactName", contactName);
    form.set("contactEmail", contactEmail);
    if (notify) form.set("notify", "on");
    setError(undefined);
    startTransition(async () => {
      const r = await createTicket(form);
      if (!r.ok) {
        setError({ message: r.error, field: r.field });
        if (r.field) document.getElementById(`ticket-${r.field}`)?.focus();
        return;
      }
      setOpen(false);
      router.push(`/admin/support/${r.id}`);
    });
  };

  const invalid = (f: string) => (error?.field === f ? { "aria-invalid": true as const, "aria-describedby": "ticket-error" } : {});

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!institutes.length} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New ticket
      </Button>
      <Dialog open={open} onOpenChange={(o) => (setOpen(o), !o && setError(undefined))}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New support ticket</DialogTitle>
            <DialogDescription>Log a request that came in by phone, email, WhatsApp or in person.</DialogDescription>
          </DialogHeader>
          <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
            {error && (
              <p id="ticket-error" role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                {error.message}
              </p>
            )}
            <div className="grid gap-2">
              <FieldLabel htmlFor="ticket-institute">Institute</FieldLabel>
              <Combobox
                items={names}
                value={instituteName}
                onValueChange={(v) => {
                  const name = (v as string | null) ?? null;
                  setInstituteName(name);
                  const inst = institutes.find((i) => i.name === name);
                  if (inst) {
                    setContactName(inst.contactName);
                    setContactEmail(inst.contactEmail);
                  }
                }}
              >
                <ComboboxInput id="ticket-institute" placeholder="Search institutes" autoComplete="off" className={cn(CONTROL, "w-full")} {...invalid("institute")} />
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
            <div className="grid gap-2">
              <FieldLabel htmlFor="ticket-subject">Subject</FieldLabel>
              <Input id="ticket-subject" name="subject" placeholder="e.g. Fee receipts show the wrong month" className={CONTROL} {...invalid("subject")} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="ticket-message">What they need</FieldLabel>
              <Textarea id="ticket-message" name="message" rows={4} placeholder="Write it down in their words" className="rounded-xl bg-card dark:bg-card" {...invalid("message")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <FieldLabel htmlFor="ticket-channel">Came in by</FieldLabel>
                <PlainSelect id="ticket-channel" value={channel} onChange={setChannel} items={CHANNEL_ITEMS} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="ticket-priority">Priority</FieldLabel>
                <PlainSelect id="ticket-priority" value={priority} onChange={setPriority} items={PRIORITY_ITEMS} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="ticket-contactName">Contact name</FieldLabel>
                <Input id="ticket-contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} className={CONTROL} {...invalid("contactName")} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="ticket-contactEmail">Contact email</FieldLabel>
                <Input id="ticket-contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={CONTROL} {...invalid("contactEmail")} />
              </div>
            </div>
            <Label htmlFor="ticket-notify" className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 font-normal">
              <Checkbox id="ticket-notify" checked={notify} onCheckedChange={(v) => setNotify(Boolean(v))} className="mt-0.5 size-[18px] rounded-[5px] data-checked:border-primary data-checked:bg-primary" />
              <span className="grid gap-0.5">
                <span className="text-[14px] font-bold">Email them that we&apos;re on it</span>
                <span className="text-[13px] text-muted-foreground">They get the ticket number and can reply to that email.</span>
              </span>
            </Label>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Create ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------------- list */

type Tab = TicketStatus | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

export function TicketsBoard({ tickets, now }: { tickets: TicketSummary[]; now: number }) {
  const [tab, setTab] = React.useState<Tab>("open");
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const counts = React.useMemo(() => {
    const c: Record<Tab, number> = { open: 0, pending: 0, resolved: 0, all: tickets.length };
    tickets.forEach((t) => c[t.status]++);
    return c;
  }, [tickets]);
  const rows = tickets
    .filter((t) => (tab === "all" || t.status === tab) && (!q || [t.subject, t.instituteName, t.contactName, ticketRef(t.id)].some((v) => v.toLowerCase().includes(q))))
    .sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0) || b.lastActivity.localeCompare(a.lastActivity));

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div role="tablist" aria-label="Ticket status" className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-4 text-sm font-bold transition-colors",
                tab === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label} <span className="tabular-nums opacity-80">{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject, institute, contact or T-number"
            aria-label="Search tickets"
            className="h-10 rounded-xl bg-card pl-9 dark:bg-card"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          {tickets.length === 0 ? <Inbox className="size-8 text-muted-foreground" /> : <SearchX className="size-8 text-muted-foreground" />}
          <p className="font-bold">{tickets.length === 0 ? "No support tickets yet" : "No tickets here"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {tickets.length === 0 ? "Log one with \"New ticket\" when an institute calls, emails or messages you." : "Try another tab or search."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((t) => {
            const Channel = CHANNEL[t.channel].icon;
            return (
              <li key={t.id}>
                <Link href={`/admin/support/${t.id}`} className="grid gap-1.5 px-5 py-4 transition-colors hover:bg-secondary/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] font-bold text-muted-foreground tabular-nums">{ticketRef(t.id)}</span>
                      <span className="font-bold">{t.subject}</span>
                      {t.priority !== "normal" && <Badge className={cn("h-5 rounded-full px-2 text-[11px] font-bold", PRIORITY[t.priority].tone)}>{PRIORITY[t.priority].label}</Badge>}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{t.instituteName}</span>· {t.contactName} ·
                      <Channel className="size-3.5" aria-label={CHANNEL[t.channel].label} />
                      {t.messages} {t.messages === 1 ? "message" : "messages"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <TicketStatusBadge status={t.status} />
                    <span className="text-[12.5px] text-muted-foreground" title={formatDate(t.lastActivity)} suppressHydrationWarning>
                      {timeAgo(t.lastActivity, now)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- detail */

export function TicketControls({ id, status, priority }: { id: number; status: TicketStatus; priority: TicketPriority }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const change = (c: { status?: TicketStatus; priority?: TicketPriority }) =>
    startTransition(async () => {
      await updateTicket(id, c);
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="ticket-status-select" className="font-bold">
          Status {pending && <Loader2 className="size-3.5 animate-spin" />}
        </Label>
        <PlainSelect id="ticket-status-select" value={status} onChange={(v) => change({ status: v })} items={STATUS_ITEMS} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ticket-priority-select" className="font-bold">
          Priority
        </Label>
        <PlainSelect id="ticket-priority-select" value={priority} onChange={(v) => change({ priority: v })} items={PRIORITY_ITEMS} />
      </div>
    </div>
  );
}

export function TicketThread({ thread, now }: { thread: TicketMessage[]; now: number }) {
  return (
    <ol className="grid gap-3">
      {thread.map((m) => {
        const staff = m.author === "staff";
        return (
          <li
            key={m.id}
            className={cn(
              "grid gap-1.5 rounded-2xl border p-4",
              m.internal ? "border-dashed border-warning bg-warning-light/40" : staff ? "border-primary/20 bg-primary-light/50" : "bg-card"
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-bold">{m.authorName}</span>
              <span className="text-muted-foreground">{staff ? "Acadify team" : "Institute"}</span>
              {m.internal && (
                <Badge variant="secondary" className="h-5 gap-1 rounded-full px-2 text-[11px] font-bold [&>svg]:size-3!">
                  <Lock />
                  Internal note
                </Badge>
              )}
              {staff && !m.internal && m.emailed && (
                <Badge variant="secondary" className="h-5 gap-1 rounded-full px-2 text-[11px] font-bold [&>svg]:size-3!">
                  <Mail />
                  Emailed
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground" title={formatDate(m.createdAt)} suppressHydrationWarning>
                {timeAgo(m.createdAt, now)}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}

type Mode = "reply" | "note" | "log";

export function TicketReplyBox({ id, contactName, contactEmail }: { id: number; contactName: string; contactEmail: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("reply");
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const submit = (status?: TicketStatus) => {
    const form = new FormData();
    form.set("body", body);
    if (mode === "note") form.set("internal", "on");
    if (status) form.set("status", status);
    setError(undefined);
    startTransition(async () => {
      const r = mode === "log" ? await logInstituteMessage(id, form) : await replyToTicket(id, form);
      if (!r.ok) return setError(r.error);
      setBody("");
      router.refresh();
    });
  };

  const MODES: { value: Mode; label: string; hint: string }[] = [
    { value: "reply", label: "Reply", hint: `Emailed to ${contactName} <${contactEmail}>.` },
    { value: "note", label: "Internal note", hint: "Only the Acadify team sees this. Nothing is sent." },
    { value: "log", label: "They said", hint: "Record what they told you on a call or WhatsApp. Reopens the ticket." },
  ];

  return (
    <Panel>
      <form
        method="post"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid gap-3 p-4"
      >
        <div role="tablist" aria-label="Message type" className="flex flex-wrap gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={mode === m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-bold transition-colors",
                mode === m.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
        <Textarea
          aria-label={MODES.find((m) => m.value === mode)!.label}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder={mode === "reply" ? "Write your reply" : mode === "note" ? "Write a note for the team" : "What did they say?"}
          className="rounded-xl bg-card dark:bg-card"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">{MODES.find((m) => m.value === mode)!.hint}</p>
          <div className="flex flex-wrap gap-2">
            {mode === "reply" && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => submit("resolved")} className="rounded-full px-4 font-bold">
                Send and resolve
              </Button>
            )}
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "reply" ? "Send reply" : mode === "note" ? "Add note" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

