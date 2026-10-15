/**
 * Create (or promote) an Acadify platform super admin.
 *
 *   npm run admin:create                                   # asks for name, email and password
 *   npm run admin:create -- --email you@acadify.app --name "Your Name"   # asks only for the password
 *   npm run admin:create -- --email someone@acadify.app --promote        # existing account -> super admin
 *   npm run admin:create -- --email someone@acadify.app --demote         # super admin -> regular user
 *
 * Options:
 *   --origin <url>   App URL Neon Auth should see (default: APP_URL or http://localhost:3000).
 *                    Must be a trusted domain in Neon Auth; use your production URL in production.
 *
 * The password is never accepted as a command-line flag (it would end up in shell history).
 * Set SUPER_ADMIN_PASSWORD for non-interactive use (e.g. CI), otherwise you are prompted.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "node:readline";
import { sql } from "drizzle-orm";

import { createDb } from "../lib/db/client";

type Args = { email?: string; name?: string; origin?: string; promote: boolean; demote: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { promote: false, demote: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--email") args.email = next();
    else if (a === "--name") args.name = next();
    else if (a === "--origin") args.origin = next();
    else if (a === "--promote") args.promote = true;
    else if (a === "--demote") args.demote = true;
    else if (a === "--password") fail("Don't pass the password as a flag (it stays in shell history). You'll be asked for it, or set SUPER_ADMIN_PASSWORD.");
    else if (a === "--help" || a === "-h") {
      console.log("Usage: npm run admin:create -- [--email <email>] [--name <name>] [--promote | --demote] [--origin <url>]");
      process.exit(0);
    } else fail(`Unknown option: ${a}`);
  }
  return args;
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

/** Prompts without echoing what is typed. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const output = rl as unknown as { _writeToOutput?: (s: string) => void; output: NodeJS.WriteStream };
    const original = output._writeToOutput;
    output._writeToOutput = (s: string) => {
      // Only show the prompt itself, never the typed characters
      if (s.includes(question)) process.stdout.write(question);
    };
    rl.question(question, (answer) => {
      output._writeToOutput = original;
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rule as the app: 8+ chars with lowercase, uppercase, number and special character. */
function passwordProblem(pw: string) {
  if (pw.length < 8) return "at least 8 characters";
  if (!/[a-z]/.test(pw)) return "a lowercase letter";
  if (!/[A-Z]/.test(pw)) return "an uppercase letter";
  if (!/\d/.test(pw)) return "a number";
  if (!/[^\p{L}\p{M}0-9\s]/u.test(pw)) return "a special character (like @ # !)";
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) fail("NEON_AUTH_BASE_URL is missing from .env.local.");
  const origin = (args.origin ?? process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const db = createDb();

  const email = (args.email ?? (await ask("Email: "))).toLowerCase();
  if (!EMAIL.test(email)) fail(`"${email}" is not a valid email address.`);

  const [existing] = (
    await db.execute<{ id: string; name: string; role: string | null; banned: boolean | null }>(
      sql`select id, name, role, banned from neon_auth."user" where lower(email) = ${email} limit 1`
    )
  ).rows;

  // --demote: take super admin rights away (keeps the account)
  if (args.demote) {
    if (!existing) fail(`No account found for ${email}.`);
    const admins = (await db.execute<{ n: number }>(sql`select count(*)::int as n from neon_auth."user" where role = 'admin'`)).rows[0]?.n ?? 0;
    if (existing.role === "admin" && admins <= 1) fail("This is the only super admin. Create another one before demoting it.");
    await db.execute(sql`update neon_auth."user" set role = 'user' where id = ${existing.id}`);
    console.log(`\n✔ ${existing.name} (${email}) is no longer a super admin.`);
    console.log("  Existing sessions keep the old role for up to 5 minutes; sign out to apply it immediately.\n");
    return;
  }

  // Existing account: promote it
  if (existing) {
    if (existing.banned) fail(`${email} is banned in Neon Auth. Unban it first.`);
    if (existing.role === "admin") {
      console.log(`\n✔ ${existing.name} (${email}) is already a super admin. Sign in at ${origin}/login\n`);
      return;
    }
    if (!args.promote) {
      const answer = await ask(`${email} already has an account (${existing.name}). Make it a super admin? [y/N] `);
      if (!/^y(es)?$/i.test(answer)) fail("Cancelled. Nothing was changed.");
    }
    await db.execute(sql`update neon_auth."user" set role = 'admin' where id = ${existing.id}`);
    console.log(`\n✔ ${existing.name} (${email}) is now a super admin. Sign in at ${origin}/login\n`);
    return;
  }

  if (args.promote) fail(`No account found for ${email}. Run without --promote to create one.`);

  // New account: sign up through Neon Auth, then promote
  const name = args.name ?? (await ask("Full name: "));
  if (!name) fail("A name is required.");

  let password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Password (hidden): ");
    const confirm = await askHidden("Repeat password: ");
    if (password !== confirm) fail("The two passwords don't match.");
  }
  const problem = passwordProblem(password);
  if (problem) fail(`The password needs ${problem}.`);

  console.log("\nCreating the account in Neon Auth…");
  const res = await fetch(`${baseUrl}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password, name }),
  });
  const body = (await res.json().catch(() => ({}))) as { user?: { id: string }; code?: string; message?: string };

  if (!res.ok || !body.user?.id) {
    if (body.code === "MISSING_ORIGIN" || body.code === "INVALID_ORIGIN") {
      fail(`Neon Auth rejected the origin ${origin}. Add it under Auth → Trusted domains, or pass --origin <your app URL>.`);
    }
    fail(`Neon Auth refused the sign-up: ${body.message ?? res.statusText} (${body.code ?? res.status}).`);
  }

  await db.execute(sql`update neon_auth."user" set role = 'admin' where id = ${body.user.id}`);
  console.log(`✔ ${name} (${email}) is now a super admin.`);
  console.log(`  Sign in at ${origin}/login`);
  console.log("  If Neon Auth asks for email verification, verify the address from your inbox first.\n");
}

main()
  .catch((err) => fail(err instanceof Error ? err.message : String(err)))
  .finally(() => rl.close());
