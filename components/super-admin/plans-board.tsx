"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Plus, Star, StarOff, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/super-admin/ui";
import { deletePlan, movePlan, savePlan, setPlanFlag } from "@/lib/plans/actions";
import { formatNumber, formatTaka, TRIAL_PLAN, type Plan } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

export type PlanWithUsage = Plan & { institutes: number };

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";
const AREA = "rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

/** Percentage saved by paying yearly instead of 12 monthly payments. */
const yearlySaving = (p: Pick<Plan, "price" | "yearlyPrice">) =>
  p.price && p.yearlyPrice ? Math.round((1 - p.yearlyPrice / (p.price * 12)) * 100) : 0;

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

/* ---------------------------------------------------------------- form */

function PlanFormDialog({ open, onOpenChange, plan, trialDays }: { open: boolean; onOpenChange: (o: boolean) => void; plan?: PlanWithUsage; trialDays: number }) {
  const router = useRouter();
  const isTrial = plan?.key === TRIAL_PLAN;
  const [customPrice, setCustomPrice] = React.useState(plan ? plan.price === null : false);
  const [price, setPrice] = React.useState(plan?.price ? String(plan.price) : "");
  const [yearly, setYearly] = React.useState(plan?.yearlyPrice ? String(plan.yearlyPrice) : "");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const monthly = Number(price.replace(/[,\s]/g, "")) || 0;
  const saving = yearlySaving({ price: monthly || null, yearlyPrice: Number(yearly.replace(/[,\s]/g, "")) || null });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (plan) form.set("key", plan.key);
    if (customPrice) form.set("customPrice", "on");
    setError(undefined);
    startTransition(async () => {
      const result = await savePlan(form);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        if (result.field) document.getElementById(`plan-${result.field}`)?.focus();
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  const invalid = (field: string) => (error?.field === field ? { "aria-invalid": true as const, "aria-describedby": "plan-error" } : {});

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(undefined);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New plan"}</DialogTitle>
          <DialogDescription>
            {plan
              ? "Changes show on the website right away. Institutes already on this plan keep their current monthly price until you edit them."
              : "New plans are shown on the website. You can hide or archive a plan at any time."}
          </DialogDescription>
        </DialogHeader>

        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-5">
          {error && (
            <p id="plan-error" role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
              {error.message}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-name">Name</FieldLabel>
              <Input id="plan-name" name="name" required defaultValue={plan?.name} placeholder="e.g. Institute" className={CONTROL} {...invalid("name")} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-nameBn" optional>
                Name in Bangla
              </FieldLabel>
              <Input id="plan-nameBn" name="nameBn" lang="bn" defaultValue={plan?.nameBn} placeholder="যেমন ইনস্টিটিউট" className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-tagline" optional>
                Short description
              </FieldLabel>
              <Input id="plan-tagline" name="tagline" defaultValue={plan?.tagline} placeholder="e.g. Up to 1,500 students" className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-taglineBn" optional>
                Short description in Bangla
              </FieldLabel>
              <Input id="plan-taglineBn" name="taglineBn" lang="bn" defaultValue={plan?.taglineBn} placeholder="যেমন ১,৫০০ শিক্ষার্থী পর্যন্ত" className={CONTROL} />
            </div>
          </div>

          {isTrial ? (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">The free trial is always free. It runs {trialDays} days; change that in Platform Settings.</p>
          ) : (
            <fieldset className="grid gap-4">
              <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Price</legend>
              <Label htmlFor="plan-custom" className="flex w-fit cursor-pointer items-center gap-2.5 font-medium">
                <Checkbox
                  id="plan-custom"
                  checked={customPrice}
                  onCheckedChange={(v) => setCustomPrice(Boolean(v))}
                  className="size-[18px] rounded-[5px] data-checked:border-primary data-checked:bg-primary"
                />
                Custom price, agreed with each institute (shows &quot;Talk to us&quot; on the website)
              </Label>
              {!customPrice && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="plan-price">Monthly price (৳)</FieldLabel>
                    <Input
                      id="plan-price"
                      name="price"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 4500"
                      className={CONTROL}
                      {...invalid("price")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="plan-yearlyPrice" optional>
                      Yearly price (৳)
                    </FieldLabel>
                    <Input
                      id="plan-yearlyPrice"
                      name="yearlyPrice"
                      inputMode="numeric"
                      value={yearly}
                      onChange={(e) => setYearly(e.target.value)}
                      placeholder={monthly ? `e.g. ${monthly * 10} (2 months free)` : "e.g. 45000"}
                      className={CONTROL}
                      {...invalid("yearlyPrice")}
                    />
                    <p className="text-[12.5px] text-muted-foreground">
                      {saving > 0 ? `Saves ${saving}% compared with paying monthly.` : "Leave empty if this plan is monthly only."}
                    </p>
                  </div>
                </div>
              )}
            </fieldset>
          )}

          <div className="grid gap-2 sm:max-w-xs">
            <FieldLabel htmlFor="plan-studentLimit" optional>
              Student limit
            </FieldLabel>
            <Input
              id="plan-studentLimit"
              name="studentLimit"
              inputMode="numeric"
              defaultValue={plan?.studentLimit ?? ""}
              placeholder="Empty = no limit"
              className={CONTROL}
              {...invalid("studentLimit")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-features">Features, one per line</FieldLabel>
              <Textarea
                id="plan-features"
                name="features"
                rows={5}
                defaultValue={plan?.features.join("\n")}
                placeholder={"Attendance and absence SMS\nMonthly fee slips and receipts"}
                className={AREA}
                {...invalid("features")}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="plan-featuresBn" optional>
                Features in Bangla, one per line
              </FieldLabel>
              <Textarea
                id="plan-featuresBn"
                name="featuresBn"
                lang="bn"
                rows={5}
                defaultValue={plan?.featuresBn.join("\n")}
                placeholder={"হাজিরা ও অনুপস্থিতির এসএমএস\nমাসিক ফি স্লিপ ও রসিদ"}
                className={AREA}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {plan ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- board */

function PlanCard({
  plan,
  first,
  last,
  trialDays,
  onEdit,
  onError,
}: {
  plan: PlanWithUsage;
  first: boolean;
  last: boolean;
  trialDays: number;
  onEdit: () => void;
  onError: (m: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const isTrial = plan.key === TRIAL_PLAN;
  const saving = yearlySaving(plan);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok && result.error) onError(result.error);
      router.refresh();
    });

  return (
    <Panel className={cn("flex flex-col", !plan.isActive && "opacity-70")}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">{plan.name}</h2>
            {plan.featured && <Badge className="rounded-full bg-accent px-2 font-bold text-accent-foreground">Most popular</Badge>}
            {isTrial && <Badge variant="secondary" className="rounded-full px-2 font-bold">Free trial</Badge>}
            {!plan.isActive && <Badge variant="secondary" className="rounded-full px-2 font-bold">Archived</Badge>}
          </div>
          {plan.tagline && <p className="mt-0.5 text-[13px] text-muted-foreground">{plan.tagline}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" disabled={pending} aria-label={`More for ${plan.name}`} className="size-8 shrink-0 rounded-lg" />}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => run(() => setPlanFlag(plan.key, "isPublic", !plan.isPublic))}>
              {plan.isPublic ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {plan.isPublic ? "Hide from website" : "Show on website"}
            </DropdownMenuItem>
            {!isTrial && (
              <DropdownMenuItem onClick={() => run(() => setPlanFlag(plan.key, "featured", !plan.featured))}>
                {plan.featured ? <StarOff className="size-4" /> : <Star className="size-4" />}
                {plan.featured ? "Remove \"Most popular\"" : "Mark as \"Most popular\""}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={first} onClick={() => run(() => movePlan(plan.key, -1))}>
              <ArrowUp className="size-4" />
              Move earlier
            </DropdownMenuItem>
            <DropdownMenuItem disabled={last} onClick={() => run(() => movePlan(plan.key, 1))}>
              <ArrowDown className="size-4" />
              Move later
            </DropdownMenuItem>
            {!isTrial && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => run(() => setPlanFlag(plan.key, "isActive", !plan.isActive))}>
                  {plan.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                  {plan.isActive ? "Archive" : "Restore"}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" disabled={plan.institutes > 0} onClick={() => run(() => deletePlan(plan.key))}>
                  <Trash2 className="size-4" />
                  {plan.institutes > 0 ? "Delete (in use)" : "Delete"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid flex-1 content-start gap-4 p-5">
        <div>
          {isTrial ? (
            <p className="text-[28px] leading-none font-extrabold tracking-tight">Free</p>
          ) : plan.price === null ? (
            <p className="text-[28px] leading-none font-extrabold tracking-tight">Custom</p>
          ) : (
            <p className="flex items-baseline gap-1">
              <span className="text-[28px] leading-none font-extrabold tracking-tight tabular-nums">{formatTaka(plan.price)}</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </p>
          )}
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {isTrial
              ? `${trialDays} days, then pick a plan`
              : plan.yearlyPrice
                ? `${formatTaka(plan.yearlyPrice)} / year${saving > 0 ? ` · saves ${saving}%` : ""}`
                : plan.price === null
                  ? "Price agreed with each institute"
                  : "Monthly only"}
          </p>
        </div>

        <ul className="grid gap-1.5 text-[13.5px]">
          {plan.features.slice(0, 5).map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
          {plan.features.length > 5 && <li className="pl-6 text-muted-foreground">+{plan.features.length - 5} more</li>}
          {plan.features.length === 0 && <li className="text-muted-foreground">No features listed yet.</li>}
        </ul>

        <dl className="mt-auto grid gap-1.5 border-t border-border pt-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Students</dt>
            <dd className="font-semibold">{plan.studentLimit ? `Up to ${formatNumber(plan.studentLimit)}` : "No limit"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Website</dt>
            <dd className={cn("font-semibold", !plan.isPublic && "text-muted-foreground")}>{plan.isPublic && plan.isActive ? "Shown" : "Hidden"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-3.5" />
              Institutes
            </dt>
            <dd className="font-semibold tabular-nums">{plan.institutes}</dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-border p-3">
        <Button variant="outline" onClick={onEdit} className="h-10 w-full gap-2 rounded-xl font-bold">
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>
    </Panel>
  );
}

export function NewPlanButton({ trialDays }: { trialDays: number }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <Plus className="size-4" />
        New plan
      </Button>
      {open && <PlanFormDialog open={open} onOpenChange={setOpen} trialDays={trialDays} />}
    </>
  );
}

export function PlansBoard({ plans, trialDays }: { plans: PlanWithUsage[]; trialDays: number }) {
  const [editing, setEditing] = React.useState<PlanWithUsage | null>(null);
  const [error, setError] = React.useState<string>();

  return (
    <>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <section aria-label="Plans" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p, i) => (
          <PlanCard
            key={p.key}
            plan={p}
            first={i === 0}
            last={i === plans.length - 1}
            trialDays={trialDays}
            onEdit={() => setEditing(p)}
            onError={(m) => setError(m)}
          />
        ))}
      </section>
      {editing && <PlanFormDialog key={editing.key} open onOpenChange={(o) => !o && setEditing(null)} plan={editing} trialDays={trialDays} />}
    </>
  );
}
