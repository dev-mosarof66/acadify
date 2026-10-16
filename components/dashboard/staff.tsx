"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus, UserRoundCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/super-admin/ui";
import { CONTROL, FieldLabel, FormError } from "@/components/dashboard/form-bits";
import { ROLE_PERMISSIONS, roleLabel, type InstituteRole } from "@/lib/auth/rbac";
import { addStaff, removeStaff } from "@/lib/institute/actions";
import type { StaffRow } from "@/lib/institute/queries";
import { formatDate, timeAgo } from "@/lib/super-admin/data";

/** What each role can do, in plain words, for the role picker. */
const ROLE_HINTS: Partial<Record<InstituteRole, string>> = {
  institute_admin: "Runs the institute day to day: students, classes, staff, fees and exams.",
  accountant: "Collects and manages fees, sees finance reports.",
  teacher: "Takes attendance, enters marks and hifz progress for their classes.",
};

export function AddStaffButton({ roles, instituteType }: { roles: InstituteRole[]; instituteType: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<InstituteRole>(roles.includes("teacher") ? "teacher" : roles[0]);
  const [error, setError] = React.useState<{ message: string; field?: string }>();
  const [done, setDone] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const items = roles.map((r) => ({ value: r, label: roleLabel(r, instituteType) }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("role", role);
    setError(undefined);
    startTransition(async () => {
      const r = await addStaff(form);
      if (!r.ok) {
        setError({ message: r.error, field: r.field });
        if (r.field) document.getElementById(`staff-${r.field}`)?.focus();
        return;
      }
      setDone(r.message);
      router.refresh();
    });
  };

  if (!roles.length) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-10 gap-1.5 rounded-full px-4 font-bold">
        <UserPlus className="size-4" />
        Add staff
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setError(undefined);
            setDone(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Give a staff member access</DialogTitle>
            <DialogDescription>They get an email with a link to set their password, then sign in with this email.</DialogDescription>
          </DialogHeader>
          {done ? (
            <div className="grid gap-4">
              <p role="status" className="rounded-xl bg-primary-light px-4 py-3 text-sm font-semibold text-primary">
                {done}
              </p>
              <DialogFooter>
                <DialogClose render={<Button className="rounded-full px-5 font-bold" />}>Done</DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <form method="post" onSubmit={onSubmit} noValidate className="grid gap-4">
              <FormError>{error?.message}</FormError>
              <div className="grid gap-2">
                <FieldLabel htmlFor="staff-name">Full name</FieldLabel>
                <Input id="staff-name" name="name" autoFocus autoComplete="off" className={CONTROL} aria-invalid={error?.field === "name" || undefined} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                <Input id="staff-email" name="email" type="email" autoComplete="off" placeholder="name@example.com" className={CONTROL} aria-invalid={error?.field === "email" || undefined} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="staff-role">Role</FieldLabel>
                <Select value={role} onValueChange={(v) => v && setRole(v as InstituteRole)} items={items}>
                  <SelectTrigger id="staff-role" className={`${CONTROL} w-full`}>
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
                <p className="text-[12.5px] text-muted-foreground">{ROLE_HINTS[role] ?? `${ROLE_PERMISSIONS[role].length} permissions`}</p>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" className="rounded-full px-5" />}>Cancel</DialogClose>
                <Button type="submit" disabled={pending} className="gap-2 rounded-full px-5 font-bold">
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Give access
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function StaffTable({ staff, me, removable, now, instituteType }: { staff: StaffRow[]; me: string; removable: InstituteRole[]; now: number; instituteType: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const remove = (memberId: string) =>
    startTransition(async () => {
      const r = await removeStaff(memberId);
      if (!r.ok) setError(r.error);
      setConfirm(null);
      router.refresh();
    });

  if (staff.length === 0) {
    return (
      <Panel>
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <UserRoundCog className="size-8 text-muted-foreground" />
          <p className="font-bold">Nobody else has access yet</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      {error && (
        <p role="alert" className="border-b border-border bg-danger-light px-5 py-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 font-bold text-muted-foreground">Name</TableHead>
              <TableHead className="font-bold text-muted-foreground">Role</TableHead>
              <TableHead className="font-bold text-muted-foreground">Last active</TableHead>
              <TableHead className="w-40">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => {
              const self = s.userId === me;
              const canRemove = !self && removable.includes(s.role);
              return (
                <TableRow key={s.memberId}>
                  <TableCell className="py-3 pl-5">
                    <span className="block font-bold">
                      {s.name}
                      {self && <span className="ml-1.5 text-[12px] font-semibold text-muted-foreground">(you)</span>}
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">{s.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full bg-primary-light px-2.5 font-bold text-primary">
                      {roleLabel(s.role, instituteType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {s.lastActive ? (
                      <time dateTime={s.lastActive} title={formatDate(s.lastActive)} suppressHydrationWarning>
                        {timeAgo(s.lastActive, now)}
                      </time>
                    ) : (
                      "Not signed in yet"
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {canRemove &&
                      (confirm === s.memberId ? (
                        <span className="inline-flex gap-1">
                          <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(s.memberId)} className="rounded-full">
                            Remove
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} className="rounded-full">
                            Keep
                          </Button>
                        </span>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${s.name}'s access`}
                          onClick={() => setConfirm(s.memberId)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}
