import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { KbCard } from "@/components/super-admin/kb-card";
import { PageHeader } from "@/components/super-admin/ui";
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {group.books.map((b) => {
          const review = b.chapters.reduce((n, c) => n + c.needsReview, 0);
          return (
            <KbCard
              key={b.dir}
              href={`/admin/knowledge-base/books/${b.slug}`}
              title={subjectName(b.subject)}
              subtitle={versionLabel(b)}
              stats={[{ label: `${b.chapters.length} ${b.chapters.length === 1 ? "chapter" : "chapters"}` }, ...(review ? [{ label: `${review} to review`, warn: true }] : [])]}
            />
          );
        })}
      </div>
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
