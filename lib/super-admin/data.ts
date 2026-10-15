/**
 * Shared Super Admin types, labels, formatters and pure helpers.
 * Safe to import from Client Components. Database access lives in ./queries (server only).
 */

export type InstituteType = "school" | "college" | "qawmi" | "alia" | "hifz" | "coaching" | "unified";
/** A plan's key from the `plans` table (super admins can add plans, so this is any string). */
export type PlanKey = string;
/** The built-in free trial plan. */
export const TRIAL_PLAN = "trial";
export type InstituteStatus = "active" | "trial" | "past_due" | "suspended";
export type DemoStatus = "new" | "contacted" | "scheduled" | "won" | "lost";
export type InvoiceStatus = "paid" | "due" | "overdue";
export type PaymentMethod = "bKash" | "Bank" | "Nagad";

export interface Institute {
  id: string;
  slug: string;
  name: string;
  type: InstituteType;
  district: string;
  plan: PlanKey;
  status: InstituteStatus;
  students: number;
  staff: number;
  /** Monthly recurring revenue in BDT (0 while on trial). */
  mrr: number;
  smsUsed: number;
  smsCredit: number;
  joined: string;
  renewsOn: string;
  lastActive: string;
  contact: { name: string; role: string; phone: string; email: string };
  modules: string[];
}

export interface Plan {
  key: PlanKey;
  name: string;
  nameBn: string;
  tagline: string;
  taglineBn: string;
  /** Monthly price in BDT; null = custom price agreed per institute. */
  price: number | null;
  /** Price for a full year in BDT; null = no yearly option. */
  yearlyPrice: number | null;
  studentLimit: number | null;
  features: string[];
  featuresBn: string[];
  featured: boolean;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

/** Plan by key, with a readable fallback if a key isn't found. */
export const findPlan = (plans: Plan[], key: PlanKey): Plan =>
  plans.find((p) => p.key === key) ?? {
    key,
    name: key,
    nameBn: key,
    tagline: "",
    taglineBn: "",
    price: null,
    yearlyPrice: null,
    studentLimit: null,
    features: [],
    featuresBn: [],
    featured: false,
    isPublic: false,
    isActive: false,
    sortOrder: 0,
  };

/** "৳4,500/month", "free for 30 days" or "custom price", for plan pickers. */
export function planPriceLabel(p: Plan) {
  if (p.key === TRIAL_PLAN) return "free trial";
  if (p.price === null) return "custom price";
  return `${formatTaka(p.price)}/month`;
}

export interface DemoRequest {
  /** Database id; shown as DR-{id}. */
  dbId: number;
  id: string;
  name: string;
  institute: string;
  type: InstituteType;
  phone: string;
  email?: string;
  students: string;
  message?: string;
  createdAt: string;
  status: DemoStatus;
}

export interface Invoice {
  id: string;
  /** Institute slug. */
  institute: string;
  instituteName: string;
  /** "Oct 2026" */
  period: string;
  /** "2026-10-01" */
  periodStart: string;
  amount: number;
  status: InvoiceStatus;
  method?: PaymentMethod;
  issuedOn: string;
  paidOn?: string;
}

export interface ActivityItem {
  id: string;
  kind: "signup" | "payment" | "upgrade" | "sms" | "overdue" | "demo";
  text: string;
  institute?: { slug: string; name: string };
  at: string;
}

export interface PlatformTotals {
  institutes: number;
  active: number;
  trials: number;
  pastDue: number;
  suspended: number;
  students: number;
  mrr: number;
  smsThisMonth: number;
  outstanding: number;
  newDemos: number;
}

export const TYPE_LABELS: Record<InstituteType, string> = {
  school: "School",
  college: "College",
  qawmi: "Qawmi Madrasah",
  alia: "Alia Madrasah",
  hifz: "Hifz Khana",
  coaching: "Coaching Center",
  unified: "Unified Campus",
};

export const STATUS_LABELS: Record<InstituteStatus, string> = {
  active: "Active",
  trial: "Trial",
  past_due: "Past due",
  suspended: "Suspended",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["bKash", "Bank", "Nagad"];
export const ALL_MODULE_COUNT = 7;

const takaFormat = new Intl.NumberFormat("en-IN");
/** ৳4,82,300 — Bangladeshi lakh grouping. */
export const formatTaka = (n: number) => `৳${takaFormat.format(n)}`;
export const formatNumber = (n: number) => takaFormat.format(n);

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

const periodFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
/** "2026-10-01" -> "Oct 2026" */
export const formatPeriod = (isoDate: string) => periodFormat.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));

export const daysUntil = (iso: string, now = Date.now()) => Math.round((new Date(iso).getTime() - now) / 86_400_000);

/** "2 days ago". Render inside <time suppressHydrationWarning> when used in Client Components. */
export function timeAgo(iso: string, now = Date.now()) {
  if (!iso) return "never";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  return formatDate(iso);
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Years that have invoices, newest first. */
export function billingYears(invoices: Invoice[]) {
  return [...new Set(invoices.map((i) => Number(i.periodStart.slice(0, 4))))].sort((a, b) => b - a);
}

const monthKey = (year: number, m: number) => `${year}-${String(m + 1).padStart(2, "0")}`;

/** Revenue billed per month of a year; months with no invoices are null. */
export function revenueByMonth(invoices: Invoice[], year: number) {
  return MONTHS.map((month, m) => {
    const inMonth = invoices.filter((i) => i.periodStart.startsWith(monthKey(year, m)));
    return { month, revenue: inMonth.length ? inMonth.reduce((s, i) => s + i.amount, 0) : null };
  });
}

/** Paid amounts per month of a year, split by gateway. */
export function paymentsByMonth(invoices: Invoice[], year: number) {
  return MONTHS.map((month, m) => {
    const paid = invoices.filter((i) => i.status === "paid" && i.periodStart.startsWith(monthKey(year, m)));
    if (!paid.length) return { month, bKash: null, Bank: null, Nagad: null };
    const sum = (method: PaymentMethod) => paid.filter((i) => i.method === method).reduce((s, i) => s + i.amount, 0);
    return { month, bKash: sum("bKash"), Bank: sum("Bank"), Nagad: sum("Nagad") };
  });
}

/** Revenue billed per month for the last `count` months that have invoices, oldest first. */
export function revenueHistory(invoices: Invoice[], count = 12) {
  const byMonth = new Map<string, number>();
  for (const i of invoices) {
    const key = i.periodStart.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + i.amount);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-count)
    .map(([key, mrr]) => ({ month: formatPeriod(`${key}-01`), mrr }));
}


/** Bangladesh's 64 districts (current official English spellings), for the district field's suggestions. */
export const BD_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram",
  "Chuadanga", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
  "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram",
  "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh",
  "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
  "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon",
] as const;

/**
 * Web address (subdomain) made from an institute's name: "Ar-Rahman Dakhil Madrasah" → "ar-rahman-dakhil-madrasah".
 * The whole name, with spaces and punctuation turned into dashes. A name with no English letters or digits gives "".
 */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    // 63 characters is the most a web address (subdomain) can hold
    .slice(0, 63)
    .replace(/-+$/, "");
}

/** Root domain institutes live under, from NEXT_PUBLIC_APP_DOMAIN (public so the browser can show addresses too). */
export const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/** "taltala-bl-high-school" → "taltala-bl-high-school.<APP_DOMAIN>" */
export const webAddress = (slug: string) => (APP_DOMAIN ? `${slug}.${APP_DOMAIN}` : slug);
