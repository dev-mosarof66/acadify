import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { PageHeader, Panel, PanelHeader } from "@/components/super-admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readKbSummary } from "@/lib/kb/export";
import { groupBooks, subjectName, versionLabel } from "@/lib/kb/labels";

export const metadata = { title: "Knowledge Base" };

type Params = Promise<{ level: string; language: string }>;

/** The subjects of one class and version, read from the kb/ files on every request. */
async function Subjects({ params }: { params: Params }) {
  await connection();
  const { level, language } = await params;
  const key = `${decodeURIComponent(level)}/${decodeURIComponent(language)}`;
  const group = groupBooks(await readKbSummary()).find((g) => g.key === key);
  if (!group) notFound();

  return (
    <>
      <PageHeader
        title={versionLabel(group)}
        description={`${group.books.length} ${group.books.length === 1 ? "subject" : "subjects"}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/knowledge-base" />} className="rounded-xl">
            <ArrowLeft />
            Knowledge Base
          </Button>
        }
      />
      <Panel>
        <PanelHeader title="Subjects" description="Open a subject to read its chapters." />
        <ul>
          {group.books.map((b) => {
            const passages = b.chapters.reduce((n, c) => n + c.passages, 0);
            const review = b.chapters.reduce((n, c) => n + c.needsReview, 0);
            return (
              <li key={b.dir} className="border-b border-border last:border-b-0">
                <Link href={`/admin/knowledge-base/books/${b.slug}`} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold">{subjectName(b.subject)}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {b.chapters.length} {b.chapters.length === 1 ? "chapter" : "chapters"} · {passages} passages · {review} to review
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

export default function VersionPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Subjects params={params} />
    </Suspense>
  );
}
