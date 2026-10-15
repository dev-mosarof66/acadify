"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { saveSettings } from "@/lib/settings/actions";
import type { PlatformSettings } from "@/lib/settings/types";

const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`settings-${id}`} className="gap-1 font-bold">
        {label}
        {optional ? (
          <span className="font-medium text-muted-foreground">(optional)</span>
        ) : (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const router = useRouter();
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSettings(form);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        if (result.field) document.getElementById(`settings-${result.field}`)?.focus();
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  const invalid = (field: string) => (error?.field === field ? { "aria-invalid": true as const, "aria-describedby": "settings-error" } : {});

  return (
    <form method="post" onSubmit={onSubmit} noValidate onChange={() => setSaved(false)} className="grid gap-4">
      {error && (
        <p id="settings-error" role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
          {error.message}
        </p>
      )}

      <Panel>
        <PanelHeader title="Free trial" description="Every new institute can start on the free trial." />
        <div className="grid gap-4 p-5 sm:max-w-xs">
          <Field id="trialDays" label="Trial length (days)" hint="Used for new institutes and on the Refund policy page.">
            <Input id="settings-trialDays" name="trialDays" inputMode="numeric" defaultValue={settings.trialDays} className={CONTROL} {...invalid("trialDays")} />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Billing" description="Printed under “How to pay” on every invoice email." />
        <div className="grid gap-4 p-5">
          <Field
            id="paymentInstructions"
            label="Payment instructions"
            optional
            hint="If empty, invoices ask the institute to reply for payment details."
          >
            <Textarea
              id="settings-paymentInstructions"
              name="paymentInstructions"
              rows={4}
              defaultValue={settings.paymentInstructions}
              placeholder={"bKash (Merchant): 01XXXXXXXXX\nNagad: 01XXXXXXXXX\nBank: Account name, number, bank and branch"}
              className="rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card"
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Contact details on the website" description="Shown on the Contact page and in the legal pages. Empty phone or WhatsApp hides that option." />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field id="supportEmail" label="Support email">
            <Input id="settings-supportEmail" name="supportEmail" type="email" defaultValue={settings.supportEmail} className={CONTROL} {...invalid("supportEmail")} />
          </Field>
          <Field id="salesEmail" label="Sales email">
            <Input id="settings-salesEmail" name="salesEmail" type="email" defaultValue={settings.salesEmail} className={CONTROL} {...invalid("salesEmail")} />
          </Field>
          <Field id="phone" label="Phone" optional>
            <Input id="settings-phone" name="phone" type="tel" inputMode="tel" defaultValue={settings.phone} placeholder="01XXXXXXXXX" className={CONTROL} {...invalid("phone")} />
          </Field>
          <Field id="whatsapp" label="WhatsApp" optional>
            <Input
              id="settings-whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              defaultValue={settings.whatsapp}
              placeholder="01XXXXXXXXX"
              className={CONTROL}
              {...invalid("whatsapp")}
            />
          </Field>
          <Field id="office" label="Office address" optional>
            <Input id="settings-office" name="office" defaultValue={settings.office} placeholder="e.g. Mirpur, Dhaka 1216" className={CONTROL} />
          </Field>
          <Field id="officeBn" label="Office address in Bangla" optional>
            <Input id="settings-officeBn" name="officeBn" lang="bn" defaultValue={settings.officeBn} placeholder="যেমন মিরপুর, ঢাকা ১২১৬" className={CONTROL} />
          </Field>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved && (
          <p role="status" className="text-sm font-semibold text-primary">
            Saved. The website shows the new details now.
          </p>
        )}
        <Button type="submit" disabled={pending} className="h-11 gap-2 rounded-full px-6 font-bold">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
