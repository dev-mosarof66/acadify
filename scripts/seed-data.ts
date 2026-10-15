/**
 * Sample platform data for the Super Admin console.
 * Every page reads from here, so swapping this module for real Neon queries is the only change needed later.
 * Names and numbers are invented examples, not real institutes.
 */

export type InstituteType = "school" | "college" | "qawmi" | "alia" | "hifz" | "coaching" | "unified";
export type PlanKey = "trial" | "starter" | "institute" | "campus";
export type InstituteStatus = "active" | "trial" | "past_due" | "suspended";

export interface Institute {
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
  price: number | null;
  studentLimit: number | null;
}

export type DemoStatus = "new" | "contacted" | "scheduled" | "won" | "lost";

export interface DemoRequest {
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

export type InvoiceStatus = "paid" | "due" | "overdue";

export interface Invoice {
  id: string;
  institute: string;
  period: string;
  amount: number;
  status: InvoiceStatus;
  method?: "bKash" | "Nagad" | "Bank";
  issuedOn: string;
  paidOn?: string;
}

export interface ActivityItem {
  id: string;
  kind: "signup" | "payment" | "upgrade" | "sms" | "overdue" | "demo";
  text: string;
  institute?: string;
  at: string;
}

/** "Today" for the sample data. */
export const TODAY = "2026-10-14";

export const PLANS: Record<PlanKey, Plan> = {
  trial: { key: "trial", name: "Free Trial", price: 0, studentLimit: null },
  starter: { key: "starter", name: "Starter", price: 1500, studentLimit: 300 },
  institute: { key: "institute", name: "Institute", price: 4500, studentLimit: 1500 },
  campus: { key: "campus", name: "Campus", price: null, studentLimit: null },
};

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

const ALL_MODULES = ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Lecture Sheets", "Hifz Tracker", "Boarding", "Guardian Portal"];

export const INSTITUTES: Institute[] = [
  {
    slug: "noor-academy",
    name: "Noor Academy",
    type: "unified",
    district: "Dhaka",
    plan: "campus",
    status: "active",
    students: 2140,
    staff: 96,
    mrr: 12000,
    smsUsed: 8420,
    smsCredit: 15000,
    joined: "2025-11-03",
    renewsOn: "2026-11-03",
    lastActive: "2026-10-14T09:42:00",
    contact: { name: "Md. Abdur Rahman", role: "Principal", phone: "01XXX-XXX201", email: "principal@noor-academy.example" },
    modules: ALL_MODULES,
  },
  {
    slug: "sunrise-model-school",
    name: "Sunrise Model School",
    type: "school",
    district: "Chattogram",
    plan: "institute",
    status: "active",
    students: 1180,
    staff: 54,
    mrr: 4500,
    smsUsed: 3910,
    smsCredit: 5000,
    joined: "2025-12-10",
    renewsOn: "2026-11-10",
    lastActive: "2026-10-14T10:05:00",
    contact: { name: "Farzana Akter", role: "Headmistress", phone: "01XXX-XXX202", email: "office@sunrise.example" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Lecture Sheets", "Guardian Portal"],
  },
  {
    slug: "madinatul-uloom",
    name: "Madinatul Uloom Madrasah",
    type: "qawmi",
    district: "Sylhet",
    plan: "institute",
    status: "active",
    students: 860,
    staff: 41,
    mrr: 4500,
    smsUsed: 2240,
    smsCredit: 4000,
    joined: "2026-01-08",
    renewsOn: "2026-11-08",
    lastActive: "2026-10-14T08:15:00",
    contact: { name: "Mufti Habibullah", role: "Muhtamim", phone: "01XXX-XXX203", email: "muhtamim@madinatul.example" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Hifz Tracker", "Boarding"],
  },
  {
    slug: "al-furqan-hifz",
    name: "Al-Furqan Hifz Academy",
    type: "hifz",
    district: "Dhaka",
    plan: "starter",
    status: "active",
    students: 210,
    staff: 14,
    mrr: 1500,
    smsUsed: 640,
    smsCredit: 1000,
    joined: "2026-02-14",
    renewsOn: "2026-11-14",
    lastActive: "2026-10-13T18:20:00",
    contact: { name: "Hafez Kamrul Islam", role: "Principal", phone: "01XXX-XXX204", email: "alfurqan@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Hifz Tracker", "Boarding"],
  },
  {
    slug: "rupsha-college",
    name: "Rupsha College",
    type: "college",
    district: "Khulna",
    plan: "institute",
    status: "past_due",
    students: 1420,
    staff: 63,
    mrr: 4500,
    smsUsed: 4890,
    smsCredit: 5000,
    joined: "2025-12-22",
    renewsOn: "2026-10-01",
    lastActive: "2026-10-12T14:02:00",
    contact: { name: "Prof. Shahidul Haque", role: "Principal", phone: "01XXX-XXX205", email: "principal@rupsha.example" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Lecture Sheets", "Guardian Portal"],
  },
  {
    slug: "shapla-high-school",
    name: "Shapla High School",
    type: "school",
    district: "Rajshahi",
    plan: "starter",
    status: "active",
    students: 290,
    staff: 18,
    mrr: 1500,
    smsUsed: 910,
    smsCredit: 1500,
    joined: "2026-03-02",
    renewsOn: "2026-11-02",
    lastActive: "2026-10-14T07:55:00",
    contact: { name: "Nasima Begum", role: "Headmistress", phone: "01XXX-XXX206", email: "shapla.hs@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results"],
  },
  {
    slug: "darussalam-alia",
    name: "Darussalam Alia Madrasah",
    type: "alia",
    district: "Cumilla",
    plan: "institute",
    status: "active",
    students: 940,
    staff: 47,
    mrr: 4500,
    smsUsed: 2780,
    smsCredit: 4000,
    joined: "2026-01-19",
    renewsOn: "2026-11-19",
    lastActive: "2026-10-14T09:10:00",
    contact: { name: "Maulana Abdul Kader", role: "Principal", phone: "01XXX-XXX207", email: "darussalam@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Hifz Tracker", "Guardian Portal"],
  },
  {
    slug: "pathshala-coaching",
    name: "Pathshala Coaching Center",
    type: "coaching",
    district: "Dhaka",
    plan: "starter",
    status: "active",
    students: 180,
    staff: 9,
    mrr: 1500,
    smsUsed: 1210,
    smsCredit: 1500,
    joined: "2026-04-11",
    renewsOn: "2026-11-11",
    lastActive: "2026-10-13T21:40:00",
    contact: { name: "Tanvir Ahmed", role: "Director", phone: "01XXX-XXX208", email: "pathshala@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Lecture Sheets"],
  },
  {
    slug: "green-valley-school",
    name: "Green Valley School",
    type: "school",
    district: "Gazipur",
    plan: "institute",
    status: "active",
    students: 760,
    staff: 38,
    mrr: 4500,
    smsUsed: 2050,
    smsCredit: 3000,
    joined: "2026-05-06",
    renewsOn: "2026-11-06",
    lastActive: "2026-10-14T10:22:00",
    contact: { name: "Rafiqul Islam", role: "Principal", phone: "01XXX-XXX209", email: "gvs@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Guardian Portal"],
  },
  {
    slug: "jamia-islamia-bogura",
    name: "Jamia Islamia Bogura",
    type: "qawmi",
    district: "Bogura",
    plan: "starter",
    status: "past_due",
    students: 270,
    staff: 16,
    mrr: 1500,
    smsUsed: 420,
    smsCredit: 1000,
    joined: "2026-05-27",
    renewsOn: "2026-09-27",
    lastActive: "2026-10-09T11:30:00",
    contact: { name: "Maulana Yusuf Ali", role: "Muhtamim", phone: "01XXX-XXX210", email: "jamia.bogura@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Boarding"],
  },
  {
    slug: "meghna-ideal-college",
    name: "Meghna Ideal College",
    type: "college",
    district: "Narayanganj",
    plan: "institute",
    status: "active",
    students: 1310,
    staff: 58,
    mrr: 4500,
    smsUsed: 3320,
    smsCredit: 5000,
    joined: "2026-06-15",
    renewsOn: "2026-11-15",
    lastActive: "2026-10-14T09:58:00",
    contact: { name: "Dr. Selina Parvin", role: "Principal", phone: "01XXX-XXX211", email: "mic@example.com" },
    modules: ["Attendance & SMS", "Fees & Invoicing", "Exams & Results", "Lecture Sheets", "Guardian Portal"],
  },
  {
    slug: "baitul-hikmah-hifz",
    name: "Baitul Hikmah Hifz Khana",
    type: "hifz",
    district: "Mymensingh",
    plan: "starter",
    status: "suspended",
    students: 95,
    staff: 7,
    mrr: 0,
    smsUsed: 0,
    smsCredit: 500,
    joined: "2026-06-30",
    renewsOn: "2026-08-30",
    lastActive: "2026-08-28T16:12:00",
    contact: { name: "Hafez Abdullah", role: "Principal", phone: "01XXX-XXX212", email: "baitulhikmah@example.com" },
    modules: ["Attendance & SMS", "Hifz Tracker"],
  },
  {
    slug: "padma-public-school",
    name: "Padma Public School",
    type: "school",
    district: "Rajbari",
    plan: "trial",
    status: "trial",
    students: 540,
    staff: 27,
    mrr: 0,
    smsUsed: 380,
    smsCredit: 500,
    joined: "2026-09-29",
    renewsOn: "2026-10-29",
    lastActive: "2026-10-14T08:47:00",
    contact: { name: "Mahbub Alam", role: "Headmaster", phone: "01XXX-XXX213", email: "padma.ps@example.com" },
    modules: ALL_MODULES,
  },
  {
    slug: "ar-rahman-madrasah",
    name: "Ar-Rahman Dakhil Madrasah",
    type: "alia",
    district: "Barishal",
    plan: "trial",
    status: "trial",
    students: 410,
    staff: 22,
    mrr: 0,
    smsUsed: 150,
    smsCredit: 500,
    joined: "2026-10-06",
    renewsOn: "2026-11-05",
    lastActive: "2026-10-13T12:30:00",
    contact: { name: "Maulana Saiful Islam", role: "Superintendent", phone: "01XXX-XXX214", email: "arrahman@example.com" },
    modules: ALL_MODULES,
  },
  {
    slug: "brahmaputra-academy",
    name: "Brahmaputra Academy",
    type: "school",
    district: "Jamalpur",
    plan: "trial",
    status: "trial",
    students: 330,
    staff: 19,
    mrr: 0,
    smsUsed: 60,
    smsCredit: 500,
    joined: "2026-10-11",
    renewsOn: "2026-11-10",
    lastActive: "2026-10-14T10:31:00",
    contact: { name: "Sharmin Sultana", role: "Principal", phone: "01XXX-XXX215", email: "brahmaputra@example.com" },
    modules: ALL_MODULES,
  },
  {
    slug: "karnaphuli-campus",
    name: "Karnaphuli Education Campus",
    type: "unified",
    district: "Chattogram",
    plan: "campus",
    status: "active",
    students: 3050,
    staff: 132,
    mrr: 15000,
    smsUsed: 11800,
    smsCredit: 20000,
    joined: "2026-07-20",
    renewsOn: "2027-07-20",
    lastActive: "2026-10-14T10:40:00",
    contact: { name: "Engr. Mostafa Kamal", role: "Chairman", phone: "01XXX-XXX216", email: "kec@example.com" },
    modules: ALL_MODULES,
  },
];

/** Monthly recurring revenue (BDT) for the last 12 months, oldest first. */
export const MRR_HISTORY = [
  { month: "Nov 2025", mrr: 12000 },
  { month: "Dec 2025", mrr: 21000 },
  { month: "Jan 2026", mrr: 30000 },
  { month: "Feb 2026", mrr: 31500 },
  { month: "Mar 2026", mrr: 33000 },
  { month: "Apr 2026", mrr: 34500 },
  { month: "May 2026", mrr: 40500 },
  { month: "Jun 2026", mrr: 45000 },
  { month: "Jul 2026", mrr: 54000 },
  { month: "Aug 2026", mrr: 55500 },
  { month: "Sep 2026", mrr: 58500 },
  { month: "Oct 2026", mrr: 60000 },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Years that have billing data, newest first. Acadify started billing in Nov 2025. */
export const BILLING_YEARS = [2026, 2025] as const;

/** Revenue billed per month for a year; months before launch or still in the future are null. */
export function revenueByMonth(year: number) {
  return MONTHS.map((month) => ({
    month,
    revenue: MRR_HISTORY.find((h) => h.month === `${month} ${year}`)?.mrr ?? null,
  }));
}

export type PaymentMethod = "bKash" | "Bank" | "Nagad";
export const PAYMENT_METHODS: PaymentMethod[] = ["bKash", "Bank", "Nagad"];

/** Revenue received per month split by payment gateway (sample shares that drift month to month). */
export function paymentsByMonth(year: number) {
  return MONTHS.map((month, i) => {
    const total = MRR_HISTORY.find((h) => h.month === `${month} ${year}`)?.mrr;
    if (!total) return { month, bKash: null, Bank: null, Nagad: null };
    const round = (n: number) => Math.round(n / 500) * 500;
    const bKash = round(total * (0.42 + (i % 4) * 0.02));
    const Nagad = round(total * (0.18 + (i % 3) * 0.02));
    return { month, bKash, Bank: total - bKash - Nagad, Nagad };
  });
}

/** Platform-wide SMS sent per day, last 14 days. */
export const SMS_DAILY = [
  { day: "1 Oct", sms: 1180 },
  { day: "2 Oct", sms: 1320 },
  { day: "3 Oct", sms: 240 },
  { day: "4 Oct", sms: 1410 },
  { day: "5 Oct", sms: 1360 },
  { day: "6 Oct", sms: 1290 },
  { day: "7 Oct", sms: 1505 },
  { day: "8 Oct", sms: 1440 },
  { day: "9 Oct", sms: 1620 },
  { day: "10 Oct", sms: 310 },
  { day: "11 Oct", sms: 1580 },
  { day: "12 Oct", sms: 1490 },
  { day: "13 Oct", sms: 1710 },
  { day: "14 Oct", sms: 980 },
];

export const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: "DR-1042",
    name: "Md. Jahangir Alam",
    institute: "Teesta Model High School",
    type: "school",
    phone: "01XXX-XXX301",
    email: "teesta.mhs@example.com",
    students: "300 – 1,500",
    message: "Need attendance SMS and fee collection with bKash.",
    createdAt: "2026-10-14T09:12:00",
    status: "new",
  },
  {
    id: "DR-1041",
    name: "Maulana Rashed Ahmed",
    institute: "Jamiatul Uloom Feni",
    type: "qawmi",
    phone: "01XXX-XXX302",
    students: "300 – 1,500",
    message: "Interested in Hifz tracking and boarding meal count.",
    createdAt: "2026-10-13T20:45:00",
    status: "new",
  },
  {
    id: "DR-1040",
    name: "Sabina Yasmin",
    institute: "Little Stars Kindergarten",
    type: "school",
    phone: "01XXX-XXX303",
    email: "littlestars@example.com",
    students: "Under 300",
    createdAt: "2026-10-13T11:05:00",
    status: "contacted",
  },
  {
    id: "DR-1039",
    name: "Prof. Anisur Rahman",
    institute: "Surma Degree College",
    type: "college",
    phone: "01XXX-XXX304",
    email: "surma.dc@example.com",
    students: "1,500 – 5,000",
    message: "Tabulation for HSC and degree results.",
    createdAt: "2026-10-12T15:30:00",
    status: "scheduled",
  },
  {
    id: "DR-1038",
    name: "Hafez Nurul Amin",
    institute: "Darul Quran Hifz Madrasah",
    type: "hifz",
    phone: "01XXX-XXX305",
    students: "Under 300",
    createdAt: "2026-10-11T10:20:00",
    status: "scheduled",
  },
  {
    id: "DR-1037",
    name: "Sharmin Sultana",
    institute: "Brahmaputra Academy",
    type: "school",
    phone: "01XXX-XXX215",
    email: "brahmaputra@example.com",
    students: "300 – 1,500",
    createdAt: "2026-10-08T09:40:00",
    status: "won",
  },
  {
    id: "DR-1036",
    name: "Kamal Hossain",
    institute: "Bright Future Coaching",
    type: "coaching",
    phone: "01XXX-XXX306",
    students: "Under 300",
    message: "Only need SMS, not the full system.",
    createdAt: "2026-10-05T17:15:00",
    status: "lost",
  },
  {
    id: "DR-1035",
    name: "Maulana Saiful Islam",
    institute: "Ar-Rahman Dakhil Madrasah",
    type: "alia",
    phone: "01XXX-XXX214",
    email: "arrahman@example.com",
    students: "300 – 1,500",
    createdAt: "2026-10-02T13:00:00",
    status: "won",
  },
];

export const INVOICES: Invoice[] = [
  { id: "ACD-2026-10-016", institute: "karnaphuli-campus", period: "Oct 2026", amount: 15000, status: "paid", method: "Bank", issuedOn: "2026-10-01", paidOn: "2026-10-03" },
  { id: "ACD-2026-10-015", institute: "noor-academy", period: "Oct 2026", amount: 12000, status: "paid", method: "Bank", issuedOn: "2026-10-01", paidOn: "2026-10-02" },
  { id: "ACD-2026-10-014", institute: "sunrise-model-school", period: "Oct 2026", amount: 4500, status: "paid", method: "bKash", issuedOn: "2026-10-01", paidOn: "2026-10-04" },
  { id: "ACD-2026-10-013", institute: "madinatul-uloom", period: "Oct 2026", amount: 4500, status: "paid", method: "Nagad", issuedOn: "2026-10-01", paidOn: "2026-10-06" },
  { id: "ACD-2026-10-012", institute: "rupsha-college", period: "Oct 2026", amount: 4500, status: "overdue", issuedOn: "2026-10-01" },
  { id: "ACD-2026-10-011", institute: "darussalam-alia", period: "Oct 2026", amount: 4500, status: "paid", method: "bKash", issuedOn: "2026-10-01", paidOn: "2026-10-05" },
  { id: "ACD-2026-10-010", institute: "green-valley-school", period: "Oct 2026", amount: 4500, status: "due", issuedOn: "2026-10-01" },
  { id: "ACD-2026-10-009", institute: "meghna-ideal-college", period: "Oct 2026", amount: 4500, status: "paid", method: "Bank", issuedOn: "2026-10-01", paidOn: "2026-10-08" },
  { id: "ACD-2026-10-008", institute: "al-furqan-hifz", period: "Oct 2026", amount: 1500, status: "paid", method: "bKash", issuedOn: "2026-10-01", paidOn: "2026-10-02" },
  { id: "ACD-2026-10-007", institute: "shapla-high-school", period: "Oct 2026", amount: 1500, status: "paid", method: "Nagad", issuedOn: "2026-10-01", paidOn: "2026-10-09" },
  { id: "ACD-2026-10-006", institute: "pathshala-coaching", period: "Oct 2026", amount: 1500, status: "due", issuedOn: "2026-10-01" },
  { id: "ACD-2026-09-012", institute: "jamia-islamia-bogura", period: "Sep 2026", amount: 1500, status: "overdue", issuedOn: "2026-09-01" },
  { id: "ACD-2026-10-005", institute: "jamia-islamia-bogura", period: "Oct 2026", amount: 1500, status: "overdue", issuedOn: "2026-10-01" },
  { id: "ACD-2026-09-011", institute: "sunrise-model-school", period: "Sep 2026", amount: 4500, status: "paid", method: "bKash", issuedOn: "2026-09-01", paidOn: "2026-09-03" },
];

export const ACTIVITY: ActivityItem[] = [
  { id: "a1", kind: "signup", text: "Started a 30-day free trial", institute: "brahmaputra-academy", at: "2026-10-11T10:02:00" },
  { id: "a2", kind: "demo", text: "New demo request from Teesta Model High School", at: "2026-10-14T09:12:00" },
  { id: "a3", kind: "payment", text: "Paid ৳1,500 by Nagad", institute: "shapla-high-school", at: "2026-10-09T13:40:00" },
  { id: "a4", kind: "sms", text: "SMS credit is at 98% of the monthly limit", institute: "rupsha-college", at: "2026-10-13T16:20:00" },
  { id: "a5", kind: "overdue", text: "October invoice is 13 days overdue", institute: "rupsha-college", at: "2026-10-14T08:00:00" },
  { id: "a6", kind: "upgrade", text: "Upgraded from Institute to Campus", institute: "karnaphuli-campus", at: "2026-07-20T11:15:00" },
  { id: "a7", kind: "payment", text: "Paid ৳4,500 by Bank transfer", institute: "meghna-ideal-college", at: "2026-10-08T12:05:00" },
];

export function getInstitute(slug: string) {
  return INSTITUTES.find((i) => i.slug === slug);
}

const takaFormat = new Intl.NumberFormat("en-IN");
/** ৳4,82,300 — Bangladeshi lakh grouping. */
export const formatTaka = (n: number) => `৳${takaFormat.format(n)}`;
export const formatNumber = (n: number) => takaFormat.format(n);

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** "2 days ago" relative to TODAY (sample data clock), so the console reads consistently. */
export function timeAgo(iso: string) {
  const now = new Date(`${TODAY}T11:00:00`).getTime();
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function platformTotals() {
  const paying = INSTITUTES.filter((i) => i.status === "active" || i.status === "past_due");
  return {
    institutes: INSTITUTES.length,
    active: INSTITUTES.filter((i) => i.status === "active").length,
    trials: INSTITUTES.filter((i) => i.status === "trial").length,
    pastDue: INSTITUTES.filter((i) => i.status === "past_due").length,
    students: INSTITUTES.reduce((s, i) => s + i.students, 0),
    mrr: paying.reduce((s, i) => s + i.mrr, 0),
    smsThisMonth: INSTITUTES.reduce((s, i) => s + i.smsUsed, 0),
    outstanding: INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0),
    newDemos: DEMO_REQUESTS.filter((d) => d.status === "new").length,
  };
}
