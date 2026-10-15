import "server-only";

import { notFound } from "next/navigation";

import { requireInstituteMember } from "@/lib/auth/session";
import { canSeeStudent } from "./queries";

/** The signed-in student or guardian, if this student is linked to them; otherwise a 404. */
export async function requirePortalStudent(studentId: string) {
  const viewer = await requireInstituteMember("self:read");
  if (!(await canSeeStudent(viewer.active.memberId, studentId))) notFound();
  return viewer;
}
