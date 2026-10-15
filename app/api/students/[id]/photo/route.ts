import { can } from "@/lib/auth/rbac";
import { assertInstituteMember } from "@/lib/auth/session";
import { signedUrl } from "@/lib/files/storage";
import { getStudentPhotoKey } from "@/lib/institute/queries";
import { canSeeStudent } from "@/lib/portal/queries";

/**
 * A student's photo, for staff of that student's institute and the student's own portal accounts.
 * Redirects to a short-lived signed link in the private files bucket.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/students/[id]/photo">) {
  const me = await assertInstituteMember("students:read").then((m) => m ?? assertInstituteMember("self:read"));
  if (!me) return new Response("Not allowed", { status: 403 });

  const { id } = await params;
  if (!can(me.active.role, "students:read") && !(await canSeeStudent(me.active.memberId, id))) return new Response("Not allowed", { status: 403 });
  const key = await getStudentPhotoKey(me.active.instituteId, id);
  if (!key) return new Response("No photo", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: await signedUrl(key, 300), "Cache-Control": "private, max-age=240" },
  });
}
