import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { can } from "@/lib/auth/rbac";
import { assertInstituteMember } from "@/lib/auth/session";
import { signedUrl } from "@/lib/files/storage";
import { canSeeClass } from "@/lib/portal/queries";
import { getSheetFile } from "@/lib/sheets/queries";

/** Helvetica can only draw Latin characters; anything else (e.g. a Bangla name) is dropped and the email stands in. */
const latin = (s: string) => s.replace(/[^\x20-\x7E]/g, "").trim();

/** Stamps who downloaded the sheet across every page, so a leaked copy can be traced. */
async function stamp(bytes: ArrayBuffer, label: string) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(10, Math.min(width, height) / 28);
    const w = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: width / 2 - (w / 2) * Math.SQRT1_2, y: height / 2 - (w / 2) * Math.SQRT1_2, size, font, color: rgb(0.5, 0.5, 0.5), opacity: 0.22, rotate: degrees(45) });
    page.drawText(label, { x: 24, y: 14, size: 8, font, color: rgb(0.4, 0.4, 0.4), opacity: 0.7 });
  }
  return pdf.save();
}

/** Downloads a lecture sheet: staff of the institute, or a student/guardian linked to a student in its class. Students and guardians get PDFs stamped with their name. */
export async function GET(_request: Request, { params }: RouteContext<"/api/sheets/[id]">) {
  const me = await assertInstituteMember("self:read").then((m) => m ?? assertInstituteMember("sheets:read"));
  if (!me) return new Response("Not allowed", { status: 403 });

  const { id } = await params;
  const file = await getSheetFile(me.active.instituteId, id);
  if (!file) return new Response("Not found", { status: 404 });
  const staff = can(me.active.role, "sheets:read");
  if (!staff && !(await canSeeClass(me.active.memberId, file.classId))) return new Response("Not found", { status: 404 });

  const url = await signedUrl(file.key, 300);
  if (!staff && /\.pdf$/i.test(file.fileName)) {
    try {
      const source = await fetch(url);
      if (source.ok) {
        const who = latin(me.name) || latin(me.email.split("@")[0]) || "student";
        const label = `Downloaded by ${who} (${latin(me.email)}) - ${new Date().toISOString().slice(0, 10)} - ${latin(me.active.instituteName) || "Acadify"}`;
        const out = await stamp(await source.arrayBuffer(), label);
        return new Response(Buffer.from(out), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
            "Cache-Control": "private, no-store",
          },
        });
      }
    } catch {
      // Unreadable or damaged PDF: fall through to the plain download rather than block the student.
    }
  }

  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=60" } });
}
