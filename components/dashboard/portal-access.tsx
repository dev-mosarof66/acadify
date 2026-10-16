"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { ROLE_LABELS, type InstituteRole } from "@/lib/auth/rbac";
import { grantPortalAccess, revokePortalAccess } from "@/lib/portal/actions";
import { timeAgo } from "@/lib/super-admin/data";
import { cn } from "@/lib/utils";

type Access = { id: string; role: InstituteRole; name: string; email: string; lastActive: string };

const ROLE_ITEMS = [
  { value: "guardian", label: "Guardian" },
  { value: "student", label: "The student" },
];

/** Who can sign in to see this student in the portal, with add and remove for office staff. */
export function PortalAccessPanel({
  studentId,
  studentName,
  guardianName,
  access,
  canEdit,
  now,
}: {
  studentId: string;
  studentName: string;
  guardianName: string;
  access: Access[];
  canEdit: boolean;
  now: number;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string }>();
  const [removing, setRemoving] = React.useState<string | null>(null);

  const remove = async (a: Access) => {
    setRemoving(a.id);
    const r = await revokePortalAccess(a.id);
    setRemoving(null);
    setMessage(r.ok ? { ok: true, text: `${a.name} can no longer see ${studentName}.` } : { ok: false, text: r.error });
    router.refresh();
  };

  return (
    <Panel>
      <PanelHeader
        title="Portal access"
        description="Guardians and the student sign in to see attendance, fees, results and lecture sheets"
        action={
          canEdit ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5 rounded-full px-3 font-bold">
              <Plus className="size-3.5" />
              Give access
            </Button>
          ) : undefined
        }
      />
      {message && (
        <p role={message.ok ? "status" : "alert"} className={cn("border-b border-border px-5 py-3 text-sm font-semibold", message.ok ? "text-primary" : "bg-danger-light text-destructive")}>
          {message.text}
        </p>
      )}
      {access.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nobody has portal access to {studentName} yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {access.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">
                  {a.name} <span className="font-medium text-muted-foreground">({ROLE_LABELS[a.role]})</span>
                </p>
                <p className="text-[13px] break-all text-muted-foreground">{a.email}</p>
              </div>
              <span className="text-[12.5px] text-muted-foreground" suppressHydrationWarning>
                {a.lastActive ? `Active ${timeAgo(a.lastActive, now)}` : "Not signed in yet"}
              </span>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={removing === a.id}
                  onClick={() => remove(a)}
                  aria-label={`Remove ${a.name}'s access`}
                  className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                >
                  {removing === a.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <GrantDialog
          studentId={studentId}
          studentName={studentName}
          guardianName={guardianName}
          onClose={(text) => {
            setAdding(false);
            if (text) setMessage({ ok: true, text });
          }}
        />
      )}
    </Panel>
  );
}

function GrantDialog({ studentId, studentName, guardianName, onClose }: { studentId: string; studentName: string; guardianName: string; onClose: (message?: string) => void }) {
  const router = useRouter();
  const [role, setRole] = React.useState("guardian");
  const [name, setName] = React.useState(guardianName);
  const [error, setError] = React.useState<{ text: string; field?: string }>();
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("role", role);
    startTransition(async () => {
      const r = await grantPortalAccess(studentId, form);
      if (!r.ok) return setError({ text: r.error, field: r.field });
      router.refresh();
      onClose(r.message);
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Give portal access</DialogTitle>
            <DialogDescription>They get an email with how to sign in and see {studentName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <FieldLabel htmlFor="pa-role">Who is it for</FieldLabel>
            <Select
              value={role}
              onValueChange={(v) => {
                const next = (v as string) ?? "guardian";
                setRole(next);
                setName(next === "student" ? studentName : guardianName);
              }}
              items={ROLE_ITEMS}
            >
              <SelectTrigger id="pa-role" aria-invalid={error?.field === "role"} className={cn(CONTROL, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_ITEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="pa-name">Name</FieldLabel>
            <Input id="pa-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error?.field === "name"} className={CONTROL} />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="pa-email">Email</FieldLabel>
            <Input id="pa-email" name="email" type="email" required autoComplete="off" aria-invalid={error?.field === "email"} className={CONTROL} />
          </div>
          <FormError>{error?.text}</FormError>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 rounded-full px-5 font-bold" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending} className="h-11 gap-2 rounded-full px-5 font-bold">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Give access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
