import { NextResponse } from "next/server";

import { assertSuperAdmin } from "@/lib/auth/session";
import { searchKb, type SearchFilters } from "@/lib/kb/search";

/**
 * Super admin only: try the knowledge-base search.
 *   GET /api/admin/kb/search?q=বেগ কাকে বলে&subject=physics&chapter=2,3&pool=lesson&limit=8&mode=hybrid
 * Returns the best passages with where each comes from (book, chapter, topic, pages).
 */
export async function GET(request: Request) {
  try {
    await assertSuperAdmin();
  } catch {
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (!query || query.length > 500) return NextResponse.json({ error: "Give a search text of up to 500 characters in q." }, { status: 400 });

  const filters: SearchFilters = {
    subject: searchParams.get("subject") ?? undefined,
    classLevel: searchParams.get("class") ?? undefined,
    pool: searchParams.get("pool") === "exercise" ? "exercise" : "lesson",
    topic: searchParams.get("topic") ?? undefined,
  };
  const chapters = (searchParams.get("chapter") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (chapters.length) filters.chapter = chapters;
  const mode = searchParams.get("mode");
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit")) || 8));

  try {
    const result = await searchKb(query, { filters, limit, mode: mode === "lexical" || mode === "vector" ? mode : "hybrid" });
    return NextResponse.json({
      mode: result.mode,
      warning: result.warning,
      hits: result.hits.map((h) => ({ id: h.item.id, book: h.item.book, chapter: h.item.chapter, chapterTitle: h.item.chapterTitle, topic: h.item.topic, topicTitle: h.item.topicTitle, pages: h.item.pages, score: h.score, vectorRank: h.vectorRank, lexicalRank: h.lexicalRank, text: h.item.text })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed." }, { status: 500 });
  }
}
