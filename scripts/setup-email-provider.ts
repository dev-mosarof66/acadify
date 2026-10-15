/**
 * Points Neon Auth's emails (password-reset codes, verification) at Brevo SMTP.
 *
 *   npm run email:setup                              # configure Brevo as the email provider
 *   npm run email:setup -- --test you@example.com    # configure, then send a test email
 *   npm run email:setup -- --status                  # show the current provider (no secrets)
 *
 * Branded auth emails (Acadify's own templates instead of Neon's), once the app is on a public HTTPS domain:
 *   npm run email:setup -- --webhook https://your-domain.com/api/webhooks/neon-auth
 *   npm run email:setup -- --webhook off             # back to Neon's default emails (still sent via Brevo SMTP)
 *
 * Reads from .env.local (nothing is ever printed):
 *   NEON_API_KEY        Neon Console → Account settings → API keys
 *   BREVO_SMTP_LOGIN    Brevo → SMTP & API → SMTP tab → "Login" (looks like 1a2b3c001@smtp-brevo.com)
 *   BREVO_SMTP_KEY      Brevo → SMTP & API → SMTP tab → "Generate a new SMTP key"
 *   EMAIL_FROM          a sender verified in Brevo → Senders, domains & dedicated IPs
 *   EMAIL_FROM_NAME     optional, defaults to "Acadify"
 *   NEON_PROJECT_ID / NEON_BRANCH_ID   optional; found automatically from DATABASE_URL
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const API = "https://console.neon.tech/api/v2";
const BREVO_HOST = "smtp-relay.brevo.com";
const BREVO_PORT = 587;
const APP_NAME = "Acadify";

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function env(name: string, hint: string) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is missing from .env.local. ${hint}`);
  return value;
}

async function neon<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}`, "Content-Type": "application/json", Accept: "application/json", ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (res.status === 401) fail("Neon rejected NEON_API_KEY. Create a new key under Account settings → API keys.");
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.replace(/\?.*/, "")} → ${res.status} ${body.message ?? res.statusText}`);  return body;
}

type Project = { id: string; name: string };
type Endpoint = { id: string; host: string; branch_id: string };

/** Finds the Neon project + branch that DATABASE_URL points at, across the personal account and every org. */
async function findBranch(): Promise<{ projectId: string; branchId: string; projectName: string }> {
  if (process.env.NEON_PROJECT_ID && process.env.NEON_BRANCH_ID) {
    return { projectId: process.env.NEON_PROJECT_ID, branchId: process.env.NEON_BRANCH_ID, projectName: process.env.NEON_PROJECT_ID };
  }

  const dbUrl = env("DATABASE_URL", "It is needed to find your Neon project.");
  // ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech -> ep-cool-name-123456
  const endpointId = new URL(dbUrl).hostname.split(".")[0].replace(/-pooler$/, "");

  const orgs = await neon<{ organizations?: { id: string }[] }>("/users/me/organizations").catch(() => ({ organizations: [] }));
  const scopes = ["", ...(orgs.organizations ?? []).map((o) => `org_id=${encodeURIComponent(o.id)}`)];

  for (const scope of scopes) {
    const list = await neon<{ projects: Project[] }>(`/projects?limit=400${scope ? `&${scope}` : ""}`).catch((err: Error) => {
      // A project-scoped API key can't list projects, but the error names the project it belongs to
      const scoped = /subject_project_id:"([\w-]+)"/.exec(err.message)?.[1] ?? process.env.NEON_PROJECT_ID;
      return { projects: scoped ? [{ id: scoped, name: scoped }] : [] };
    });
    for (const project of list.projects) {
      const { endpoints } = await neon<{ endpoints: Endpoint[] }>(`/projects/${project.id}/endpoints`).catch(() => ({ endpoints: [] }));
      const match = endpoints.find((e) => e.id === endpointId);
      if (match) return { projectId: project.id, branchId: match.branch_id, projectName: project.name };
    }
  }
  fail(
    "Couldn't find the Neon project behind DATABASE_URL with this API key. " +
      "Use a key from the account/org that owns the project, or set NEON_PROJECT_ID and NEON_BRANCH_ID in .env.local."
  );
}

/**
 * Email images must be on a public URL (Gmail fetches them from Google's servers, never from localhost).
 * Uploads public/email/* to a public-read bucket in this Neon branch's object storage.
 */
const ASSET_BUCKET = "acadify-public";
const ASSET_FILES = ["logo.png"];

async function uploadEmailAssets(branchPath: string) {
  const { readFile } = await import("node:fs/promises");
  const storage = env("AWS_ENDPOINT_URL_S3", "It is your branch's storage endpoint (Neon Console → Object storage).");

  const { buckets } = await neon<{ buckets: { name: string; access_level?: string }[] }>(`${branchPath}/buckets`);
  const bucket = buckets.find((b) => b.name === ASSET_BUCKET);
  if (!bucket) {
    await neon(`${branchPath}/buckets`, { method: "POST", body: JSON.stringify({ name: ASSET_BUCKET, access_level: "public_read" }) });
    console.log(`✔ Created public bucket "${ASSET_BUCKET}" (holds email images only)`);
  } else if (bucket.access_level && bucket.access_level !== "public_read") {
    fail(`Bucket "${ASSET_BUCKET}" exists but isn't public. Make it public_read in Neon Console → Object storage, or delete it.`);
  }

  const baseUrl = `${storage.replace(/\/$/, "")}/${ASSET_BUCKET}/email`;
  for (const file of ASSET_FILES) {
    const key = `email/${file}`;
    const signed = await neon<{ url: string; method: string; headers: Record<string, string> }>(
      `${branchPath}/buckets/${ASSET_BUCKET}/objects/${encodeURIComponent(key)}/presign`,
      { method: "POST", body: JSON.stringify({ operation: "upload", content_type: "image/png", expires_in_seconds: 300 }) }
    );
    const put = await fetch(signed.url, { method: signed.method, headers: { "Content-Type": "image/png", ...signed.headers }, body: await readFile(`public/email/${file}`) });
    if (!put.ok) fail(`Upload of ${file} failed: ${put.status} ${await put.text()}`);

    const check = await fetch(`${baseUrl}/${file}`);
    if (!check.ok) fail(`${file} uploaded but isn't publicly readable (${check.status}).`);
    console.log(`✔ ${file} → ${baseUrl}/${file}`);
  }
  console.log(`\nSet this in .env.local (and on the deployed app):\nEMAIL_ASSETS_URL=${baseUrl}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const testIndex = argv.indexOf("--test");
  const testTo = testIndex >= 0 ? argv[testIndex + 1] : undefined;
  if (testIndex >= 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo ?? "")) fail("--test needs an email address, e.g. --test you@example.com");
  const statusOnly = argv.includes("--status");
  const webhookIndex = argv.indexOf("--webhook");
  const webhook = webhookIndex >= 0 ? argv[webhookIndex + 1] : undefined;
  if (webhookIndex >= 0 && webhook !== "off" && !/^https:\/\/[^/\s]+\.[^/\s]+\/\S*$/.test(webhook ?? "")) {
    fail("--webhook needs your public HTTPS URL, e.g. --webhook https://acadify.example.com/api/webhooks/neon-auth (or --webhook off).");
  }

  env("NEON_API_KEY", "Create one in the Neon Console under Account settings → API keys.");
  const { projectId, branchId, projectName } = await findBranch();
  const base = `/projects/${projectId}/branches/${branchId}/auth`;
  console.log(`\nNeon project: ${projectName} (branch ${branchId})`);

  if (argv.includes("--assets")) return uploadEmailAssets(`/projects/${projectId}/branches/${branchId}`);

  if (statusOnly) {
    const current = await neon<{ type?: string; host?: string; sender_email?: string; sender_name?: string }>(`${base}/email_provider`);
    console.log(
      current.type === "standard"
        ? `Email provider: custom SMTP, sending as "${current.sender_name}" <${current.sender_email}>`
        : "Email provider: Neon's shared server (fine for development; set up Brevo before going live)"
    );
    const hook = await neon<{ enabled?: boolean; webhook_url?: string; enabled_events?: string[] }>(`${base}/webhooks`).catch(() => null);
    const branded = hook?.enabled && hook.enabled_events?.includes("send.otp");
    console.log(branded ? `Auth email design: Acadify templates via ${hook!.webhook_url}` : "Auth email design: Neon's default (run with --webhook <url> after deploying)");
    return;
  }

  if (webhook) {
    if (webhook === "off") {
      await neon(`${base}/webhooks`, { method: "PUT", body: JSON.stringify({ enabled: false }) });
      console.log("✔ Webhook off. Neon sends its default auth emails again (through Brevo SMTP).\n");
      return;
    }
    // Make sure the route is live before Neon starts depending on it: an unsigned request must get 401
    const probe = await fetch(webhook, { method: "POST", body: "{}" }).catch(() => null);
    if (probe?.status !== 401) fail(`${webhook} didn't answer like the Acadify webhook (got ${probe?.status ?? "no response"}). Deploy first, then retry.`);
    await neon(`${base}/webhooks`, {
      method: "PUT",
      body: JSON.stringify({ enabled: true, webhook_url: webhook, enabled_events: ["send.otp", "send.magic_link"], timeout_seconds: 8 }),
    });
    console.log(`✔ Verification and reset emails now use Acadify's templates, sent by ${webhook}`);
    console.log("  Make sure BREVO_API_KEY, EMAIL_FROM and NEON_AUTH_BASE_URL are set on the deployed app.\n");
    return;
  }

  const login = env("BREVO_SMTP_LOGIN", "Copy the SMTP login from Brevo → SMTP & API → SMTP.");
  const key = env("BREVO_SMTP_KEY", "Generate an SMTP key in Brevo → SMTP & API → SMTP.");
  const from = env("EMAIL_FROM", "Use a sender address you've verified in Brevo.");
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || APP_NAME;

  await neon(`${base}/email_provider`, {
    method: "PATCH",
    body: JSON.stringify({ type: "standard", host: BREVO_HOST, port: BREVO_PORT, username: login, password: key, sender_email: from, sender_name: fromName }),
  });
  console.log(`✔ Neon Auth now sends through Brevo as "${fromName}" <${from}>`);

  // The name users see in auth emails ("Your Acadify verification code")
  await neon(`${base}/config`, { method: "PATCH", body: JSON.stringify({ name: APP_NAME }) }).catch(() =>
    console.log("  (Couldn't set the app name; change it under Settings → Better Auth → Project Info.)")
  );

  if (testTo) {
    const result = await neon<{ success: boolean; error_message?: string }>(`${base}/email_provider/test`, {
      method: "POST",
      body: JSON.stringify({ recipient_email: testTo }),
    });
    if (!result.success) fail(`Brevo refused the test email: ${result.error_message ?? "unknown error"}. Check the SMTP login, key and that EMAIL_FROM is a verified sender.`);
    console.log(`✔ Test email sent to ${testTo}`);
  }
  console.log("");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
