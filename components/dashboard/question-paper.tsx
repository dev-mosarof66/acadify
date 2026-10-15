import { CQ_MARKS, CQ_PARTS, mcqsForSet, paperNumber, SET_NAMES, totalMarks, type Paper, type PaperParams } from "@/lib/ai/paper";
import { cn } from "@/lib/utils";

/** Words printed on the paper, in the paper's language. */
const WORDS = {
  bn: {
    cq: "সৃজনশীল প্রশ্ন",
    mcq: "বহুনির্বাচনি প্রশ্ন",
    time: "সময়",
    minutes: "মিনিট",
    full: "পূর্ণমান",
    set: "সেট",
    anyN: (n: string) => `যেকোনো ${n}টি প্রশ্নের উত্তর দাও।`,
    allMcq: "সকল প্রশ্নের উত্তর দিতে হবে। প্রতিটি প্রশ্নের মান ১।",
    key: "উত্তরমালা",
    guide: "নম্বর প্রদান নির্দেশনা",
    options: ["ক", "খ", "গ", "ঘ"],
  },
  en: {
    cq: "Creative questions",
    mcq: "Multiple choice questions",
    time: "Time",
    minutes: "minutes",
    full: "Full marks",
    set: "Set",
    anyN: (n: string) => `Answer any ${n} questions.`,
    allMcq: "Answer all questions. Each question carries 1 mark.",
    key: "Answer key",
    guide: "Marking guide",
    options: ["a", "b", "c", "d"],
  },
} as const;

/**
 * A question paper (or its answer key) as it prints: header, creative questions, then MCQs.
 * `set` picks the MCQ order (0 = Ka); `seed` keeps each set's order stable.
 */
export function QuestionPaper({
  paper,
  params,
  instituteName,
  set = 0,
  seed = 0,
  answerKey = false,
}: {
  paper: Paper;
  params: PaperParams;
  instituteName: string;
  set?: number;
  seed?: number;
  answerKey?: boolean;
}) {
  const lang = params.language;
  const w = WORDS[lang];
  const n = (v: number) => paperNumber(v, lang);
  const mcq = mcqsForSet(paper.mcq, set, seed);
  const setName = params.sets > 1 ? SET_NAMES[set]?.[lang] : null;

  return (
    <article lang={lang === "bn" ? "bn" : "en"} className={cn("mx-auto grid w-full max-w-[800px] gap-6 rounded-2xl bg-card p-6 text-[15px] leading-relaxed text-foreground ring-1 ring-border sm:p-10 print:max-w-none print:rounded-none print:p-0 print:ring-0", lang === "bn" && "font-bengali")}>
      <header className="grid gap-1 border-b border-border pb-4 text-center">
        <p className="text-lg font-extrabold">{instituteName}</p>
        <p className="font-bold">{params.examName}</p>
        <p>
          {params.className} · {params.subjectName}
          {answerKey && ` · ${w.key}`}
        </p>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm font-semibold">
          <span>
            {w.time}: {n(params.minutes)} {w.minutes}
          </span>
          {setName && (
            <span className="rounded-md border border-foreground px-2">
              {w.set}: {setName}
            </span>
          )}
          <span>
            {w.full}: {n(totalMarks(params))}
          </span>
        </div>
      </header>

      {paper.cq.length > 0 && (
        <section className="grid gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-extrabold">{w.cq}</h2>
            <span className="text-sm font-semibold">
              {n(params.cqToAnswer)} × {n(CQ_MARKS)} = {n(params.cqToAnswer * CQ_MARKS)}
            </span>
          </div>
          {!answerKey && params.cqToAnswer < paper.cq.length && <p className="text-sm italic">{w.anyN(n(params.cqToAnswer))}</p>}
          <ol className="grid gap-5">
            {paper.cq.map((q, i) => (
              <li key={i} className="grid gap-2 break-inside-avoid">
                <p className="whitespace-pre-line">
                  <span className="font-bold">{n(i + 1)}. </span>
                  {q.stimulus}
                </p>
                <ul className="grid gap-1 ps-5">
                  {q.parts.map((p, j) => (
                    <li key={j} className="grid gap-0.5">
                      <div className="flex justify-between gap-4">
                        <span>
                          <span className="font-semibold">{lang === "bn" ? CQ_PARTS[j]?.bn : CQ_PARTS[j]?.key}. </span>
                          {p.question}
                        </span>
                        <span className="shrink-0 font-semibold">{n(CQ_PARTS[j]?.marks ?? 0)}</span>
                      </div>
                      {answerKey && <p className="text-sm text-muted-foreground print:text-foreground">{w.guide}: {p.answerGuide}</p>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {mcq.length > 0 && (
        <section className="grid gap-4 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-extrabold">{w.mcq}</h2>
            <span className="text-sm font-semibold">
              {n(mcq.length)} × {n(1)} = {n(mcq.length)}
            </span>
          </div>
          {answerKey ? (
            <ol className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {mcq.map((q, i) => (
                <li key={i} className="font-semibold">
                  {n(i + 1)}. {w.options[q.correctIndex] ?? "?"}
                </li>
              ))}
            </ol>
          ) : (
            <>
              <p className="text-sm italic">{w.allMcq}</p>
              <ol className="grid gap-3">
                {mcq.map((q, i) => (
                  <li key={i} className="grid gap-1 break-inside-avoid">
                    <p>
                      <span className="font-bold">{n(i + 1)}. </span>
                      {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 ps-5">
                      {q.options.map((o, j) => (
                        <span key={j}>
                          ({w.options[j]}) {o}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </article>
  );
}
