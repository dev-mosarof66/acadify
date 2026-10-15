"use client";

import Link from "next/link";
import { ExternalLink, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Avatar menu with the signed-in user's name, role and a real sign-out. */
export function AccountMenu({ name, email, roleLabel, area }: { name: string; email: string; roleLabel: string; area: "admin" | "user" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <Avatar className="size-10">
          <AvatarFallback className="bg-primary font-bold text-primary-foreground">{initialsOf(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5">
            <span className="truncate font-bold text-foreground">{name}</span>
            <span className="truncate text-xs font-normal">{email}</span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              {area === "admin" ? <ShieldCheck className="size-3.5" /> : <UserRound className="size-3.5" />}
              {roleLabel}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>
          <ExternalLink />
          View website
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => signOutAction()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountMenu;
