"use client";

import { Label } from "@/components/ui/label";

/** Shared by the dashboard's forms: control size, required/optional labels and error banners. */
export const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

export function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
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

export function FormError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
      {children}
    </p>
  );
}

export { SHIFT_LABELS } from "@/lib/ui/labels";
