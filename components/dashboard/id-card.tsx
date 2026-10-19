import QRCode from "react-qr-code";

import type { StudentRow } from "@/lib/institute/queries";

/** One printable student ID card (CR80 proportions). The QR opens the public verification page. */
export function IdCard({ student, instituteName, verifyUrl }: { student: StudentRow; instituteName: string; verifyUrl: string }) {
  return (
    <div className="flex h-[54mm] w-[86mm] break-inside-avoid flex-col overflow-hidden rounded-lg border border-border bg-white text-black">
      <div className="bg-primary px-3 py-1.5 text-center text-[11px] font-extrabold text-primary-foreground">{instituteName}</div>
      <div className="flex flex-1 gap-3 p-2.5">
        <div className="grid shrink-0 content-start justify-items-center gap-1">
          <div className="size-[22mm] overflow-hidden rounded-md border border-border bg-secondary">
            {student.hasPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/students/${student.id}/photo`} alt="" className="size-full object-cover" />
            )}
          </div>
          <span className="text-[9px] font-bold">ID {student.studentCode}</span>
        </div>
        <div className="grid min-w-0 flex-1 content-start gap-0.5 text-[10px] leading-tight">
          <p className="text-[12px] font-extrabold break-words">{student.name}</p>
          {student.nameBn && <p className="break-words">{student.nameBn}</p>}
          <p>
            {student.className} · Sec {student.sectionName} · Roll {student.roll}
          </p>
          <p className="text-muted-foreground">Guardian: {student.guardianName}</p>
          <p className="text-muted-foreground">{student.guardianPhone}</p>
        </div>
        <div className="shrink-0 self-end">
          <QRCode value={verifyUrl} size={64} />
        </div>
      </div>
    </div>
  );
}
