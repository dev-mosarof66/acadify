"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, Trash2, UserPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel, PanelHeader } from "@/components/super-admin/ui";
import { INSTITUTE_ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type InstituteRole } from "@/lib/auth/rbac";
import { addInstituteMember, removeInstituteMember } from "@/lib/super-admin/actions";
import type { InstituteMemberView } from "@/lib/super-admin/queries";
import { formatDate, timeAgo } from "@/lib/super-admin/data";

const ROLE_ITEMS = INSTITUTE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const CONTROL = "h-11 rounded-xl bg-card text-[14px] md:text-[14px] dark:bg-card";

function AddMemberDialog({ instituteSlug, instituteName }: { instituteSlug: string; instituteName: string }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<InstituteRole>("teacher");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [done, setDone] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("role", role);
    setError(undefined);
    startTransition(async () => {
      const result = await addInstituteMember(instituteSlug, form);
      if (!result.ok) return setError(result.error);
      const name = form.get("name");
      setDone(
        result.created
          ? result.emailed
            ? `Account created. We emailed ${name} a link to set their password.`
            : `Account created, but the welcome email couldn't be sent. Ask ${name} to use "Forgot password?" on the sign-in page.`
          : `${name} already had an account and now has access to ${instituteName}.${result.emailed ? " We let them know by email." : ""}`
      );
    });
  };

  return (
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
      <DialogTrigger render={<Button className="h-9 gap-1.5 rounded-full px-4 font-bold" />}>
        <UserPlus className="size-4" />
        Add person
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give someone access to {instituteName}</DialogTitle>
          <DialogDescription>They sign in at the institute sign-in page with this email.</DialogDescription>
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
          <form method="post" onSubmit={onSubmit} className="grid gap-4" noValidate>
            {error && (
              <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="member-name" className="gap-1 font-bold">
                Full name
                <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input id="member-name" name="name" required autoComplete="off" placeholder="e.g. Farzana Akter" className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-email" className="gap-1 font-bold">
                Email
                <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input id="member-email" name="email" type="email" required autoComplete="off" placeholder="name@example.com" className={CONTROL} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-role" className="gap-1 font-bold">
                Role
                <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as InstituteRole)} items={ROLE_ITEMS}>
                <SelectTrigger id="member-role" className={`${CONTROL} w-full`}>
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
              <p className="text-[12.5px] text-muted-foreground">Can: {ROLE_PERMISSIONS[role].map((p) => p.replace(":", " ")).join(", ")}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-password" className="font-bold">
                Temporary password <span className="font-medium text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="member-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Leave empty to email a set-password link"
                  className={`${CONTROL} pr-12`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1.5 size-9 -translate-y-1/2 rounded-lg text-muted-foreground"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
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
  );
}

export function MembersPanel({
  instituteSlug,
  instituteName,
  members,
  now,
}: {
  instituteSlug: string;
  instituteName: string;
  members: InstituteMemberView[];
  /** Request time from the server, so "5 min ago" matches between server and browser. */
  now: number;
}) {
  const [removing, startRemove] = React.useTransition();
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  return (
    <Panel>
      <PanelHeader
        title="People with access"
        description={`${members.length} ${members.length === 1 ? "person" : "people"} can sign in for this institute`}
        action={<AddMemberDialog instituteSlug={instituteSlug} instituteName={instituteName} />}
      />
      {members.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
          <UsersRound className="size-8 text-muted-foreground" />
          <p className="font-bold">Nobody has access yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add the principal first; they can then run the institute from the dashboard.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-muted-foreground">Name</TableHead>
                <TableHead className="font-bold text-muted-foreground">Role</TableHead>
                <TableHead className="font-bold text-muted-foreground">Last active</TableHead>
                <TableHead className="w-28">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="py-3">
                    <span className="block font-bold">{m.name}</span>
                    <span className="text-[12.5px] text-muted-foreground">{m.email}</span>
                    {m.banned && <span className="ml-2 text-[12px] font-bold text-destructive">Blocked</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full bg-primary-light px-2.5 font-bold text-primary">
                      {ROLE_LABELS[m.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {m.lastActive ? (
                      <time dateTime={m.lastActive} title={formatDate(m.lastActive)} suppressHydrationWarning>
                        {timeAgo(m.lastActive, now)}
                      </time>
                    ) : (
                      "Not signed in yet"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {confirmId === m.id ? (
                      <span className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={removing}
                          onClick={() => startRemove(async () => removeInstituteMember(m.id, instituteSlug))}
                          className="rounded-full"
                        >
                          Remove
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)} className="rounded-full">
                          Keep
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${m.name}'s access`}
                        onClick={() => setConfirmId(m.id)}
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

export default MembersPanel;
