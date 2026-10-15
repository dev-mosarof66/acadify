import "server-only";

import { roleLabel, type InstituteRole } from "@/lib/auth/rbac";

/*
 * Acadify email templates. Table-based with inline styles so they render the same in Gmail, Outlook and phone apps.
 * Designs: "Acadify Email Templates" canvas (verification, reset, welcome, demo confirmation, demo alert).
 */

export type Email = { subject: string; html: string; text: string };

const C = {
  ground: "#F2F5F0",
  card: "#FFFFFF",
  line: "#E1E8DE",
  ink: "#1A2B1A",
  muted: "#56645A",
  button: "#277A27",
  dark: "#1F5F1F",
  tint: "#E6F4E0",
  amber: "#F5B301",
  amberInk: "#3D2C00",
  highlight: "#FFE7A3",
  warnBg: "#FFF6DC",
  warnInk: "#5C4100",
};
const FONT = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";
const BN = "'Noto Sans Bengali','Hind Siliguri',sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const DHAKA = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const dhakaTime = (d: Date) => DHAKA.format(d).replace(/ (am|pm)$/i, (m) => m.toUpperCase());

/** "Chrome on Windows" from a user-agent string; null when it can't tell. */
export function describeDevice(ua?: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}

/** "Expires in 60 seconds" / "Expires in 10 minutes", from an expiry time. */
function expiryText(expiresAt?: string | Date | null) {
  const ms = expiresAt ? new Date(expiresAt).getTime() - Date.now() : NaN;
  if (!Number.isFinite(ms)) return "Expires soon";
  if (ms < 120_000) return `Expires in ${Math.max(1, Math.round(ms / 10_000) * 10)} seconds`;
  const mins = Math.round(ms / 60_000);
  return `Expires in ${mins} minutes`;
}

/* ---------------------------------------------------------------- building blocks */

const p = (html: string, opts: { muted?: boolean; size?: number; top?: number } = {}) =>
  `<p style="margin:${opts.top ?? 0}px 0 0;font-family:${FONT};font-size:${opts.size ?? 15}px;line-height:1.6;color:${opts.muted ? C.muted : C.ink}">${html}</p>`;

const gap = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;

function heading(title: string, bangla?: string, color: string = C.ink, banglaColor: string = C.muted) {
  return (
    `<h1 style="margin:0;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${color}">${esc(title)}</h1>` +
    (bangla ? `<p style="margin:6px 0 0;font-family:${BN};font-size:14px;color:${banglaColor}">${bangla}</p>` : "")
  );
}

function button(label: string, href: string, variant: "solid" | "outline" = "solid") {
  const solid = variant === "solid";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table"><tr><td style="border-radius:999px;background:${solid ? C.button : C.card};${solid ? "" : `border:1.5px solid #B9D3B0;`}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:${solid ? "#FFFFFF" : C.dark};text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
}

/** Two-column label/value list. */
function details(rows: [string, string | null | undefined][], opts: { boxed?: "line" | "fill"; labelWidth?: number } = {}) {
  const trs = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td width="${opts.labelWidth ?? 100}" style="padding:4px 12px 4px 0;font-family:${FONT};font-size:13.5px;color:${C.muted};vertical-align:top">${esc(k)}</td><td style="padding:4px 0;font-family:${FONT};font-size:13.5px;font-weight:600;color:${C.ink};vertical-align:top">${esc(v!)}</td></tr>`
    )
    .join("");
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${trs}</table>`;
  if (!opts.boxed) return table;
  const box = opts.boxed === "fill" ? `background:${C.ground};` : `border:1px solid ${C.line};`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${box}border-radius:14px;padding:12px 16px">${table}</td></tr></table>`;
}

function codeBox(code: string, expiry: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:${C.tint};border-radius:16px;padding:22px 16px">
<div style="font-family:${MONO};font-size:38px;font-weight:700;letter-spacing:0.32em;color:${C.dark};padding-left:0.32em">${esc(code)}</div>
<div style="margin-top:8px;font-family:${FONT};font-size:13px;font-weight:600;color:${C.dark}">${esc(expiry)}</div></td></tr></table>`;
}

function notice(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.warnBg};border-radius:14px;padding:14px 16px;font-family:${FONT};font-size:13.5px;line-height:1.55;color:${C.warnInk}">${html}</td></tr></table>`;
}

const divider = (html: string) =>
  `<div style="border-top:1px solid ${C.line};padding-top:16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">${html}</div>`;

const label = (s: string) => `<div style="font-family:${FONT};font-size:12.5px;font-weight:800;letter-spacing:0.04em;color:${C.muted}">${esc(s)}</div>`;

const check = (s: string) =>
  `<tr><td width="26" style="padding:4px 0;font-family:${FONT};font-size:15px;font-weight:800;color:${C.button};vertical-align:top">&#10003;</td><td style="padding:4px 0;font-family:${FONT};font-size:14.5px;color:${C.ink}">${esc(s)}</td></tr>`;

/**
 * Page shell: logo row, white card, footer. `band` renders a colored header strip inside the card.
 * `preheader` is the grey preview line inboxes show next to the subject.
 */
function shell(o: { preheader: string; body: string; band?: string; footer: string[]; tag?: string }) {
  // Inboxes fetch images from their own servers, so this must be public (never localhost)
  const logo = `${(process.env.EMAIL_ASSETS_URL ?? `${appUrl()}/email`).replace(/\/$/, "")}/logo.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Acadify</title></head>
<body style="margin:0;padding:0;background:${C.ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.ground}">${esc(o.preheader)}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ground}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 4px 20px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="46" style="vertical-align:middle"><img src="${logo}" width="36" height="36" alt="Acadify" style="display:block;border:0"></td>
    <td style="vertical-align:middle;font-family:${FONT}"><div style="font-size:19px;font-weight:800;letter-spacing:-0.02em;color:${C.ink}">Acadify</div><div style="font-size:11px;font-weight:500;letter-spacing:0.06em;color:${C.muted}">Institutional OS</div></td>
    ${o.tag ? `<td align="right" style="vertical-align:middle;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.06em;color:${C.muted}">${esc(o.tag)}</td>` : ""}
  </tr></table>
</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden">
  ${o.band ?? ""}
  <div style="padding:${o.band ? "28px" : "36px"} 36px 32px">${o.body}</div>
</td></tr>
<tr><td style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted}">${o.footer.map(esc).join("<br>")}</td></tr>
</table></td></tr></table></body></html>`;
}

const FOOTER = "Acadify · Institutional OS for schools, colleges and madrasahs";

/* ---------------------------------------------------------------- auth emails (sent by the Neon Auth webhook) */

/** The first three come from Neon Auth; "admin-sign-in" is Acadify's own second step for admin accounts. */
export type AuthEmailType = "email-verification" | "forget-password" | "sign-in" | "admin-sign-in";

const AUTH_COPY: Record<AuthEmailType, { title: string; bangla: string; subjectCode: (c: string) => string; subjectLink: string; intro: (email: string) => string; introLink: (email: string) => string; action: string }> = {
  "email-verification": {
    title: "Confirm your email",
    bangla: "আপনার ইমেইল যাচাই করুন",
    subjectCode: (c) => `${c} is your Acadify verification code`,
    subjectLink: "Confirm your email for Acadify",
    intro: (e) => `enter this code in Acadify to confirm <strong>${esc(e)}</strong> belongs to you.`,
    introLink: (e) => `confirm <strong>${esc(e)}</strong> belongs to you with the button below.`,
    action: "Confirm my email",
  },
  "forget-password": {
    title: "Reset your password",
    bangla: "পাসওয়ার্ড রিসেট কোড",
    subjectCode: () => "Your Acadify password reset code",
    subjectLink: "Reset your Acadify password",
    intro: (e) => `someone asked to reset the password for <strong>${esc(e)}</strong>. Enter this code on the reset page to choose a new one.`,
    introLink: (e) => `someone asked to reset the password for <strong>${esc(e)}</strong>. Use the button below to choose a new one.`,
    action: "Choose a new password",
  },
  "sign-in": {
    title: "Your sign-in code",
    bangla: "আপনার সাইন-ইন কোড",
    subjectCode: (c) => `${c} is your Acadify sign-in code`,
    subjectLink: "Your Acadify sign-in link",
    intro: (e) => `use this code to sign in to Acadify as <strong>${esc(e)}</strong>.`,
    introLink: (e) => `use the button below to sign in to Acadify as <strong>${esc(e)}</strong>.`,
    action: "Sign in to Acadify",
  },
  "admin-sign-in": {
    title: "Your admin sign-in code",
    bangla: "অ্যাডমিন সাইন-ইন কোড",
    subjectCode: (c) => `${c} is your Acadify admin sign-in code`,
    subjectLink: "Your Acadify admin sign-in link",
    intro: (e) => `your password was just used to sign in to the Acadify admin portal as <strong>${esc(e)}</strong>. Enter this code to finish signing in.`,
    introLink: (e) => `your password was just used to sign in to the Acadify admin portal as <strong>${esc(e)}</strong>. Use the button below to finish signing in.`,
    action: "Finish signing in",
  },
};

/** Warning shown when the email confirms a request someone may not have made. */
const WASNT_YOU: Partial<Record<AuthEmailType, string>> = {
  "forget-password": "Wasn't you? Ignore this email and your password stays the same. If you get these often, tell your institute's admin.",
  "admin-sign-in": "Wasn't you? Someone knows your password. Don't share this code, and change your password now with \"Forgot password?\" on the sign-in page.",
};

type AuthEmailInput = {
  type: AuthEmailType;
  email: string;
  name?: string | null;
  expiresAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
} & ({ code: string; link?: never } | { link: string; code?: never });

/** Verification, password reset and sign-in emails: a 6-digit code or, for link flows, a button. */
export function authEmail(i: AuthEmailInput): Email {
  const copy = AUTH_COPY[i.type];
  // Full names: Bangladeshi names often start with "Md" or "Abdur", which read wrong on their own
  const fullName = i.name?.trim();
  const hi = fullName ? `Hi ${esc(fullName)}, ` : "Hi, ";
  const expiry = expiryText(i.expiresAt);
  const warning = WASNT_YOU[i.type];
  const link = i.link ?? "";
  const intro = i.code ? copy.intro(i.email) : copy.introLink(i.email);

  const request = warning
    ? gap(18) +
      details(
        [
          ["Requested", `${dhakaTime(new Date())} (Dhaka time)`],
          ["Device", describeDevice(i.userAgent)],
          ["IP address", i.ipAddress],
        ],
        { boxed: "line", labelWidth: 96 }
      )
    : "";

  const body =
    heading(copy.title, copy.bangla) +
    p(hi + intro, { top: 18 }) +
    gap(18) +
    (i.code
      ? codeBox(i.code, expiry)
      : `${button(copy.action, link)}${p(`${expiry}. Button not working? Paste this link into your browser:<br><a href="${esc(link)}" style="color:${C.button};word-break:break-all">${esc(link)}</a>`, { muted: true, size: 13, top: 12 })}`) +
    request +
    gap(18) +
    (warning
      ? notice(esc(warning))
      : p(`Didn't try to ${i.type === "sign-in" ? "sign in" : "sign up or sign in"}? You can ignore this email. Nobody can use it without access to your inbox.`, { muted: true, size: 14 }) +
        gap(18) +
        divider(`Never share this ${i.code ? "code" : "link"}. Acadify staff will never ask for it by phone, SMS or WhatsApp.`));

  const subject = i.code ? copy.subjectCode(i.code) : copy.subjectLink;
  const html = shell({
    preheader: i.code ? `${expiry}. Never share this code.` : `${expiry}.`,
    body,
    footer: [FOOTER, warning ? "Acadify staff will never ask you for this code." : "You got this email because this address was used on Acadify."],
  });
  const text = [
    copy.title,
    `${hi}${intro.replace(/<[^>]+>/g, "")}`,
    i.code ? `Your code: ${i.code} (${expiry.toLowerCase()})` : `${copy.action}: ${link} (${expiry.toLowerCase()})`,
    warning ?? "Didn't ask for this? You can ignore this email.",
    "Never share this code. Acadify staff will never ask for it.",
  ].join("\n\n");

  return { subject, html, text };
}

/* ---------------------------------------------------------------- welcome / access granted */

const ROLE_HIGHLIGHTS: Record<InstituteRole, string[]> = {
  principal: ["See everything across the institute", "Manage staff, students, fees and exams", "Read reports and send SMS to guardians"],
  institute_admin: ["Manage students, staff and institute settings", "Take attendance and enter exam results", "Manage fees and send SMS to guardians"],
  accountant: ["Collect fees and issue receipts", "Manage fee setup and dues", "Read finance reports and send fee SMS"],
  teacher: ["Take daily attendance for your classes", "Enter exam marks and hifz progress", "Fill in class sheets and see student records"],
  student: ["See your attendance and results", "Read your class sheets"],
  guardian: ["See your child's attendance, results and fees"],
};

export function memberWelcomeEmail(o: { name: string; email: string; instituteName: string; instituteType: string; role: InstituteRole; newAccount: boolean; addedBy?: string }): Email {
  const role = roleLabel(o.role, o.instituteType);
  const fullName = o.name.trim();
  const signIn = `${appUrl()}/login`;
  const setPassword = `${appUrl()}/forgot-password?email=${encodeURIComponent(o.email)}`;
  const subject = `You now have access to ${o.instituteName} on Acadify`;

  const band = `<div style="background:${C.dark};padding:28px 36px">
<span style="display:inline-block;background:${C.amber};color:${C.amberInk};font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.04em;padding:5px 12px;border-radius:999px">${esc(role.toUpperCase())}</span>
<div style="height:10px;line-height:10px;font-size:1px">&nbsp;</div>
${heading(`Welcome to ${o.instituteName}, ${fullName}`, "অ্যাকাডিফাইতে আপনাকে স্বাগতম", "#FFFFFF", "#DCEFD5")}</div>`;

  const body =
    p(
      o.newAccount
        ? "Your institute uses Acadify to run attendance, exams and records. Your account is ready; set a password to sign in."
        : "Your institute uses Acadify to run attendance, exams and records. Sign in with your existing Acadify account."
    ) +
    gap(18) +
    label("WHAT YOU CAN DO") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${ROLE_HIGHLIGHTS[o.role].map(check).join("")}</table>` +
    gap(18) +
    details(
      [
        ["Sign-in email", o.email],
        ["Added by", o.addedBy ?? "Acadify team"],
      ],
      { boxed: "fill", labelWidth: 110 }
    ) +
    gap(22) +
    (o.newAccount ? button("Set your password", setPassword) : button("Sign in", signIn)) +
    (o.newAccount
      ? p(
          `We'll email you a 6-digit code to confirm it's you. Button not working? Open <a href="${esc(setPassword)}" style="color:${C.button};font-weight:600">${esc(appUrl().replace(/^https?:\/\//, ""))}/forgot-password</a> and enter your email.`,
          { muted: true, size: 13, top: 14 }
        )
      : "");

  const html = shell({ preheader: `You've been added as ${role}.`, band, body, footer: [FOOTER, "Not expecting this? Reply and we'll remove the access."] });
  const text = [
    `Welcome to ${o.instituteName}, ${fullName}`,
    `You've been added as ${role}.`,
    `What you can do:\n${ROLE_HIGHLIGHTS[o.role].map((s) => `- ${s}`).join("\n")}`,
    `Sign-in email: ${o.email}`,
    o.newAccount ? `Set your password: ${setPassword}` : `Sign in: ${signIn}`,
  ].join("\n\n");

  return { subject, html, text };
}

/* ---------------------------------------------------------------- new institute onboarding */

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
const taka = (n: number) => `৳${new Intl.NumberFormat("en-IN").format(n)}`;

/**
 * Sent to an institute's main contact when the super admin adds the institute: plan details, their account,
 * and what to do next. They get Principal (Muhtamim in a madrasah) access; `newAccount` decides between "set your password" and "sign in".
 */
export function instituteWelcomeEmail(o: {
  name: string;
  email: string;
  instituteName: string;
  instituteType: string;
  planName: string;
  /** Monthly price in BDT; 0 on the free trial. */
  monthlyPrice: number;
  trial: boolean;
  /** Next bill date, or the day the trial ends. */
  renewsOn: string;
  newAccount: boolean;
}): Email {
  const fullName = o.name.trim();
  const head = roleLabel("principal", o.instituteType);
  const signIn = `${appUrl()}/login`;
  const setPassword = `${appUrl()}/forgot-password?email=${encodeURIComponent(o.email)}`;
  const until = DATE_ONLY.format(new Date(`${o.renewsOn}T00:00:00+06:00`));
  const subject = `Welcome to Acadify: ${o.instituteName} is ready`;
  const planLine = o.trial ? `${o.planName}, free until ${until}` : `${o.planName}, ${taka(o.monthlyPrice)} a month`;

  const band = `<div style="background:${C.dark};padding:28px 36px">
<span style="display:inline-block;background:${C.amber};color:${C.amberInk};font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.04em;padding:5px 12px;border-radius:999px">${esc(o.planName.toUpperCase())} PLAN</span>
<div style="height:10px;line-height:10px;font-size:1px">&nbsp;</div>
${heading(`${o.instituteName} is ready on Acadify`, "আপনার প্রতিষ্ঠান অ্যাকাডিফাইতে প্রস্তুত", "#FFFFFF", "#DCEFD5")}</div>`;

  const body =
    p(
      `Dear ${esc(fullName)}, welcome to Acadify. Your institute's account is set up and you have <strong>${head}</strong> access, so you can run everything from one place.`
    ) +
    gap(18) +
    details(
      [
        ["Institute", o.instituteName],
        ["Plan", planLine],
        [o.trial ? "Trial ends" : "Next bill", until],
        ["Your sign-in", o.email],
      ],
      { boxed: "fill", labelWidth: 100 }
    ) +
    gap(22) +
    label("WHAT TO DO NEXT") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${
      (o.newAccount
        ? step(1, "Set your password", "Use the button below. We'll email you a 6-digit code to confirm it's you.")
        : step(1, "Sign in with your Acadify account", `You already have an account with ${o.email}.`)) +
      step(2, "Sign in and confirm the code", "Each time you sign in, we email a code to keep your institute's data safe.") +
      step(3, "Tell us how your institute runs", "Reply to this email with your classes, staff and fee setup, and we'll help you get everything in.")
    }</table>` +
    gap(20) +
    (o.newAccount ? button("Set your password", setPassword) : button("Sign in", signIn)) +
    p(`Questions? Just reply to this email and our team will help.`, { muted: true, size: 13, top: 14 });

  const html = shell({
    preheader: o.newAccount ? "Set your password to get started." : "Sign in to get started.",
    band,
    body,
    footer: [FOOTER, "You got this email because your institute was added to Acadify."],
  });
  const text = [
    `${o.instituteName} is ready on Acadify`,
    `Dear ${fullName}, welcome to Acadify. You have ${head} access.`,
    `Plan: ${planLine}\n${o.trial ? "Trial ends" : "Next bill"}: ${until}\nYour sign-in: ${o.email}`,
    `What to do next:\n1. ${o.newAccount ? `Set your password: ${setPassword}` : `Sign in: ${signIn}`}\n2. Sign in and confirm the emailed code.\n3. Reply to this email with your classes, staff and fee setup, and we'll help you get everything in.`,
  ].join("\n\n");

  return { subject, html, text };
}

/* ---------------------------------------------------------------- billing */

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
const monthName = (periodStart: string) => MONTH_YEAR.format(new Date(`${periodStart}T00:00:00Z`));

/** Invoice issued to an institute's main contact. `howToPay` is the payment text from Platform Settings. */
export function invoiceEmail(o: { howToPay?: string; invoiceId: string; name: string; instituteName: string; planName: string; periodStart: string; amount: number }): Email {
  const month = monthName(o.periodStart);
  const howToPay = o.howToPay?.trim() || null;
  const subject = `Acadify invoice ${o.invoiceId}: ${taka(o.amount)} for ${month}`;

  const body =
    heading(`Invoice for ${month}`, "আপনার মাসিক বিল") +
    p(`Dear ${esc(o.name.trim())}, here is ${esc(o.instituteName)}'s Acadify invoice for ${month}.`, { top: 18 }) +
    gap(18) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:${C.tint};border-radius:16px;padding:20px 16px">
<div style="font-family:${FONT};font-size:13px;font-weight:700;color:${C.dark}">Amount due</div>
<div style="margin-top:4px;font-family:${FONT};font-size:34px;font-weight:800;letter-spacing:-0.02em;color:${C.dark}">${taka(o.amount)}</div></td></tr></table>` +
    gap(18) +
    details(
      [
        ["Invoice", o.invoiceId],
        ["Institute", o.instituteName],
        ["Plan", o.planName],
        ["Period", month],
      ],
      { boxed: "line", labelWidth: 96 }
    ) +
    gap(18) +
    label("HOW TO PAY") +
    p(howToPay ? esc(howToPay).replace(/\n/g, "<br>") : "Pay by bKash, Nagad or bank transfer. Reply to this email and we'll send you the payment details.", { size: 14, top: 6 }) +
    p(`Please mention <strong>${esc(o.invoiceId)}</strong> as the reference so we can match your payment.`, { muted: true, size: 13, top: 12 });

  const html = shell({ preheader: `${taka(o.amount)} due for ${month}.`, body, footer: [FOOTER, "Questions about this invoice? Just reply to this email."] });
  const text = [
    `Acadify invoice ${o.invoiceId}`,
    `Dear ${o.name.trim()}, here is ${o.instituteName}'s invoice for ${month}.`,
    `Amount due: ${taka(o.amount)}\nPlan: ${o.planName}\nPeriod: ${month}`,
    `How to pay: ${howToPay ?? "Pay by bKash, Nagad or bank transfer. Reply to this email for the payment details."}`,
    `Reference: ${o.invoiceId}`,
  ].join("\n\n");
  return { subject, html, text };
}

/** Receipt after a payment is recorded. */
export function paymentReceiptEmail(o: { invoiceId: string; name: string; instituteName: string; periodStart: string; amount: number; method: string; paidOn: string }): Email {
  const month = monthName(o.periodStart);
  const paid = DATE_ONLY.format(new Date(`${o.paidOn}T00:00:00+06:00`));
  const subject = `Payment received: ${taka(o.amount)} for ${month} (${o.invoiceId})`;

  const body =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="66" style="vertical-align:middle"><div style="width:52px;height:52px;line-height:52px;border-radius:999px;background:${C.tint};text-align:center;font-family:${FONT};font-size:24px;font-weight:800;color:${C.button}">&#10003;</div></td>
<td style="vertical-align:middle">${heading("Payment received", "পেমেন্ট পাওয়া গেছে")}</td></tr></table>` +
    p(`Dear ${esc(o.name.trim())}, thank you. We've received ${esc(o.instituteName)}'s payment for ${month}.`, { top: 18 }) +
    gap(18) +
    details(
      [
        ["Invoice", o.invoiceId],
        ["Amount", taka(o.amount)],
        ["Paid on", paid],
        ["Method", o.method],
        ["Period", month],
      ],
      { boxed: "fill", labelWidth: 96 }
    ) +
    p("Keep this email as your receipt.", { muted: true, size: 13, top: 14 });

  const html = shell({ preheader: `${taka(o.amount)} received for ${month}.`, body, footer: [FOOTER, "Questions? Just reply to this email."] });
  const text = [subject, `Dear ${o.name.trim()}, we've received ${o.instituteName}'s payment for ${month}.`, `Amount: ${taka(o.amount)}\nPaid on: ${paid}\nMethod: ${o.method}`, "Keep this email as your receipt."].join("\n\n");
  return { subject, html, text };
}

/* ---------------------------------------------------------------- support tickets */

const ticketRef = (id: number) => `T-${id}`;

/** Sent when a ticket is logged for an institute, so they know it's being handled. */
export function ticketOpenedEmail(o: { id: number; name: string; subject: string; instituteName: string }): Email {
  const subject = `We're on it: ${o.subject} [${ticketRef(o.id)}]`;
  const body =
    heading("We've logged your request", "আপনার অনুরোধ নথিভুক্ত হয়েছে") +
    p(`Dear ${esc(o.name.trim())}, thanks for getting in touch. We've opened a support ticket for ${esc(o.instituteName)} and our team is looking into it.`, { top: 18 }) +
    gap(16) +
    details(
      [
        ["Ticket", ticketRef(o.id)],
        ["About", o.subject],
      ],
      { boxed: "fill", labelWidth: 80 }
    ) +
    p("You'll hear from us by email. To add anything, just reply to this email.", { muted: true, size: 13.5, top: 14 });
  const html = shell({ preheader: `Ticket ${ticketRef(o.id)}: ${o.subject}`, body, footer: [FOOTER, `About support ticket ${ticketRef(o.id)}.`] });
  const text = [subject, `Dear ${o.name.trim()}, we've opened support ticket ${ticketRef(o.id)} for ${o.instituteName}: ${o.subject}.`, "To add anything, just reply to this email."].join("\n\n");
  return { subject, html, text };
}

/** A reply from the Acadify team on a ticket. */
export function ticketReplyEmail(o: { id: number; name: string; subject: string; reply: string; staffName: string; resolved: boolean }): Email {
  const subject = `Re: ${o.subject} [${ticketRef(o.id)}]`;
  const body =
    heading(o.resolved ? "Your request is resolved" : "A reply from Acadify support", o.resolved ? "আপনার সমস্যার সমাধান হয়েছে" : "অ্যাকাডিফাই সাপোর্ট থেকে উত্তর") +
    p(`Dear ${esc(o.name.trim())},`, { top: 18 }) +
    gap(10) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-left:3px solid ${C.button};padding:4px 0 4px 16px">${p(esc(o.reply).replace(/\n/g, "<br>"), { size: 15 })}</td></tr></table>` +
    p(`${esc(o.staffName)}, Acadify support`, { muted: true, size: 13.5, top: 14 }) +
    gap(16) +
    divider(
      o.resolved
        ? `We've marked ticket ${ticketRef(o.id)} as resolved. If anything still isn't right, reply to this email and we'll reopen it.`
        : `Ticket ${ticketRef(o.id)}. Reply to this email to answer.`
    );
  const html = shell({ preheader: o.reply.slice(0, 90), body, footer: [FOOTER, `About support ticket ${ticketRef(o.id)}.`] });
  const text = [subject, `Dear ${o.name.trim()},`, o.reply, `${o.staffName}, Acadify support`, o.resolved ? "This ticket is resolved. Reply to reopen it." : "Reply to this email to answer."].join("\n\n");
  return { subject, html, text };
}

/* ---------------------------------------------------------------- demo requests */

export type DemoEmailData = {
  id: number;
  name: string;
  institute: string;
  type: string;
  phone: string;
  email?: string | null;
  students?: string | null;
  message?: string | null;
  receivedAt?: Date;
};

const TYPE_NAMES: Record<string, string> = {
  school: "School",
  college: "College",
  qawmi: "Qawmi madrasah",
  alia: "Alia madrasah",
  hifz: "Hifz madrasah",
  coaching: "Coaching centre",
  unified: "Multiple institutions",
};
const prettyPhone = (p: string) => p.replace(/^(?:\+?88)?(01\d{3})(\d{6})$/, "$1-$2");
const ref = (id: number) => `DR-${id}`;

function step(n: number, title: string, desc: string) {
  return `<tr><td width="42" style="padding:6px 0;vertical-align:top"><div style="width:28px;height:28px;line-height:28px;border-radius:999px;background:${C.button};color:#FFFFFF;text-align:center;font-family:${FONT};font-size:13px;font-weight:800">${n}</div></td>
<td style="padding:6px 0;vertical-align:top;font-family:${FONT}"><div style="font-size:15px;font-weight:700;color:${C.ink}">${esc(title)}</div><div style="margin-top:2px;font-size:14px;line-height:1.5;color:${C.muted}">${esc(desc)}</div></td></tr>`;
}

/** Sent to the visitor who filled the "Book a Free Demo" form (only when they gave an email). */
export function demoConfirmationEmail(d: DemoEmailData): Email {
  const fullName = d.name.trim();
  const phone = prettyPhone(d.phone);
  const subject = `We got your demo request (${ref(d.id)})`;

  const body =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="66" style="vertical-align:middle"><div style="width:52px;height:52px;line-height:52px;border-radius:999px;background:${C.tint};text-align:center;font-family:${FONT};font-size:24px;font-weight:800;color:${C.button}">&#10003;</div></td>
<td style="vertical-align:middle">${heading(`Thanks, ${fullName}. We got it.`, "আপনার ডেমো অনুরোধ পেয়েছি")}</td></tr></table>` +
    p(`Your request for a free Acadify demo for <strong>${esc(d.institute)}</strong> is in. Here's what happens next.`, { top: 20 }) +
    gap(12) +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${
      step(1, "We call you", `On ${phone}, to learn how your institute runs today.`) +
      step(2, "We pick a time together", "Online or at your institute, whichever suits you.") +
      step(3, "You see Acadify with your own setup", "Attendance, fees, exams and SMS, shown for an institute like yours.")
    }</table>` +
    gap(18) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid ${C.line};border-radius:14px;padding:14px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${label("YOUR REQUEST")}</td><td align="right"><span style="font-family:${MONO};font-size:12.5px;font-weight:700;color:${C.dark};background:${C.tint};padding:3px 9px;border-radius:8px">${ref(d.id)}</span></td></tr></table>
<div style="height:8px;line-height:8px;font-size:1px">&nbsp;</div>
${details([
  ["Institute", d.institute],
  ["Type", TYPE_NAMES[d.type] ?? d.type],
  ["Students", d.students],
  ["Phone", phone],
])}</td></tr></table>` +
    p("Something wrong, or want to add details? Just reply to this email.", { muted: true, size: 13.5, top: 18 });

  const html = shell({ preheader: "Here's what happens next.", body, footer: [FOOTER, "You got this email because you asked for a demo on our website."] });
  const text = [
    `Thanks, ${fullName}. We got your demo request (${ref(d.id)}).`,
    `Institute: ${d.institute}`,
    `What happens next:\n1. We call you on ${phone}.\n2. We pick a time together, online or at your institute.\n3. You see Acadify with your own setup.`,
    "Something wrong? Just reply to this email.",
  ].join("\n\n");

  return { subject, html, text };
}

/**
 * Demo request accepted: the institute was added. Only sent when the welcome email (with sign-in steps)
 * isn't already going to the same address.
 */
export function demoAcceptedEmail(d: { id: number; name: string; institute: string; phone: string; principalEmailed: boolean }): Email {
  const fullName = d.name.trim();
  const subject = `Your demo request was accepted (${ref(d.id)})`;
  const band = `<div style="background:${C.dark};padding:28px 36px">
<span style="display:inline-block;background:${C.amber};color:${C.amberInk};font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:0.04em;padding:5px 12px;border-radius:999px">ACCEPTED</span>
<div style="height:10px;line-height:10px;font-size:1px">&nbsp;</div>
${heading(`${d.institute} is joining Acadify`, "আপনার অনুরোধ গৃহীত হয়েছে", "#FFFFFF", "#DCEFD5")}</div>`;

  const body =
    p(`Dear ${esc(fullName)}, thank you for your interest in Acadify. We've accepted your demo request and set up <strong>${esc(d.institute)}</strong> on Acadify.`) +
    gap(16) +
    label("WHAT HAPPENS NEXT") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${
      [
        d.principalEmailed ? ["Your principal gets sign-in details", "The person running the institute has been emailed a link to set their password."] : null,
        ["We call you", `On ${prettyPhone(d.phone)}, to help set up your classes, staff and fees.`],
        ["You start using Acadify", "Attendance, fees, exams and SMS, all in one place."],
      ]
        .filter((x): x is string[] => x !== null)
        .map(([title, desc], i) => step(i + 1, title, desc))
        .join("")
    }</table>` +
    p("Questions? Just reply to this email.", { muted: true, size: 13.5, top: 18 });

  const html = shell({ preheader: "Here's what happens next.", band, body, footer: [FOOTER, `About your demo request ${ref(d.id)}.`] });
  const text = [
    `Your demo request was accepted (${ref(d.id)})`,
    `Dear ${fullName}, we've accepted your demo request and set up ${d.institute} on Acadify.`,
    `What happens next:${d.principalEmailed ? "\n- Your principal has been emailed a link to set their password." : ""}\n- We call you on ${prettyPhone(d.phone)} to help set things up.\n- You start using Acadify.`,
    "Questions? Just reply to this email.",
  ].join("\n\n");
  return { subject, html, text };
}

/** Demo request rejected. `reason` (optional, written by the super admin) is quoted in the email. */
export function demoRejectedEmail(d: { id: number; name: string; institute: string; reason?: string | null }): Email {
  const fullName = d.name.trim();
  const reason = d.reason?.trim();
  const subject = `About your demo request (${ref(d.id)})`;

  const body =
    heading("Thank you for your interest", "আপনার আগ্রহের জন্য ধন্যবাদ") +
    p(`Dear ${esc(fullName)}, thank you for requesting an Acadify demo for <strong>${esc(d.institute)}</strong>. After reviewing it, we're not able to move forward with your request at this time.`, { top: 18 }) +
    (reason
      ? gap(16) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.ground};border-radius:14px;padding:14px 16px">${label("FROM OUR TEAM")}${p(esc(reason).replace(/\n/g, "<br>"), { size: 14, top: 6 })}</td></tr></table>`
      : "") +
    p("If your plans change, or you think we've misunderstood something, just reply to this email. We'd be glad to talk again.", { top: 18 });

  const html = shell({ preheader: "About your Acadify demo request.", body, footer: [FOOTER, `About your demo request ${ref(d.id)}.`] });
  const text = [
    subject,
    `Dear ${fullName}, thank you for requesting an Acadify demo for ${d.institute}. We're not able to move forward with your request at this time.`,
    reason ? `From our team: ${reason}` : "",
    "If your plans change, just reply to this email.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text };
}

/** Sent to SALES_NOTIFY_EMAIL for every website demo request. Replies go to the visitor. */
export function demoRequestAlertEmail(d: DemoEmailData): Email {
  const phone = prettyPhone(d.phone);
  const subject = `New demo request: ${d.institute} (${ref(d.id)})`;

  const band = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.highlight};padding:22px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;font-family:${FONT}"><div style="font-size:12px;font-weight:800;letter-spacing:0.06em;color:${C.amberInk}">NEW DEMO REQUEST</div>
<div style="margin-top:4px;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${C.ink}">${esc(d.institute)}</div></td>
<td align="right" style="vertical-align:middle"><span style="font-family:${MONO};font-size:13px;font-weight:700;color:${C.amberInk};background:#FFFFFF;padding:5px 10px;border-radius:8px">${ref(d.id)}</span></td>
</tr></table></td></tr></table>`;

  const body =
    details(
      [
        ["Name", d.name],
        ["Type", TYPE_NAMES[d.type] ?? d.type],
        ["Students", d.students],
        ["Phone", phone],
        ["Email", d.email],
        ["Received", dhakaTime(d.receivedAt ?? new Date())],
      ],
      { labelWidth: 96 }
    ) +
    (d.message
      ? gap(16) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.ground};border-radius:14px;padding:14px 16px">${label("MESSAGE")}${p(esc(d.message).replace(/\n/g, "<br>"), { size: 14, top: 6 })}</td></tr></table>`
      : "") +
    gap(20) +
    `${button(`Call ${phone}`, `tel:${d.phone}`)}&nbsp;&nbsp;${button("Open in console", `${appUrl()}/admin/demo-requests`, "outline")}` +
    (d.email ? p(`Replying to this email goes straight to ${esc(d.name)}.`, { muted: true, size: 13, top: 14 }) : "");

  const html = shell({ preheader: `${d.name} · ${phone}`, band, body, tag: "SALES ALERT", footer: ["Sent to your sales inbox (SALES_NOTIFY_EMAIL) for every website demo request."] });
  const text = [
    subject,
    [
      `Name: ${d.name}`,
      `Type: ${TYPE_NAMES[d.type] ?? d.type}`,
      d.students && `Students: ${d.students}`,
      `Phone: ${phone}`,
      d.email && `Email: ${d.email}`,
      d.message && `Message: ${d.message}`,
    ]
      .filter(Boolean)
      .join("\n"),
    `Open in console: ${appUrl()}/admin/demo-requests`,
  ].join("\n\n");

  return { subject, html, text };
}
