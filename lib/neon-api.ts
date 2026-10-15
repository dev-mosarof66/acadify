import "server-only";

/**
 * Calls the Neon management API for this app's own project and branch
 * (NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH_ID), e.g. to create sign-in accounts or sign file uploads.
 */
export async function neonBranchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  const branch = process.env.NEON_BRANCH_ID;
  if (!key || !project || !branch) throw new Error("NEON_API_KEY, NEON_PROJECT_ID and NEON_BRANCH_ID must be set.");

  const res = await fetch(`https://console.neon.tech/api/v2/projects/${project}/branches/${branch}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Neon API ${res.status}: ${body.message ?? res.statusText}`);
  return body;
}
