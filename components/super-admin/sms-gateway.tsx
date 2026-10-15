"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Loader2, MessageSquareText, Pencil, Plus, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { adjustSmsCredits, saveSmsSettings, sendTestSms } from "@/lib/sms/actions";
import type { SmsInstituteRow, SmsMessageRow, SmsTopUpRow } from "@/lib/sms/queries";
import { smsSegments } from "@/lib/sms/segments";
import { formatNumber, STATUS_LABELS, timeAgo, type InstituteStatus } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

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

function FormError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------- provider + test */

export function ProviderPanel({ status }: { status: { connected: true; label: string } | { connected: false; reason: string } }) {
  const [to, setTo] = React.useState("");
  const [body, setBody] = React.useState("Test SMS from Acadify.");
  const [result, setResult] = React.useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = React.useTransition();
  const parts = smsSegments(body);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    form.set("to", to);
    form.set("body", body);
    setResult(undefined);
    startTransition(async () => {
      const r = await sendTestSms(form);
      setResult(r.ok ? { ok: true, text: r.message ?? "Sent." } : { ok: false, text: r.error });
    });
  };

  return (
    <Panel>
      <PanelHeader title="SMS provider" description="The company that delivers Acadify's SMS in Bangladesh" />
      <div className="grid gap-4 p-5">
        <div className={cn("flex gap-3 rounded-xl p-4", status.connected ? "bg-primary-light" : "bg-secondary")}>
          {status.connected ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
          <div className="grid gap-0.5 text-sm">
            <p className="font-bold">{status.connected ? `Connected: ${status.label}` : "Not connected"}</p>
            <p className="text-muted-foreground">
              {status.connected
                ? "Attendance alerts, fee reminders and test messages go out through this provider."
                : `${status.reason} Choose a provider and add its API key; until then nothing is sent and no credits are used.`}
            </p>
          </div>
        </div>

        <form method="post" onSubmit={send} noValidate className="grid gap-3">
          <p className="text-[13px] font-extrabold tracking-wide text-muted-foreground uppercase">Send a test SMS</p>
          {result && (
            <p role={result.ok ? "status" : "alert"} className={cn("rounded-xl px-4 py-3 text-sm font-semibold", result.ok ? "bg-primary-light text-primary" : "bg-danger-light text-destructive")}>
              {result.text}
            </p>
          )}
          <div className="grid gap-2">
            <FieldLabel htmlFor="test-to">Mobile number</FieldLabel>
            <Input id="test-to" type="tel" inputMode="tel" value={to} onChange={(e) => setTo(e.target.value)} placeholder="01XXXXXXXXX" disabled={!status.connected} className={CONTROL} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="test-body">Message</FieldLabel>
            <Textarea id="test-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} disabled={!status.connected} className="rounded-xl bg-card dark:bg-card" />
            <p className="text-[12.5px] text-muted-foreground">
              {parts.length} characters · {parts.segments} SMS {parts.segments === 1 ? "part" : "parts"}
              {parts.unicode ? " · Bangla/Unicode: 70 characters per SMS" : ""}
            </p>
          </div>
          <Button type="submit" disabled={!status.connected || pending} className="w-fit gap-2 rounded-full px-5 font-bold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send test
          </Button>
        </form>
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- rate + sender */

export function SmsSettingsPanel({ senderId, ratePoisha }: { senderId: string; ratePoisha: number }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const r = await saveSmsSettings(form);
      if (!r.ok) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader title="Rate and sender" description="Institutes pay the provider's rate, with no markup" />
      <form method="post" onSubmit={onSubmit} noValidate onChange={() => setSaved(false)} className="grid gap-4 p-5">
        <FormError id="sms-settings-error">{error}</FormError>
        {ratePoisha === 0 && (
          <p className="rounded-xl bg-warning-light px-4 py-3 text-sm font-semibold text-accent-foreground dark:text-warning">
            Set the price of one SMS so usage and costs are calculated.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor="sms-rate">Price per SMS (৳)</FieldLabel>
            <Input id="sms-rate" name="smsRate" inputMode="decimal" defaultValue={ratePoisha ? (ratePoisha / 100).toFixed(2) : ""} placeholder="e.g. 0.35" className={CONTROL} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="sms-sender" optional>
              Sender ID
            </FieldLabel>
            <Input id="sms-sender" name="smsSenderId" defaultValue={senderId} placeholder="As approved by your provider" className={CONTROL} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <p role="status" className="text-sm font-semibold text-primary">
              Saved.
            </p>
          )}
          <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ---------------------------------------------------------------- credits */

function AdjustCreditsDialog({ institute, onClose }: { institute: SmsInstituteRow; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(undefined);
    startTransition(async () => {
      const r = await adjustSmsCredits(institute.slug, form);
      if (!r.ok) return setError(r.error);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>SMS credits for {institute.name}</DialogTitle>
          <DialogDescription>Balance now: {formatNumber(institute.credit)} credits. One credit sends one SMS part.</DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError id="credits-error">{error}</FormError>
          <div className="grid gap-2">
            <FieldLabel htmlFor="credits-amount">Credits to add</FieldLabel>
            <Input id="credits-amount" name="credits" inputMode="numeric" autoFocus placeholder="e.g. 1000 (or -100 to remove)" className={CONTROL} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="credits-note" optional>
              Note
            </FieldLabel>
            <Input id="credits-note" name="note" placeholder="e.g. Paid with invoice ACD-2026-10-004" className={CONTROL} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SmsCreditsTable({ institutes }: { institutes: SmsInstituteRow[] }) {
  const [adjusting, setAdjusting] = React.useState<SmsInstituteRow | null>(null);

  return (
    <Panel>
      <PanelHeader title="Credits by institute" description="Each institute sends SMS from its own credit balance" />
      {institutes.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Institutes appear here once you add them.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 font-bold text-muted-foreground">Institute</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground">Balance</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground">Used this month</TableHead>
                <TableHead className="w-40">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutes.map((i) => (
                <TableRow key={i.slug}>
                  <TableCell className="pl-5">
                    <span className="font-bold">{i.name}</span>
                    {i.status !== "active" && (
                      <Badge variant="secondary" className="ml-2 rounded-full px-2 text-[11px] font-bold">
                        {STATUS_LABELS[i.status as InstituteStatus] ?? i.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", i.credit < 100 && "text-destructive")}>{formatNumber(i.credit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(i.usedThisMonth)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => setAdjusting(i)} className="gap-1.5 rounded-full px-3 font-bold">
                      <Plus className="size-3.5" />
                      Add credits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {adjusting && <AdjustCreditsDialog institute={adjusting} onClose={() => setAdjusting(null)} />}
    </Panel>
  );
}

/* ---------------------------------------------------------------- logs */

const STATUS_TONE: Record<string, string> = {
  delivered: "bg-primary-light text-primary",
  sent: "bg-primary-light text-primary",
  queued: "bg-secondary text-muted-foreground",
  failed: "bg-danger-light text-destructive",
};

export function SmsLog({ messages, now }: { messages: SmsMessageRow[]; now: number }) {
  return (
    <Panel>
      <PanelHeader title="Recent messages" description="The last 25 SMS sent through the gateway" />
      {messages.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
          <MessageSquareText className="size-8 text-muted-foreground" />
          <p className="font-bold">No SMS sent yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Messages appear here once a provider is connected and institutes start sending.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {messages.map((m) => (
            <li key={m.id} className="grid gap-1 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-bold tabular-nums">+{m.to}</span>
                <span className="text-muted-foreground">{m.instituteName ?? "Platform"}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", STATUS_TONE[m.status])}>{m.status}</span>
                <span className="ml-auto text-muted-foreground" suppressHydrationWarning>
                  {timeAgo(m.createdAt, now)}
                </span>
              </div>
              <p className="line-clamp-2 text-sm">{m.body}</p>
              {m.error && <p className="text-[12.5px] font-semibold text-destructive">{m.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function TopUpLog({ topUps, now }: { topUps: SmsTopUpRow[]; now: number }) {
  return (
    <Panel>
      <PanelHeader title="Credit changes" description="Latest top-ups and corrections" />
      {topUps.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">No credits added yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {topUps.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <Pencil className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-bold">{t.instituteName}</span>{" "}
                  <span className={cn("font-semibold tabular-nums", t.credits > 0 ? "text-primary" : "text-destructive")}>
                    {t.credits > 0 ? "+" : ""}
                    {formatNumber(t.credits)}
                  </span>
                </p>
                {t.note && <p className="text-[13px] text-muted-foreground">{t.note}</p>}
              </div>
              <span className="shrink-0 text-[12.5px] text-muted-foreground" suppressHydrationWarning>
                {timeAgo(t.createdAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

