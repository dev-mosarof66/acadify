import "server-only";

import { neonBranchApi } from "@/lib/neon-api";

/*
 * Private files (student photos, later documents) in the Neon branch's object storage.
 * The bucket is private: files are shown through short-lived signed links from an app route that
 * checks the viewer's permission first.
 */

export const FILES_BUCKET = "acadify-files";

type Signed = { url: string; method: string; headers: Record<string, string> };

let bucketReady: Promise<void> | null = null;

/** Creates the private bucket the first time it's needed. */
function ensureBucket() {
  bucketReady ??= (async () => {
    const { buckets } = await neonBranchApi<{ buckets: { name: string }[] }>("/buckets");
    if (!buckets.some((b) => b.name === FILES_BUCKET)) {
      await neonBranchApi("/buckets", { method: "POST", body: JSON.stringify({ name: FILES_BUCKET, access_level: "private" }) });
    }
  })().catch((err) => {
    bucketReady = null;
    throw err;
  });
  return bucketReady;
}

const objectPath = (key: string) => `/buckets/${FILES_BUCKET}/objects/${encodeURIComponent(key)}`;

export async function putObject(key: string, body: ArrayBuffer, contentType: string) {
  await ensureBucket();
  const signed = await neonBranchApi<Signed>(`${objectPath(key)}/presign`, {
    method: "POST",
    body: JSON.stringify({ operation: "upload", content_type: contentType, expires_in_seconds: 300 }),
  });
  const res = await fetch(signed.url, { method: signed.method, headers: { "Content-Type": contentType, ...signed.headers }, body });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

/** A download link valid for `seconds` (default 5 minutes). */
export async function signedUrl(key: string, seconds = 300) {
  const signed = await neonBranchApi<Signed>(`${objectPath(key)}/presign`, {
    method: "POST",
    body: JSON.stringify({ operation: "download", expires_in_seconds: seconds }),
  });
  return signed.url;
}

export async function deleteObject(key: string) {
  await neonBranchApi(objectPath(key), { method: "DELETE" }).catch(() => undefined);
}
