import { Suspense } from "react";
import { connection } from "next/server";

import { Skeleton } from "@/components/ui/skeleton";
import { KbConsole } from "@/components/super-admin/kb-console";
import { PageHeader } from "@/components/super-admin/ui";
import { readKbSummary } from "@/lib/kb/export";
import { listJobs, toJobView } from "@/lib/kb/jobs";

export const metadata = { title: "Knowledge Base" };

/** Reads job files and kb/ from disk on every request, so it must never be prerendered. */
async function KnowledgeBase() {
  await connection();
  const [jobs, books] = await Promise.all([listJobs(), readKbSummary()]);

  return <KbConsole apiKeySet={!!process.env.LLAMA_CLOUD_API_KEY} canWrite={!process.env.VERCEL} books={books} initialJobs={jobs.map(toJobView)} />;
}

export default function KnowledgeBasePage() {
  return (
    <>
      <PageHeader title="Knowledge Base" description="Upload a textbook PDF and turn it into structured, citable chapters in the kb/ folder." />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <KnowledgeBase />
      </Suspense>
    </>
  );
}
