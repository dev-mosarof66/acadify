/**
 * Platform (Super Admin) tables. Institute-level tables (students, attendance, fees…) come next.
 * Auth users, organizations and members live in Neon Auth's own `neon_auth` schema.
 */
import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const instituteType = pgEnum("institute_type", ["school", "college", "qawmi", "alia", "hifz", "coaching", "unified"]);
export const instituteStatus = pgEnum("institute_status", ["active", "trial", "past_due", "suspended"]);
export const demoStatus = pgEnum("demo_status", ["new", "contacted", "scheduled", "won", "lost"]);
export const invoiceStatus = pgEnum("invoice_status", ["paid", "due", "overdue"]);
export const paymentMethod = pgEnum("payment_method", ["bKash", "Nagad", "Bank"]);
export const activityKind = pgEnum("activity_kind", ["signup", "payment", "upgrade", "sms", "overdue", "demo"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Subscription plans, managed by the super admin on /admin/plans and shown on the website's pricing section.
 * "trial" is the built-in free trial every new institute can start on.
 */
export const plans = pgTable("plans", {
  /** Stable id used by institutes.plan, e.g. "institute". */
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn").notNull().default(""),
  /** Short line under the name, e.g. "Up to 300 students". */
  tagline: text("tagline").notNull().default(""),
  taglineBn: text("tagline_bn").notNull().default(""),
  /** Monthly price in BDT; null for custom-priced plans ("Talk to us"). */
  priceBdt: integer("price_bdt"),
  /** Price for a full year in BDT, when paid yearly; null = no yearly option. */
  yearlyPriceBdt: integer("yearly_price_bdt"),
  /** Maximum students; null for unlimited. */
  studentLimit: integer("student_limit"),
  features: text("features")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  featuresBn: text("features_bn")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  /** Highlighted as "Most popular" on the website. */
  featured: boolean("featured").notNull().default(false),
  /** Shown on the website's pricing section. */
  isPublic: boolean("is_public").notNull().default(true),
  /** Offered for new institutes; archived plans stay on the institutes that already use them. */
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const institutes = pgTable(
  "institutes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Subdomain: {slug}.<NEXT_PUBLIC_APP_DOMAIN> */
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: instituteType("type").notNull(),
    district: text("district").notNull(),
    plan: text("plan")
      .notNull()
      .references(() => plans.key),
    status: instituteStatus("status").notNull().default("trial"),
    /** Links to neon_auth.organization once sign-in is connected. */
    organizationId: text("organization_id").unique(),
    /** Current monthly recurring revenue in BDT (0 on trial or when suspended). */
    mrrBdt: integer("mrr_bdt").notNull().default(0),
    // Snapshot counters; replaced by live counts once institute tables exist.
    studentCount: integer("student_count").notNull().default(0),
    staffCount: integer("staff_count").notNull().default(0),
    smsUsed: integer("sms_used").notNull().default(0),
    smsCredit: integer("sms_credit").notNull().default(500),
    modules: text("modules")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    contactName: text("contact_name").notNull(),
    contactRole: text("contact_role").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email").notNull(),
    joinedOn: date("joined_on").notNull().defaultNow(),
    /** Next renewal, or the trial end date while on trial. */
    renewsOn: date("renews_on").notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("institutes_status_idx").on(t.status), index("institutes_type_idx").on(t.type)]
);

export const platformInvoices = pgTable(
  "platform_invoices",
  {
    /** Human-readable number, e.g. ACD-2026-10-016 */
    id: text("id").primaryKey(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    /** First day of the billed month. */
    periodStart: date("period_start").notNull(),
    amountBdt: integer("amount_bdt").notNull(),
    status: invoiceStatus("status").notNull().default("due"),
    method: paymentMethod("method"),
    issuedOn: date("issued_on").notNull(),
    paidOn: date("paid_on"),
    ...timestamps,
  },
  (t) => [
    index("platform_invoices_institute_idx").on(t.instituteId),
    index("platform_invoices_period_idx").on(t.periodStart),
    index("platform_invoices_status_idx").on(t.status),
  ]
);

export const demoRequests = pgTable(
  "demo_requests",
  {
    /** Shown as DR-{id}. */
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1001 }),
    name: text("name").notNull(),
    instituteName: text("institute_name").notNull(),
    type: instituteType("type").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    studentsRange: text("students_range"),
    message: text("message"),
    status: demoStatus("status").notNull().default("new"),
    ...timestamps,
  },
  (t) => [index("demo_requests_status_idx").on(t.status), index("demo_requests_created_idx").on(t.createdAt)]
);

export const platformActivity = pgTable(
  "platform_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: activityKind("kind").notNull(),
    text: text("text").notNull(),
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("platform_activity_created_idx").on(t.createdAt)]
);

export type PlanRow = typeof plans.$inferSelect;
export type InstituteRow = typeof institutes.$inferSelect;
export type InvoiceRow = typeof platformInvoices.$inferSelect;
export type DemoRequestRow = typeof demoRequests.$inferSelect;
export type ActivityRow = typeof platformActivity.$inferSelect;

/* ----------------------------------------------------------------------------
 * RBAC: which institute a signed-in user belongs to, and their role there.
 * Users themselves live in Neon Auth (neon_auth."user"); platform super admins
 * are users with role = 'admin' there and need no membership row.
 * ------------------------------------------------------------------------- */

export const instituteRole = pgEnum("institute_role", ["principal", "institute_admin", "accountant", "teacher", "student", "guardian"]);

export const instituteMembers = pgTable(
  "institute_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** neon_auth."user".id */
    userId: text("user_id").notNull(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    role: instituteRole("role").notNull(),
    /** Super admin who added this member (neon_auth user id). */
    invitedBy: text("invited_by"),
    /** Last sign-in or dashboard use by this person in this institute. */
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("institute_members_user_institute_idx").on(t.userId, t.instituteId), index("institute_members_institute_idx").on(t.instituteId)]
);

export type InstituteMemberRow = typeof instituteMembers.$inferSelect;

/**
 * One-time codes for the admin sign-in step (super admins, principals, institute admins).
 * Each code belongs to the Neon Auth session that passed the password check; only a hash is stored.
 */
export const adminLoginCodes = pgTable(
  "admin_login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** neon_auth."user".id */
    userId: text("user_id").notNull(),
    /** neon_auth session id the code unlocks */
    sessionId: text("session_id").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_login_codes_session_idx").on(t.sessionId), index("admin_login_codes_user_created_idx").on(t.userId, t.createdAt)]
);

/**
 * Platform-wide settings the super admin edits on /admin/settings. Always exactly one row (id = 1).
 * Empty phone/WhatsApp hide those contact options on the website.
 */
export const platformSettings = pgTable(
  "platform_settings",
  {
    id: integer("id").primaryKey().default(1),
    /** Length of the free trial for new institutes. */
    trialDays: integer("trial_days").notNull().default(30),
    /** "How to pay" text on invoice emails (bKash/Nagad numbers, bank account…). */
    paymentInstructions: text("payment_instructions").notNull().default(""),
    supportEmail: text("support_email").notNull().default("support@acadify.app"),
    salesEmail: text("sales_email").notNull().default("sales@acadify.app"),
    phone: text("phone").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    office: text("office").notNull().default(""),
    officeBn: text("office_bn").notNull().default(""),
    /** Sender name or number shown on outgoing SMS (as approved by the SMS provider). */
    smsSenderId: text("sms_sender_id").notNull().default(""),
    /** What one SMS part costs, in poisha; institutes are charged the same (no markup). */
    smsRatePoisha: integer("sms_rate_poisha").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("platform_settings_single_row", sql`${t.id} = 1`)]
);

/* ---------------------------------------------------------------- SMS gateway */

export const smsStatus = pgEnum("sms_status", ["queued", "sent", "delivered", "failed"]);

/** Every SMS sent through the platform's gateway (attendance alerts, fee reminders, tests…). */
export const smsMessages = pgTable(
  "sms_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null for platform messages (e.g. a super admin's test SMS). */
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "set null" }),
    to: text("to").notNull(),
    body: text("body").notNull(),
    /** Billable SMS parts (long or Bangla messages use several). */
    segments: integer("segments").notNull().default(1),
    status: smsStatus("status").notNull().default("queued"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    /** What it cost, in poisha (৳1 = 100 poisha). */
    costPoisha: integer("cost_poisha").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sms_messages_institute_created_idx").on(t.instituteId, t.createdAt), index("sms_messages_created_idx").on(t.createdAt)]
);

/** SMS credit changes per institute: top-ups (positive) and corrections. Balance lives on institutes.sms_credit. */
export const smsCreditTransactions = pgTable(
  "sms_credit_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    /** SMS credits added (positive) or removed (negative). */
    credits: integer("credits").notNull(),
    note: text("note").notNull().default(""),
    /** neon_auth user id of the super admin who made the change. */
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sms_credit_tx_institute_idx").on(t.instituteId, t.createdAt)]
);

/* ---------------------------------------------------------------- support tickets */

export const ticketStatus = pgEnum("ticket_status", ["open", "pending", "resolved"]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high"]);
export const ticketChannel = pgEnum("ticket_channel", ["phone", "email", "whatsapp", "in_person"]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    /** Shown as T-{id}. */
    id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1001 }),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    priority: ticketPriority("priority").notNull().default("normal"),
    /** How the institute reached us. */
    channel: ticketChannel("channel").notNull().default("phone"),
    /** Who raised it; replies are emailed here. */
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    createdBy: text("created_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("support_tickets_status_idx").on(t.status), index("support_tickets_institute_idx").on(t.instituteId)]
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    /** "staff" = Acadify team, "institute" = what the institute told us. */
    author: text("author").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    /** Internal notes are never emailed or shown to the institute. */
    internal: boolean("internal").notNull().default(false),
    emailed: boolean("emailed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)]
);

/* ---------------------------------------------------------------- institute: classes, sections, students */

export const shift = pgEnum("shift", ["morning", "day", "evening"]);
export const gender = pgEnum("gender", ["male", "female"]);
export const studentStatus = pgEnum("student_status", ["active", "left", "graduated"]);

/** A class or grade in one institute, e.g. "Class 6", "Dakhil 9th", "Hifz". */
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("classes_institute_name_idx").on(t.instituteId, t.name)]
);

/** A section of a class ("A", "Boys", "Science"), taught in one shift. */
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shift: shift("shift").notNull().default("day"),
    /** Seats; null = no limit. */
    capacity: integer("capacity"),
    ...timestamps,
  },
  (t) => [uniqueIndex("sections_class_name_shift_idx").on(t.classId, t.name, t.shift), index("sections_institute_idx").on(t.instituteId)]
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    /** Institute-unique ID: two-digit admission year + sequence, e.g. 260001. */
    studentCode: text("student_code").notNull(),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull().default(""),
    gender: gender("gender").notNull(),
    dateOfBirth: date("date_of_birth"),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "restrict" }),
    roll: integer("roll").notNull(),
    guardianName: text("guardian_name").notNull(),
    /** "Father", "Mother", "Uncle"… */
    guardianRelation: text("guardian_relation").notNull().default(""),
    /** BD mobile, digits only (01XXXXXXXXX); attendance and fee SMS go here. */
    guardianPhone: text("guardian_phone").notNull(),
    address: text("address").notNull().default(""),
    /** Object key of the photo in the private files bucket. */
    photoKey: text("photo_key"),
    status: studentStatus("status").notNull().default("active"),
    admittedOn: date("admitted_on").notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("students_institute_code_idx").on(t.instituteId, t.studentCode),
    // Rolls are unique within a section among students who are still there
    uniqueIndex("students_section_roll_active_idx")
      .on(t.sectionId, t.roll)
      .where(sql`${t.status} = 'active'`),
    index("students_institute_class_idx").on(t.instituteId, t.classId),
  ]
);

/** Website FAQs, managed on /admin/faqs and shown on the homepage. */
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  questionBn: text("question_bn").notNull().default(""),
  answer: text("answer").notNull(),
  answerBn: text("answer_bn").notNull().default(""),
  /** Shown on the website. */
  isPublic: boolean("is_public").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/* ---------------------------------------------------------------- teachers and attendance */

/** Which staff teach which section. A teacher can take attendance for their sections. */
export const sectionTeachers = pgTable(
  "section_teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => instituteMembers.id, { onDelete: "cascade" }),
    /** The section's class teacher (one per section). */
    isClassTeacher: boolean("is_class_teacher").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("section_teachers_section_member_idx").on(t.sectionId, t.memberId), index("section_teachers_member_idx").on(t.memberId)]
);

export const attendanceStatus = pgEnum("attendance_status", ["present", "absent", "late", "leave"]);

/** One student's attendance on one day. */
export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    /** School day, in Dhaka time. */
    date: date("date").notNull(),
    status: attendanceStatus("status").notNull(),
    /** neon_auth user id of who marked it. */
    markedBy: text("marked_by").notNull(),
    /** When the guardian was sent an absence SMS (null = not sent). */
    smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("attendance_student_date_idx").on(t.studentId, t.date),
    index("attendance_section_date_idx").on(t.sectionId, t.date),
    index("attendance_institute_date_idx").on(t.instituteId, t.date),
  ]
);

/* ---------------------------------------------------------------- fees */

export const feeFrequency = pgEnum("fee_frequency", ["monthly", "one_time"]);
export const feeBillStatus = pgEnum("fee_bill_status", ["due", "partial", "paid", "waived"]);
export const feePaymentMethod = pgEnum("fee_payment_method", ["cash", "bkash", "nagad", "rocket", "bank"]);

/** A kind of fee the institute charges: Tuition (monthly), Admission (one time), Exam fee… */
export const feeHeads = pgTable(
  "fee_heads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull().default(""),
    frequency: feeFrequency("frequency").notNull().default("monthly"),
    /** Default amount in taka; classes can override it in fee_head_amounts. */
    amount: integer("amount").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("fee_heads_institute_idx").on(t.instituteId)]
);

/** Per-class amount for a fee head (e.g. Class 9 tuition costs more than Class 6). */
export const feeHeadAmounts = pgTable(
  "fee_head_amounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feeHeadId: uuid("fee_head_id")
      .notNull()
      .references(() => feeHeads.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
  },
  (t) => [uniqueIndex("fee_head_amounts_head_class_idx").on(t.feeHeadId, t.classId)]
);

/** A bill for one student: a month's fees, or a one-time charge. */
export const feeBills = pgTable(
  "fee_bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    /** Institute-unique bill number, e.g. B-2610-0001. */
    billNo: text("bill_no").notNull(),
    title: text("title").notNull(),
    /** "2026-10" for monthly bills; null for one-time bills. */
    month: text("month"),
    total: integer("total").notNull(),
    paid: integer("paid").notNull().default(0),
    status: feeBillStatus("status").notNull().default("due"),
    dueDate: date("due_date").notNull(),
    createdBy: text("created_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("fee_bills_institute_no_idx").on(t.instituteId, t.billNo),
    // One monthly bill per student per month
    uniqueIndex("fee_bills_student_month_idx")
      .on(t.studentId, t.month)
      .where(sql`${t.month} is not null`),
    index("fee_bills_institute_status_idx").on(t.instituteId, t.status),
  ]
);

export const feeBillItems = pgTable("fee_bill_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => feeBills.id, { onDelete: "cascade" }),
  feeHeadId: uuid("fee_head_id").references(() => feeHeads.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
});

/** Money received at the counter (or by mobile banking), with its receipt number. */
export const feePayments = pgTable(
  "fee_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    /** Institute-unique receipt number, e.g. R-2610-0001. */
    receiptNo: text("receipt_no").notNull(),
    amount: integer("amount").notNull(),
    method: feePaymentMethod("method").notNull().default("cash"),
    /** bKash/Nagad transaction id or bank reference. */
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    receivedBy: text("received_by").notNull(),
    receivedByName: text("received_by_name").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fee_payments_institute_receipt_idx").on(t.instituteId, t.receiptNo), index("fee_payments_institute_paid_idx").on(t.instituteId, t.paidAt)]
);

/** Which bills a payment paid off, and how much of each. */
export const feePaymentAllocations = pgTable("fee_payment_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => feePayments.id, { onDelete: "cascade" }),
  billId: uuid("bill_id")
    .notNull()
    .references(() => feeBills.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
});

/* ---------------------------------------------------------------- exams and results */

export const gradingScale = pgEnum("grading_scale", ["gpa5", "qawmi"]);

/** A subject taught in a class, with its marks. */
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull().default(""),
    fullMarks: integer("full_marks").notNull().default(100),
    passMarks: integer("pass_marks").notNull().default(33),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("subjects_class_name_idx").on(t.classId, t.name)]
);

/** An exam (Half-yearly, Annual…) that every class sits. */
export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: date("starts_on"),
    gradingScale: gradingScale("grading_scale").notNull().default("gpa5"),
    /** Results are visible to students and guardians once published. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("exams_institute_idx").on(t.instituteId)]
);

/** One student's marks in one subject of one exam. Null marks + absent = didn't sit it. */
export const examMarks = pgTable(
  "exam_marks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    marks: integer("marks"),
    absent: boolean("absent").notNull().default(false),
    enteredBy: text("entered_by").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("exam_marks_exam_student_subject_idx").on(t.examId, t.studentId, t.subjectId), index("exam_marks_exam_idx").on(t.examId)]
);

/* ---------------------------------------------------------------- hifz */

export const hifzRating = pgEnum("hifz_rating", ["mumtaz", "jayyid_jiddan", "jayyid", "maqbul", "needs_work"]);

/** A hifz student's lesson for one day: new lesson (sabak), recent revision (sabki) and older revision (dour). */
export const hifzLogs = pgTable(
  "hifz_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    /** e.g. "Para 5 · Al-Baqarah 1–10" */
    sabak: text("sabak").notNull().default(""),
    /** Para number of the new lesson, for the progress map. */
    sabakPara: integer("sabak_para"),
    sabki: text("sabki").notNull().default(""),
    dour: text("dour").notNull().default(""),
    rating: hifzRating("rating"),
    note: text("note").notNull().default(""),
    teacherId: text("teacher_id").notNull(),
    teacherName: text("teacher_name").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("hifz_logs_student_date_idx").on(t.studentId, t.date), index("hifz_logs_institute_date_idx").on(t.instituteId, t.date)]
);

/** Paras (1–30) a student has fully memorized. */
export const hifzParas = pgTable(
  "hifz_paras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    para: integer("para").notNull(),
    completedOn: date("completed_on").notNull(),
    markedBy: text("marked_by").notNull(),
  },
  (t) => [uniqueIndex("hifz_paras_student_para_idx").on(t.studentId, t.para)]
);

/* ---------------------------------------------------------------- lecture sheets */

/** A study sheet (PDF, Word, image) for a class, optionally for one subject. */
export const lectureSheets = pgTable(
  "lecture_sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** Object key in the private files bucket. */
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedByName: text("uploaded_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lecture_sheets_institute_class_idx").on(t.instituteId, t.classId)]
);

/* ---------------------------------------------------------------- student and guardian portal */

/** Which students a guardian or student account can see in the portal. */
export const studentAccess = pgTable(
  "student_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => instituteMembers.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("student_access_member_student_idx").on(t.memberId, t.studentId), index("student_access_student_idx").on(t.studentId)]
);
