import { NextResponse } from "next/server";

import { assertSuperAdmin } from "@/lib/auth/session";
import { readKbAsset } from "@/lib/kb/export";

/** Super admin only: one picture from an exported chapter's assets/ folder, for the dashboard's chapter viewer. */
export async function GET(request: Request) {
  try {
    await assertSuperAdmin();
  } catch {
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const asset = await readKbAsset(searchParams.get("dir") ?? "", Number(searchParams.get("chapter")), searchParams.get("file") ?? "");
  if (!asset) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(asset.data), {
    headers: { "Content-Type": asset.type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
  });
}
