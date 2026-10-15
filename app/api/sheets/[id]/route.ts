import { can } from "@/lib/auth/rbac";
import { assertInstituteMember } from "@/lib/auth/session";
import { signedUrl } from "@/lib/files/storage";
import { canSeeClass } from "@/lib/portal/queries";
import { getSheetFile } from "@/lib/sheets/queries";

/** Downloads a lecture sheet: staff of the institute, or a student/guardian linked to a student in its class. */
export async function GET(_request: Request, { params }: RouteContext<"/api/sheets/[id]">) {
  const me = await assertInstituteMember("self:read").then((m) => m ?? assertInstituteMember("sheets:read"));
  if (!me) return new Response("Not allowed", { status: 403 });

  const { id } = await params;
  const file = await getSheetFile(me.active.instituteId, id);
  if (!file) return new Response("Not found", { status: 404 });
  if (!can(me.active.role, "sheets:read") && !(await canSeeClass(me.active.memberId, file.classId))) return new Response("Not found", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: await signedUrl(file.key, 300), "Cache-Control": "private, max-age=60" },
  });
}
