"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInstitute, updateInstituteDetails } from "@/lib/super-admin/actions";
import { APP_DOMAIN, BD_DISTRICTS, findPlan, planPriceLabel, slugify, TRIAL_PLAN, TYPE_LABELS, type Institute, type InstituteType, type Plan, type PlanKey } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";
const DISTRICTS: string[] = [...BD_DISTRICTS];
const TYPE_ITEMS =(Object.keys(TYPE_LABELS) as InstituteType[]).map((t) => ({ value: t, label: TYPE_LABELS[t] }));
/** Plans the institute can be put on: open plans, plus the one it already has (even if archived). */
function planItems(plans: Plan[], current?: PlanKey) {
  return plans
    .filter((p) => p.isActive || p.key === current)
    .map((p) => {
      const limit = p.studentLimit ? ` · up to ${p.studentLimit.toLocaleString("en-IN")} students` : "";
      return { value: p.key, label: `${p.name} (${planPriceLabel(p)}${limit})${p.isActive ? "" : " · archived"}` };
    });
}

export type InstitutePrefill = Partial<{
  name: string;
  type: InstituteType;
  district: string;
  plan: PlanKey;
  customPrice: number;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
}>;

export function institutePrefill(i: Institute): InstitutePrefill {
  return {
    name: i.name,
    type: i.type,
    district: i.district,
    plan: i.plan,
    // Prefilled for custom-priced plans; ignored for plans with a fixed price
    customPrice: i.mrr || undefined,
    contactName: i.contact.name,
    contactRole: i.contact.role,
    contactPhone: i.contact.phone,
    contactEmail: i.contact.email,
  };
}

type Props = {
  /** All plans from the database (open and archived). */
  plans: Plan[];
  /** Free trial length from Platform Settings. */
  trialDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set: the institute's web address (slug). */
  slug?: string;
  initial?: InstitutePrefill;
  /** Demo request this institute comes from (marked as won on save). */
  fromDemo?: number;
};

export function InstituteFormDialog({ open, onOpenChange, slug, initial, fromDemo, plans, trialDays }: Props) {
  const router = useRouter();
  const editing = Boolean(slug);
  const [type, setType] = React.useState<InstituteType>(initial?.type ?? "school");
  const [plan, setPlan] = React.useState<PlanKey>(initial?.plan ?? TRIAL_PLAN);
  const items = React.useMemo(() => planItems(plans, initial?.plan), [plans, initial?.plan]);
  const customPriced = findPlan(plans, plan).price === null && plan !== TRIAL_PLAN;
  // Older records may hold a spelling outside the list; keep it until a district is picked
  const [district, setDistrict] = React.useState<string | null>(initial?.district ?? null);
  const [name, setName] = React.useState(initial?.name ?? "");
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [onboard, setOnboard] = React.useState(true);
  /** After "Add institute" with onboarding: what happened, shown before opening the new institute. */
  const [done, setDone] = React.useState<{ slug: string; message: string; ok: boolean }>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("type", type);
    form.set("plan", plan);
    form.set("district", district ?? "");
    if (fromDemo) form.set("fromDemo", String(fromDemo));
    if (!editing && onboard) form.set("onboard", "on");
    setError(undefined);
    startTransition(async () => {
      if (editing) {
        const result = await updateInstituteDetails(slug!, form);
        if (!result.ok) return showError(result);
        onOpenChange(false);
        router.refresh();
        return;
      }
      const result = await createInstitute(form);
      if (!result.ok) return showError(result);
      const o = result.onboarding;
      const demoNote =
        result.demoEmailed === undefined ? "" : result.demoEmailed ? " The person who requested the demo was emailed that it's accepted." : " The acceptance email to the person who requested the demo couldn't be sent.";
      if ((!o || o.skipped) && !demoNote) {
        onOpenChange(false);
        router.push(`/admin/institutes/${result.slug}`);
        return;
      }
      const contact = String(form.get("contactEmail"));
      const onboardingNote =
        !o || o.skipped
          ? "The institute was added."
          : o.error
            ? `The institute was added, but the main contact's account couldn't be created: ${o.error} Add them from "People with access" on the next page.`
            : o.emailed
              ? `The institute was added and ${contact} has Principal access. We emailed them the welcome email with their plan and next steps.`
              : `The institute was added and ${contact} has Principal access, but the welcome email couldn't be sent. Ask them to use "Forgot password?" on the sign-in page.`;
      setDone({
        slug: result.slug,
        ok: !(o && !o.skipped && (o.error || !o.emailed)) && result.demoEmailed !== false,
        message: onboardingNote + demoNote,
      });
    });
  };

  const showError = (result: { error: string; field?: string }) => {
    setError({ message: result.error, field: result.field });
    if (result.field) document.getElementById(`inst-${result.field}`)?.focus();
  };

  const openInstitute = () => {
    if (!done) return;
    onOpenChange(false);
    router.push(`/admin/institutes/${done.slug}`);
  };

  const invalid = (field: string) => (error?.field === field ? { "aria-invalid": true as const, "aria-describedby": "inst-error" } : {});

  const field = (id: string, label: string, input: React.ReactNode, hint?: string, optional = false) => (
    <div className="grid gap-2">
      <Label htmlFor={`inst-${id}`} className="gap-1 font-bold">
        {label}
        {optional ? (
          <span className="font-medium text-muted-foreground">(optional)</span>
        ) : (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {input}
      {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(undefined);
        // The institute already exists once the confirmation shows; closing it still opens the institute
        if (!o && done) router.push(`/admin/institutes/${done.slug}`);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${initial?.name ?? "institute"}` : "Add an institute"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply right away. The web address can't be changed."
              : fromDemo
                ? `From demo request DR-${fromDemo}. Saving marks the request as won.`
                : `Free trials run ${trialDays} days. You can add the principal and staff right after saving.`}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="grid gap-4">
            <p role="status" className={cn("rounded-xl px-4 py-3 text-sm font-semibold", done.ok ? "bg-primary-light text-primary" : "bg-danger-light text-destructive")}>
              {done.message}
            </p>
            <DialogFooter>
              <Button onClick={openInstitute} className="rounded-full px-5 font-bold">
                Open institute
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <form method="post" onSubmit={onSubmit} noValidate className="grid gap-5">
          {error && (
            <p id="inst-error" role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
              {error.message}
            </p>
          )}

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Institute</legend>
            {field(
              "name",
              "Name",
              <Input
                id="inst-name"
                name="name"
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ar-Rahman Dakhil Madrasah"
                className={CONTROL}
                {...invalid("name")}
              />
            )}
            <div className="grid gap-1 rounded-xl bg-secondary px-4 py-3">
              <span className="text-[12.5px] font-bold text-muted-foreground">Web address</span>
              <span className="text-[14px] font-semibold break-all">
                {editing ? slug : slugify(name) || "…"}
                {APP_DOMAIN && <span className="text-muted-foreground">.{APP_DOMAIN}</span>}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "type",
                "Type",
                <Select value={type} onValueChange={(v) => v && setType(v as InstituteType)} items={TYPE_ITEMS}>
                  <SelectTrigger id="inst-type" className={`${CONTROL} w-full`} {...invalid("type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ITEMS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field(
                "district",
                "District",
                <Combobox items={DISTRICTS} value={district} onValueChange={(v) => setDistrict((v as string | null) ?? null)}>
                  <ComboboxInput
                    id="inst-district"
                    placeholder="Search districts"
                    autoComplete="off"
                    className={cn(CONTROL, "w-full", error?.field === "district" && "border-destructive")}
                    {...invalid("district")}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No district matches</ComboboxEmpty>
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </div>
            {field(
              "plan",
              "Plan",
              <Select value={plan} onValueChange={(v) => v && setPlan(v as PlanKey)} items={items}>
                <SelectTrigger id="inst-plan" className={`${CONTROL} w-full`} {...invalid("plan")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
              editing && initial?.plan === TRIAL_PLAN && plan !== TRIAL_PLAN ? "Moving off the trial makes the institute active and starts billing today." : undefined
            )}
            {customPriced &&
              field(
                "customPrice",
                "Agreed monthly price (৳)",
                <Input
                  id="inst-customPrice"
                  name="customPrice"
                  inputMode="numeric"
                  defaultValue={initial?.customPrice}
                  placeholder="e.g. 12000"
                  className={CONTROL}
                  {...invalid("customPrice")}
                />
              )}
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-[12.5px] font-extrabold tracking-wide text-muted-foreground uppercase">Main contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "contactName",
                "Name",
                <Input id="inst-contactName" name="contactName" required autoComplete="off" defaultValue={initial?.contactName} placeholder="e.g. Abdur Rahim" className={CONTROL} {...invalid("contactName")} />
              )}
              {field(
                "contactRole",
                "Role",
                <Input id="inst-contactRole" name="contactRole" required autoComplete="off" defaultValue={initial?.contactRole} placeholder="e.g. Principal, Muhtamim" className={CONTROL} {...invalid("contactRole")} />
              )}
              {field(
                "contactPhone",
                "Mobile",
                <Input id="inst-contactPhone" name="contactPhone" type="tel" inputMode="tel" required autoComplete="off" defaultValue={initial?.contactPhone} placeholder="01XXXXXXXXX" className={CONTROL} {...invalid("contactPhone")} />
              )}
              {field(
                "contactEmail",
                "Email",
                <Input id="inst-contactEmail" name="contactEmail" type="email" required autoComplete="off" defaultValue={initial?.contactEmail} placeholder="name@example.com" className={CONTROL} {...invalid("contactEmail")} />
              )}
            </div>
            {!editing && (
              <Label htmlFor="inst-onboard" className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 font-normal">
                <Checkbox
                  id="inst-onboard"
                  checked={onboard}
                  onCheckedChange={(v) => setOnboard(Boolean(v))}
                  className="mt-0.5 size-[18px] rounded-[5px] data-checked:border-primary data-checked:bg-primary"
                />
                <span className="grid gap-0.5">
                  <span className="text-[14px] font-bold">Give the main contact Principal access and email them</span>
                  <span className="text-[13px] text-muted-foreground">They get a welcome email with their plan, a link to set their password, and what to do next.</span>
                </span>
              </Label>
            )}
          </fieldset>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add institute"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InstituteFormDialog;
