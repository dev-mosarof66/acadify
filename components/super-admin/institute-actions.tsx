"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, ChevronDown, CircleCheck, Clock, Hourglass, Loader2, Pencil, Plus } from "lucide-react";

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InstituteFormDialog, institutePrefill, type InstitutePrefill } from "@/components/super-admin/institute-form-dialog";
import { setInstituteStatus } from "@/lib/super-admin/actions";
import { STATUS_LABELS, type Institute, type InstituteStatus, type Plan } from "@/lib/super-admin/data";

/** "Add institute" button for the Institutes page. Opens by itself when arriving from a demo request. */
export function AddInstituteButton({
  prefill,
  fromDemo,
  className,
  plans,
  trialDays,
}: {
  prefill?: InstitutePrefill;
  fromDemo?: number;
  className?: string;
  plans: Plan[];
  trialDays: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(Boolean(fromDemo));

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className ?? "h-10 gap-1.5 rounded-full px-4 font-bold"}>
        <Plus className="size-4" />
        Add institute
      </Button>
      <InstituteFormDialog
        // Remount per demo request so the form starts from its details
        key={fromDemo ?? "new"}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          // Drop ?from= so a refresh doesn't reopen the form
          if (!o && fromDemo) router.replace("/admin/institutes");
        }}
        initial={prefill}
        fromDemo={fromDemo}
        plans={plans}
        trialDays={trialDays}
      />
    </>
  );
}

const STATUS_ACTIONS: { status: InstituteStatus; label: string; icon: React.ElementType; description: string }[] = [
  { status: "active", label: "Activate", icon: CircleCheck, description: "Paying and in good standing." },
  { status: "trial", label: "Back on trial", icon: Hourglass, description: "Free Trial plan only." },
  { status: "past_due", label: "Mark past due", icon: Clock, description: "A payment is late; access continues." },
  { status: "suspended", label: "Suspend", icon: Ban, description: "Stops revenue for this institute." },
];

/** Edit details + change status, for the institute detail page header. */
export function InstituteActions({ institute, plans, trialDays }: { institute: Institute; plans: Plan[]; trialDays: number }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirmSuspend, setConfirmSuspend] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const change = (status: InstituteStatus) => {
    setError(undefined);
    startTransition(async () => {
      const result = await setInstituteStatus(institute.slug, status);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  };

  const choices = STATUS_ACTIONS.filter((a) => a.status !== institute.status && (a.status !== "trial" || institute.plan === "trial"));

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setEditing(true)} className="h-10 gap-2 rounded-full px-4 font-bold">
          <Pencil className="size-4" />
          Edit details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" disabled={pending} className="h-10 gap-2 rounded-full px-4 font-bold" />}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Status: {STATUS_LABELS[institute.status]}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Change status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {choices.map((a) => (
              <DropdownMenuItem
                key={a.status}
                variant={a.status === "suspended" ? "destructive" : "default"}
                onClick={() => (a.status === "suspended" ? setConfirmSuspend(true) : change(a.status))}
                className="items-start gap-2.5 py-2"
              >
                <a.icon className="mt-0.5 size-4" />
                <span className="grid">
                  <span className="font-semibold">{a.label}</span>
                  <span className="text-[12px] text-muted-foreground">{a.description}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-destructive">
          {error}
        </p>
      )}

      <InstituteFormDialog open={editing} onOpenChange={setEditing} slug={institute.slug} initial={institutePrefill(institute)} plans={plans} trialDays={trialDays} />

      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {institute.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its monthly revenue drops to ৳0 and it shows as suspended everywhere. You can reactivate it any time from this menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmSuspend(false);
                change("suspended");
              }}
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
