import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { ChapterRow } from "@/components/super-admin/kb-chapter";
import { PageHeader, Panel, PanelHeader } from "@/components/super-admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { readKbSummary } from "@/lib/kb/export";
import { groupKey, subjectName, versionLabel } from "@/lib/kb/labels";

export const metadata = { title: "Knowledge Base" };

const BackButton = ({ href, label }: { href: string; label: string }) => (
  <Button variant="outline" nativeButton={false} render={<Link href={href} />} className="rounded-xl">
    <ArrowLeft />
    {label}
  </Button>
);

/** One book's chapters, each opening to its extracted content. Read from the kb/ files on every request. */
async function Book({ params }: { params: Promise<{ path: string[] }> }) {
  await connection();
  const { path } = await params;
  const slug = path.map(decodeURIComponent).join("/");
  const book = (await readKbSummary()).find((b) => b.slug === slug);
  if (!book) notFound();

  const passages = book.chapters.reduce((n, c) => n + c.passages, 0);
  const review = book.chapters.reduce((n, c) => n + c.needsReview, 0);

  return (
    <>
      <PageHeader
        title={subjectName(book.subject)}
        description={`${versionLabel(book)} · ${book.chapters.length} ${book.chapters.length === 1 ? "chapter" : "chapters"} · ${passages} passages · ${review} to review`}
        actions={<BackButton href={`/admin/knowledge-base/versions/${groupKey(book)}`} label={versionLabel(book)} />}
      />
      <Panel>
        <PanelHeader title="Chapters" description="Open a chapter to read what was extracted." />
        <ul className="grid gap-3 px-5 py-4 text-[13px]">
          {book.chapters.map((c) => (
            <ChapterRow key={c.number} dir={book.dir} number={c.number} title={c.title} summary={`${c.passages} passages · ${c.needsReview} to review`} />
          ))}
        </ul>
      </Panel>
    </>
  );
}

export default function BookPage({ params }: { params: Promise<{ path: string[] }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Book params={params} />
    </Suspense>
  );
}
