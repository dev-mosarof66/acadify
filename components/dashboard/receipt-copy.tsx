import { taka } from "@/lib/fees/format";
import { METHOD_LABELS, type getReceipt } from "@/lib/fees/queries";

const WHEN = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** One copy of the receipt. Printed twice on a page: the guardian's copy and the office copy. */
export function ReceiptCopy({ r, label }: { r: NonNullable<Awaited<ReturnType<typeof getReceipt>>>; label: string }) {
  return (
    <article className="grid gap-4 rounded-2xl border bg-card p-6 print:rounded-none print:border-dashed print:p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold">{r.institute.name}</h2>
          <p className="text-[13px] text-muted-foreground">
            {r.institute.district}
            {r.institute.phone && ` · ${r.institute.phone}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="font-extrabold tabular-nums">{r.receiptNo}</p>
          <p className="text-[12.5px] text-muted-foreground">{WHEN.format(new Date(r.paidAt))}</p>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[12px] text-muted-foreground">Student</dt>
          <dd className="font-bold">{r.student.name}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Student ID</dt>
          <dd className="font-semibold tabular-nums">{r.student.code}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Class</dt>
          <dd className="font-semibold">
            {r.student.className} · {r.student.sectionName} · Roll {r.student.roll}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Guardian</dt>
          <dd className="font-semibold">{r.student.guardianName}</dd>
        </div>
      </dl>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[12px] text-muted-foreground">
            <th className="py-1.5 font-semibold">For</th>
            <th className="py-1.5 font-semibold">Bill</th>
            <th className="py-1.5 text-right font-semibold">Paid</th>
          </tr>
        </thead>
        <tbody>
          {r.lines.map((l) => (
            <tr key={l.billNo} className="border-b border-dashed">
              <td className="py-1.5">{l.title}</td>
              <td className="py-1.5 text-muted-foreground tabular-nums">{l.billNo}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums">{taka(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-2 font-bold">
              Total received · {METHOD_LABELS[r.method]}
              {r.reference && <span className="font-normal text-muted-foreground"> · {r.reference}</span>}
            </td>
            <td className="pt-2 text-right text-lg font-extrabold tabular-nums">{taka(r.amount)}</td>
          </tr>
        </tfoot>
      </table>
      <footer className="flex flex-wrap items-end justify-between gap-3 text-[12.5px] text-muted-foreground">
        <p>
          Still owed after this payment: <span className="font-bold text-foreground">{taka(r.remaining)}</span>
          {r.note && <span> · {r.note}</span>}
        </p>
        <p>Received by {r.receivedByName}</p>
      </footer>
    </article>
  );
}

