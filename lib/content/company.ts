import type { Locale } from "@/lib/i18n/types";

export interface LegalSection {
  id: string;
  title: string;
  body: string[];
  list?: string[];
}

export interface LegalDoc {
  tag: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export interface AboutContent {
  tag: string;
  title: string;
  highlight: string;
  description: string;
  storyTag: string;
  storyTitle: string;
  story: string[];
  missionTitle: string;
  mission: string;
  visionTitle: string;
  vision: string;
  valuesTag: string;
  valuesTitle: string;
  valuesDescription: string;
  values: { title: string; desc: string }[];
  promiseTag: string;
  promiseTitle: string;
  promises: string[];
}

export interface CompanyUi {
  lastUpdated: string;
  updatedDate: string;
  onThisPage: string;
  questionsTitle: string;
  questionsDesc: string;
  contactEmail: string;
  backHome: string;
}

/** Shown on every legal page. Update when any policy text changes. */
const UPDATED = { en: "14 October 2026", bn: "১৪ অক্টোবর ২০২৬" };
const ui: Record<Locale, CompanyUi> = {
  en: {
    lastUpdated: "Last updated",
    updatedDate: UPDATED.en,
    onThisPage: "On this page",
    questionsTitle: "Questions about this policy?",
    questionsDesc: "Write to us and our team will reply within two working days.",
    contactEmail: "Email us",
    backHome: "Back to home",
  },
  bn: {
    lastUpdated: "সর্বশেষ হালনাগাদ",
    updatedDate: UPDATED.bn,
    onThisPage: "এই পাতায়",
    questionsTitle: "এই নীতি নিয়ে প্রশ্ন আছে?",
    questionsDesc: "আমাদের লিখুন, দুই কর্মদিবসের মধ্যে আমাদের টিম উত্তর দেবে।",
    contactEmail: "ইমেইল করুন",
    backHome: "হোমে ফিরে যান",
  },
};

const about: Record<Locale, AboutContent> = {
  en: {
    tag: "About Us",
    title: "We Give Teachers Their Time Back",
    highlight: "Time Back",
    description:
      "Acadify is an institutional operating system built in Bangladesh for schools, colleges and madrasahs. We turn the office work that eats up every school day into a single click.",
    storyTag: "Our Story",
    storyTitle: "Started in a School Office",
    story: [
      "Acadify began after watching a school office spend its whole morning on the same jobs: copying the attendance register, calling guardians of absent students one by one, and writing fee receipts in three copies by hand.",
      "None of this work was hard. It was just repeated, every single day, by people who would rather be teaching. Existing software either ignored madrasahs entirely or needed a computer expert to run it.",
      "So we built one system that understands NCTB classes and GPA, Qawmi and Alia madrasahs, daily Hifz lessons, bKash payments and Bangla SMS, and that an office assistant can learn in an afternoon.",
    ],
    missionTitle: "Our Mission",
    mission: "Remove repetitive office work from every institute in Bangladesh, so teachers and staff can spend their time on students.",
    visionTitle: "Our Vision",
    vision: "A country where every school and madrasah, large or small, runs on modern tools in its own language.",
    valuesTag: "Our Values",
    valuesTitle: "What Guides Our Work",
    valuesDescription: "Four principles we check every feature against before it ships.",
    values: [
      { title: "Respect for Every Institute", desc: "A village madrasah and a city college deserve the same quality of tools." },
      { title: "Simple Before Clever", desc: "If an office assistant cannot use it in one afternoon, we have not finished building it." },
      { title: "Bangla First", desc: "Every screen, message and printout works fully in Bangla, not as an afterthought." },
      { title: "Your Data, Your Trust", desc: "Institute data belongs to the institute. We protect it, back it up and never sell it." },
    ],
    promiseTag: "Our Promise",
    promiseTitle: "What Every Institute Gets From Us",
    promises: [
      "Free import of your existing student records",
      "Staff training in Bangla, on-site or online",
      "Phone and WhatsApp support from real people",
      "Export all your data at any time, no questions asked",
    ],
  },
  bn: {
    tag: "আমাদের সম্পর্কে",
    title: "আমরা শিক্ষকদের সময় ফিরিয়ে দিই",
    highlight: "সময় ফিরিয়ে দিই",
    description:
      "এক্যাডিফাই বাংলাদেশে তৈরি স্কুল, কলেজ ও মাদরাসার জন্য একটি ইনস্টিটিউশনাল অপারেটিং সিস্টেম। প্রতিদিনের যে অফিসের কাজ পুরো দিন খেয়ে ফেলে, আমরা তা এক ক্লিকে নিয়ে আসি।",
    storyTag: "আমাদের গল্প",
    storyTitle: "শুরু একটি স্কুলের অফিস থেকে",
    story: [
      "এক্যাডিফাই শুরু হয় একটি স্কুল অফিসকে পুরো সকাল একই কাজে ব্যস্ত থাকতে দেখে: হাজিরা খাতা কপি করা, একে একে অনুপস্থিত শিক্ষার্থীর অভিভাবককে ফোন করা, আর হাতে তিন কপি ফি রসিদ লেখা।",
      "এই কাজগুলো কঠিন নয়। কিন্তু প্রতিদিন এগুলো করতে হয় এমন মানুষদের, যারা আসলে পড়াতে চান। বিদ্যমান সফটওয়্যারগুলো হয় মাদরাসাকে পুরোপুরি উপেক্ষা করত, নয়তো চালাতে কম্পিউটার বিশেষজ্ঞ লাগত।",
      "তাই আমরা এমন একটি সিস্টেম তৈরি করেছি যা এনসিটিবি শ্রেণী ও জিপিএ, কওমি ও আলিয়া মাদরাসা, দৈনিক হিফজ সবক, বিকাশ পেমেন্ট ও বাংলা এসএমএস বোঝে — এবং একজন অফিস সহকারী এক বিকেলেই শিখে নিতে পারেন।",
    ],
    missionTitle: "আমাদের লক্ষ্য",
    mission: "বাংলাদেশের প্রতিটি প্রতিষ্ঠান থেকে পুনরাবৃত্তিমূলক অফিসের কাজ দূর করা, যাতে শিক্ষক ও স্টাফরা শিক্ষার্থীদের জন্য সময় দিতে পারেন।",
    visionTitle: "আমাদের স্বপ্ন",
    vision: "এমন একটি দেশ, যেখানে ছোট-বড় প্রতিটি স্কুল ও মাদরাসা নিজের ভাষায় আধুনিক প্রযুক্তিতে চলে।",
    valuesTag: "আমাদের মূল্যবোধ",
    valuesTitle: "যা আমাদের কাজের পথ দেখায়",
    valuesDescription: "প্রতিটি ফিচার চালুর আগে আমরা এই চারটি নীতিতে যাচাই করি।",
    values: [
      { title: "প্রতিটি প্রতিষ্ঠানের প্রতি সম্মান", desc: "গ্রামের মাদরাসা ও শহরের কলেজ — দুটোই সমান মানের টুল পাওয়ার যোগ্য।" },
      { title: "জটিলতার আগে সরলতা", desc: "একজন অফিস সহকারী এক বিকেলে শিখতে না পারলে, আমাদের কাজ এখনো শেষ হয়নি।" },
      { title: "বাংলা সবার আগে", desc: "প্রতিটি স্ক্রিন, বার্তা ও প্রিন্ট সম্পূর্ণ বাংলায় কাজ করে — পরে যোগ করা কিছু নয়।" },
      { title: "আপনার তথ্য, আপনার আস্থা", desc: "প্রতিষ্ঠানের তথ্য প্রতিষ্ঠানেরই। আমরা তা সুরক্ষিত রাখি, ব্যাকআপ রাখি এবং কখনো বিক্রি করি না।" },
    ],
    promiseTag: "আমাদের অঙ্গীকার",
    promiseTitle: "প্রতিটি প্রতিষ্ঠান আমাদের কাছ থেকে যা পায়",
    promises: [
      "বিদ্যমান শিক্ষার্থী তথ্য বিনামূল্যে স্থানান্তর",
      "সরেজমিনে বা অনলাইনে বাংলায় স্টাফ প্রশিক্ষণ",
      "আসল মানুষের কাছ থেকে ফোন ও হোয়াটসঅ্যাপ সাপোর্ট",
      "যেকোনো সময় সব তথ্য এক্সপোর্ট, কোনো প্রশ্ন ছাড়াই",
    ],
  },
};

const privacy: Record<Locale, LegalDoc> = {
  en: {
    tag: "Privacy Policy",
    title: "How We Protect Your Institute's Data",
    intro:
      "This policy explains what information Acadify collects when your institute uses our service, how we use it, and the choices you have. We wrote it in plain language because you should not need a lawyer to understand it.",
    sections: [
      {
        id: "who-we-are",
        title: "Who we are",
        body: [
          "Acadify provides a cloud-based management system for schools, colleges and madrasahs in Bangladesh. When this policy says \"we\" or \"us\", it means Acadify. When it says \"institute\", it means the school, college or madrasah that has an Acadify account.",
          "The institute decides what student, guardian and staff information goes into Acadify. For that information, the institute is the owner and we process it only on the institute's instructions.",
        ],
      },
      {
        id: "what-we-collect",
        title: "Information we collect",
        body: ["Depending on the features your institute uses, Acadify may store:"],
        list: [
          "Institute details such as name, address, EIIN, phone number and logo",
          "Staff accounts, including name, email, phone number and role",
          "Student records, including name, class, roll number, photo, date of birth and guardian contact details",
          "Attendance, marks, results, Hifz progress and boarding records",
          "Fee invoices and payment records, including bKash, Nagad or bank transaction references",
          "Technical information such as browser type, device and login times, used to keep accounts secure",
        ],
      },
      {
        id: "how-we-use",
        title: "How we use information",
        body: ["We use the information only to run the service your institute signed up for:"],
        list: [
          "Sending attendance and fee SMS to guardians when the institute triggers them",
          "Generating invoices, receipts, mark sheets and reports",
          "Providing support when your staff ask for help",
          "Keeping accounts secure and detecting misuse",
          "Improving Acadify using anonymous, combined usage statistics",
        ],
      },
      {
        id: "sharing",
        title: "When we share information",
        body: [
          "We never sell institute, student or guardian data, and we never use it for advertising.",
          "We share information only with service providers we need to run Acadify, such as SMS gateways, payment providers and cloud hosting. Each one may use the data only to provide their service to us. We may also disclose information if Bangladeshi law requires it.",
        ],
      },
      {
        id: "security",
        title: "How we keep data safe",
        body: [
          "All data is encrypted in transit. Each institute's data is kept separate from every other institute, and staff only see what their role allows. We back up all data every day and test that backups can be restored.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep data",
        body: [
          "We keep institute data for as long as the account is active. If an institute closes its account, we keep the data for 90 days so it can be exported or restored, and then delete it permanently, except where the law requires us to keep financial records longer.",
        ],
      },
      {
        id: "your-rights",
        title: "Your choices and rights",
        body: [
          "Institute administrators can view, correct, export or delete their institute's data at any time from the settings page. Guardians and students who want their information changed should contact their institute directly, and we will help the institute act on the request.",
        ],
      },
      {
        id: "children",
        title: "Children's information",
        body: [
          "Most student records belong to children. We process them only for the institute's educational and administrative purposes, and we never contact students for any other reason.",
        ],
      },
      {
        id: "changes",
        title: "Changes to this policy",
        body: [
          "If we make an important change, we will tell institute administrators by email and inside Acadify at least 14 days before it takes effect.",
        ],
      },
    ],
  },
  bn: {
    tag: "গোপনীয়তা নীতি",
    title: "আপনার প্রতিষ্ঠানের তথ্য আমরা যেভাবে সুরক্ষিত রাখি",
    intro:
      "আপনার প্রতিষ্ঠান আমাদের সেবা ব্যবহার করলে এক্যাডিফাই কী তথ্য সংগ্রহ করে, কীভাবে ব্যবহার করে এবং আপনার কী কী সুযোগ আছে — এই নীতিতে তা ব্যাখ্যা করা হয়েছে। সহজ ভাষায় লিখেছি, কারণ এটি বুঝতে আইনজীবী লাগা উচিত নয়।",
    sections: [
      {
        id: "who-we-are",
        title: "আমরা কারা",
        body: [
          "এক্যাডিফাই বাংলাদেশের স্কুল, কলেজ ও মাদরাসার জন্য ক্লাউড-ভিত্তিক ব্যবস্থাপনা সিস্টেম সরবরাহ করে। এই নীতিতে \"আমরা\" বলতে এক্যাডিফাইকে বোঝানো হয়েছে। \"প্রতিষ্ঠান\" বলতে সেই স্কুল, কলেজ বা মাদরাসাকে বোঝানো হয়েছে যার এক্যাডিফাই অ্যাকাউন্ট আছে।",
          "শিক্ষার্থী, অভিভাবক ও স্টাফের কোন তথ্য এক্যাডিফাইতে রাখা হবে তা প্রতিষ্ঠান ঠিক করে। এসব তথ্যের মালিক প্রতিষ্ঠান, এবং আমরা শুধু প্রতিষ্ঠানের নির্দেশে তা প্রক্রিয়া করি।",
        ],
      },
      {
        id: "what-we-collect",
        title: "আমরা যে তথ্য সংগ্রহ করি",
        body: ["আপনার প্রতিষ্ঠান কোন ফিচার ব্যবহার করে তার ওপর ভিত্তি করে এক্যাডিফাই সংরক্ষণ করতে পারে:"],
        list: [
          "প্রতিষ্ঠানের নাম, ঠিকানা, ইআইআইএন, ফোন নম্বর ও লোগো",
          "স্টাফ অ্যাকাউন্ট — নাম, ইমেইল, ফোন নম্বর ও দায়িত্ব",
          "শিক্ষার্থীর তথ্য — নাম, শ্রেণী, রোল, ছবি, জন্মতারিখ ও অভিভাবকের যোগাযোগ",
          "হাজিরা, নম্বর, ফলাফল, হিফজ অগ্রগতি ও বোর্ডিংয়ের তথ্য",
          "ফি ইনভয়েস ও পেমেন্টের তথ্য, বিকাশ, নগদ বা ব্যাংক লেনদেনের রেফারেন্সসহ",
          "ব্রাউজার, ডিভাইস ও লগইনের সময়ের মতো প্রযুক্তিগত তথ্য, অ্যাকাউন্ট সুরক্ষার জন্য",
        ],
      },
      {
        id: "how-we-use",
        title: "তথ্য যেভাবে ব্যবহার করি",
        body: ["আপনার প্রতিষ্ঠান যে সেবা নিয়েছে, শুধু তা চালাতেই আমরা তথ্য ব্যবহার করি:"],
        list: [
          "প্রতিষ্ঠান চালু করলে অভিভাবকদের হাজিরা ও ফি-র এসএমএস পাঠানো",
          "ইনভয়েস, রসিদ, মার্কশিট ও রিপোর্ট তৈরি করা",
          "আপনার স্টাফ সাহায্য চাইলে সাপোর্ট দেওয়া",
          "অ্যাকাউন্ট সুরক্ষিত রাখা ও অপব্যবহার শনাক্ত করা",
          "নাম-পরিচয়হীন সমষ্টিগত পরিসংখ্যান দিয়ে এক্যাডিফাই উন্নত করা",
        ],
      },
      {
        id: "sharing",
        title: "যখন আমরা তথ্য শেয়ার করি",
        body: [
          "আমরা কখনো প্রতিষ্ঠান, শিক্ষার্থী বা অভিভাবকের তথ্য বিক্রি করি না এবং বিজ্ঞাপনে ব্যবহার করি না।",
          "এক্যাডিফাই চালাতে যাদের প্রয়োজন — যেমন এসএমএস গেটওয়ে, পেমেন্ট প্রদানকারী ও ক্লাউড হোস্টিং — শুধু তাদের সাথেই তথ্য শেয়ার করি। তারা কেবল আমাদের সেবা দিতেই তা ব্যবহার করতে পারে। বাংলাদেশের আইন অনুযায়ী প্রয়োজন হলে আমরা তথ্য প্রকাশ করতে পারি।",
        ],
      },
      {
        id: "security",
        title: "তথ্য যেভাবে সুরক্ষিত রাখি",
        body: [
          "সব তথ্য আদান-প্রদানের সময় এনক্রিপ্ট করা থাকে। প্রতিটি প্রতিষ্ঠানের তথ্য অন্য সব প্রতিষ্ঠান থেকে আলাদা রাখা হয়, এবং স্টাফরা শুধু নিজের দায়িত্ব অনুযায়ী তথ্য দেখতে পান। আমরা প্রতিদিন সব তথ্যের ব্যাকআপ রাখি এবং তা পুনরুদ্ধারযোগ্য কিনা পরীক্ষা করি।",
        ],
      },
      {
        id: "retention",
        title: "কতদিন তথ্য রাখি",
        body: [
          "অ্যাকাউন্ট চালু থাকা পর্যন্ত আমরা প্রতিষ্ঠানের তথ্য রাখি। কোনো প্রতিষ্ঠান অ্যাকাউন্ট বন্ধ করলে, এক্সপোর্ট বা পুনরুদ্ধারের জন্য ৯০ দিন তথ্য রাখি, তারপর স্থায়ীভাবে মুছে ফেলি — আইন অনুযায়ী আর্থিক রেকর্ড বেশিদিন রাখার প্রয়োজন হলে তা ছাড়া।",
        ],
      },
      {
        id: "your-rights",
        title: "আপনার সুযোগ ও অধিকার",
        body: [
          "প্রতিষ্ঠানের অ্যাডমিন যেকোনো সময় সেটিংস পাতা থেকে তথ্য দেখতে, সংশোধন, এক্সপোর্ট বা মুছে ফেলতে পারেন। অভিভাবক বা শিক্ষার্থী তথ্য পরিবর্তন করতে চাইলে সরাসরি প্রতিষ্ঠানে যোগাযোগ করবেন, এবং আমরা প্রতিষ্ঠানকে সে অনুযায়ী ব্যবস্থা নিতে সাহায্য করব।",
        ],
      },
      {
        id: "children",
        title: "শিশুদের তথ্য",
        body: [
          "বেশিরভাগ শিক্ষার্থীর তথ্য শিশুদের। আমরা তা শুধু প্রতিষ্ঠানের শিক্ষা ও প্রশাসনিক কাজে প্রক্রিয়া করি, এবং অন্য কোনো কারণে কখনো শিক্ষার্থীদের সাথে যোগাযোগ করি না।",
        ],
      },
      {
        id: "changes",
        title: "এই নীতির পরিবর্তন",
        body: [
          "গুরুত্বপূর্ণ কোনো পরিবর্তন হলে, কার্যকর হওয়ার অন্তত ১৪ দিন আগে আমরা প্রতিষ্ঠানের অ্যাডমিনদের ইমেইলে ও এক্যাডিফাইয়ের ভেতরে জানিয়ে দেব।",
        ],
      },
    ],
  },
};

const terms: Record<Locale, LegalDoc> = {
  en: {
    tag: "Terms of Service",
    title: "The Agreement Between Your Institute and Acadify",
    intro:
      "These terms apply when an institute creates an Acadify account or uses the service. By using Acadify, the institute agrees to them. Please read them with your management committee.",
    sections: [
      {
        id: "the-service",
        title: "The service",
        body: [
          "Acadify provides software for managing students, staff, attendance, fees, examinations, Hifz records and related work for schools, colleges and madrasahs. Features available to an institute depend on its plan.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts and access",
        body: [
          "The institute is responsible for the staff accounts it creates and for keeping passwords private. The institute admin decides which staff can see or change which information. Tell us immediately if you believe an account has been misused.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        body: ["When using Acadify, the institute agrees not to:"],
        list: [
          "Send SMS that are misleading, abusive or unrelated to the institute's work",
          "Upload information it has no right to hold",
          "Try to access another institute's data or disrupt the service",
          "Resell or share the service with organisations outside the account",
        ],
      },
      {
        id: "your-data",
        title: "Your data",
        body: [
          "The institute owns all the data it puts into Acadify. We use it only to provide the service, as described in our Privacy Policy. The institute can export its data at any time, including after deciding to leave.",
        ],
      },
      {
        id: "payment",
        title: "Fees and payment",
        body: [
          "Plan fees are billed monthly or yearly in advance, in Bangladeshi Taka. SMS is charged separately at the gateway's rate. If a payment is more than 15 days late, we may limit the account to read-only access until it is paid. We never delete data because of a late payment.",
        ],
      },
      {
        id: "availability",
        title: "Availability and support",
        body: [
          "We work to keep Acadify available at all times and schedule maintenance outside school hours where possible. Support is available by phone, WhatsApp and email in Bangla and English.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        body: [
          "Acadify is provided to help institutes run their work, but the institute remains responsible for checking results, invoices and messages before relying on them. Our total liability for any claim is limited to the fees the institute paid in the 12 months before the claim.",
        ],
      },
      {
        id: "ending",
        title: "Ending the agreement",
        body: [
          "The institute can close its account at any time from the settings page. We may suspend an account that seriously breaks these terms, after giving notice where possible. Refunds follow our Refund Policy.",
        ],
      },
      {
        id: "law",
        title: "Governing law",
        body: [
          "These terms are governed by the laws of Bangladesh. We will always try to resolve a disagreement by talking first. If that fails, the courts of Dhaka will have jurisdiction.",
        ],
      },
    ],
  },
  bn: {
    tag: "সেবার শর্তাবলী",
    title: "আপনার প্রতিষ্ঠান ও এক্যাডিফাইয়ের মধ্যে চুক্তি",
    intro:
      "কোনো প্রতিষ্ঠান এক্যাডিফাই অ্যাকাউন্ট খুললে বা সেবা ব্যবহার করলে এই শর্তাবলী প্রযোজ্য হয়। এক্যাডিফাই ব্যবহার করে প্রতিষ্ঠান এগুলো মেনে নেয়। অনুগ্রহ করে আপনার পরিচালনা কমিটির সাথে পড়ে নিন।",
    sections: [
      {
        id: "the-service",
        title: "সেবা",
        body: [
          "এক্যাডিফাই স্কুল, কলেজ ও মাদরাসার শিক্ষার্থী, স্টাফ, হাজিরা, ফি, পরীক্ষা, হিফজ রেকর্ড ও সংশ্লিষ্ট কাজ পরিচালনার সফটওয়্যার সরবরাহ করে। প্রতিষ্ঠানের প্ল্যান অনুযায়ী ফিচার পাওয়া যায়।",
        ],
      },
      {
        id: "accounts",
        title: "অ্যাকাউন্ট ও প্রবেশাধিকার",
        body: [
          "প্রতিষ্ঠান যে স্টাফ অ্যাকাউন্ট তৈরি করে এবং পাসওয়ার্ড গোপন রাখার দায়িত্ব প্রতিষ্ঠানের। কোন স্টাফ কোন তথ্য দেখতে বা বদলাতে পারবেন, তা প্রতিষ্ঠানের অ্যাডমিন ঠিক করেন। কোনো অ্যাকাউন্টের অপব্যবহার হয়েছে মনে হলে সঙ্গে সঙ্গে আমাদের জানান।",
        ],
      },
      {
        id: "acceptable-use",
        title: "গ্রহণযোগ্য ব্যবহার",
        body: ["এক্যাডিফাই ব্যবহারের সময় প্রতিষ্ঠান সম্মত হয় যে সে:"],
        list: [
          "বিভ্রান্তিকর, অপমানজনক বা প্রতিষ্ঠানের কাজের সাথে সম্পর্কহীন এসএমএস পাঠাবে না",
          "যে তথ্য রাখার অধিকার নেই তা আপলোড করবে না",
          "অন্য প্রতিষ্ঠানের তথ্যে প্রবেশ বা সেবায় বিঘ্ন ঘটানোর চেষ্টা করবে না",
          "অ্যাকাউন্টের বাইরের কোনো সংস্থার কাছে সেবা পুনঃবিক্রি বা শেয়ার করবে না",
        ],
      },
      {
        id: "your-data",
        title: "আপনার তথ্য",
        body: [
          "প্রতিষ্ঠান এক্যাডিফাইতে যে তথ্য রাখে তার মালিক প্রতিষ্ঠান। গোপনীয়তা নীতিতে বর্ণিত উপায়ে, শুধু সেবা দিতেই আমরা তা ব্যবহার করি। প্রতিষ্ঠান যেকোনো সময় — ছেড়ে যাওয়ার সিদ্ধান্তের পরও — তথ্য এক্সপোর্ট করতে পারে।",
        ],
      },
      {
        id: "payment",
        title: "ফি ও পরিশোধ",
        body: [
          "প্ল্যানের ফি মাসিক বা বার্ষিক অগ্রিম, বাংলাদেশি টাকায় নেওয়া হয়। এসএমএস গেটওয়ের মূল্যে আলাদাভাবে চার্জ হয়। পরিশোধ ১৫ দিনের বেশি দেরি হলে, পরিশোধ না হওয়া পর্যন্ত আমরা অ্যাকাউন্টকে শুধু দেখার সুবিধায় সীমিত করতে পারি। দেরিতে পরিশোধের কারণে আমরা কখনো তথ্য মুছি না।",
        ],
      },
      {
        id: "availability",
        title: "সেবার প্রাপ্যতা ও সাপোর্ট",
        body: [
          "আমরা এক্যাডিফাই সবসময় চালু রাখার চেষ্টা করি এবং সম্ভব হলে স্কুলের সময়ের বাইরে রক্ষণাবেক্ষণ করি। বাংলা ও ইংরেজিতে ফোন, হোয়াটসঅ্যাপ ও ইমেইলে সাপোর্ট পাওয়া যায়।",
        ],
      },
      {
        id: "liability",
        title: "দায়ের সীমা",
        body: [
          "এক্যাডিফাই প্রতিষ্ঠানের কাজে সাহায্যের জন্য, তবে ফলাফল, ইনভয়েস ও বার্তার ওপর নির্ভর করার আগে তা যাচাইয়ের দায়িত্ব প্রতিষ্ঠানের। যেকোনো দাবির ক্ষেত্রে আমাদের মোট দায়, দাবির আগের ১২ মাসে প্রতিষ্ঠান যে ফি দিয়েছে তার মধ্যে সীমিত।",
        ],
      },
      {
        id: "ending",
        title: "চুক্তির সমাপ্তি",
        body: [
          "প্রতিষ্ঠান যেকোনো সময় সেটিংস পাতা থেকে অ্যাকাউন্ট বন্ধ করতে পারে। এই শর্তাবলী গুরুতরভাবে ভঙ্গ করলে, সম্ভব হলে আগে জানিয়ে, আমরা অ্যাকাউন্ট স্থগিত করতে পারি। রিফান্ড আমাদের রিফান্ড নীতি অনুযায়ী হবে।",
        ],
      },
      {
        id: "law",
        title: "প্রযোজ্য আইন",
        body: [
          "এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত। মতবিরোধ হলে আমরা সবসময় আগে আলোচনার মাধ্যমে সমাধানের চেষ্টা করব। তা ব্যর্থ হলে ঢাকার আদালতের এখতিয়ার থাকবে।",
        ],
      },
    ],
  },
};

const refund: Record<Locale, LegalDoc> = {
  en: {
    tag: "Refund Policy",
    title: "Fair Refunds, Explained Simply",
    intro:
      "We want every institute to be sure about Acadify before paying. That is why every plan starts with a free trial. This policy explains when and how payments can be refunded.",
    sections: [
      {
        id: "free-trial",
        title: "{trialDays}-day free trial",
        body: [
          "Every new institute can use Acadify free for {trialDays} days, with no payment details needed. If you decide not to continue, simply do nothing. You will never be charged for the trial.",
        ],
      },
      {
        id: "monthly",
        title: "Monthly plans",
        body: [
          "Monthly plans can be cancelled at any time and stay active until the end of the month already paid. We do not refund part of a month, but you will not be charged again after cancelling.",
        ],
      },
      {
        id: "yearly",
        title: "Yearly plans",
        body: ["For yearly plans:"],
        list: [
          "Cancel within 14 days of payment for a full refund",
          "After 14 days, we refund the unused full months, minus the 2-month yearly discount you received",
          "Setup, training and data import are always free, so nothing is deducted for them",
        ],
      },
      {
        id: "sms",
        title: "SMS credit",
        body: [
          "SMS credit that has already been used cannot be refunded. Unused SMS credit is refunded in full when an account is closed.",
        ],
      },
      {
        id: "how-to-request",
        title: "How to request a refund",
        body: [
          "Email us or call support from the institute's registered phone number, with your institute name and payment reference. We confirm every request within 2 working days.",
        ],
      },
      {
        id: "timing",
        title: "When you get your money",
        body: [
          "Approved refunds are sent within 7 working days to the same method used for payment, whether bKash, Nagad or bank transfer.",
        ],
      },
    ],
  },
  bn: {
    tag: "রিফান্ড নীতি",
    title: "ন্যায্য রিফান্ড, সহজ ভাষায়",
    intro:
      "আমরা চাই প্রতিটি প্রতিষ্ঠান টাকা দেওয়ার আগে এক্যাডিফাই সম্পর্কে নিশ্চিত হোক। তাই প্রতিটি প্ল্যান শুরু হয় ফ্রি ট্রায়াল দিয়ে। কখন ও কীভাবে টাকা ফেরত পাওয়া যায়, এই নীতিতে তা বলা হয়েছে।",
    sections: [
      {
        id: "free-trial",
        title: "{trialDays} দিনের ফ্রি ট্রায়াল",
        body: [
          "প্রতিটি নতুন প্রতিষ্ঠান কোনো পেমেন্ট তথ্য ছাড়াই {trialDays} দিন বিনামূল্যে এক্যাডিফাই ব্যবহার করতে পারে। চালিয়ে যেতে না চাইলে কিছুই করতে হবে না। ট্রায়ালের জন্য কখনো চার্জ করা হবে না।",
        ],
      },
      {
        id: "monthly",
        title: "মাসিক প্ল্যান",
        body: [
          "মাসিক প্ল্যান যেকোনো সময় বাতিল করা যায় এবং যে মাসের টাকা দেওয়া আছে তার শেষ পর্যন্ত চালু থাকে। মাসের আংশিক টাকা ফেরত দেওয়া হয় না, তবে বাতিলের পর আর চার্জ হবে না।",
        ],
      },
      {
        id: "yearly",
        title: "বার্ষিক প্ল্যান",
        body: ["বার্ষিক প্ল্যানের ক্ষেত্রে:"],
        list: [
          "পরিশোধের ১৪ দিনের মধ্যে বাতিল করলে পুরো টাকা ফেরত",
          "১৪ দিন পরে, অব্যবহৃত পূর্ণ মাসের টাকা ফেরত, বার্ষিক প্ল্যানে পাওয়া ২ মাসের ছাড় বাদ দিয়ে",
          "সেটআপ, প্রশিক্ষণ ও তথ্য স্থানান্তর সবসময় বিনামূল্যে, তাই এগুলোর জন্য কিছু কাটা হয় না",
        ],
      },
      {
        id: "sms",
        title: "এসএমএস ক্রেডিট",
        body: [
          "ইতিমধ্যে ব্যবহৃত এসএমএস ক্রেডিট ফেরতযোগ্য নয়। অ্যাকাউন্ট বন্ধ করলে অব্যবহৃত এসএমএস ক্রেডিটের পুরো টাকা ফেরত দেওয়া হয়।",
        ],
      },
      {
        id: "how-to-request",
        title: "রিফান্ডের আবেদন যেভাবে করবেন",
        body: [
          "প্রতিষ্ঠানের নাম ও পেমেন্ট রেফারেন্সসহ আমাদের ইমেইল করুন, অথবা প্রতিষ্ঠানের নিবন্ধিত ফোন নম্বর থেকে সাপোর্টে কল করুন। প্রতিটি আবেদন আমরা ২ কর্মদিবসের মধ্যে নিশ্চিত করি।",
        ],
      },
      {
        id: "timing",
        title: "কখন টাকা পাবেন",
        body: [
          "অনুমোদিত রিফান্ড ৭ কর্মদিবসের মধ্যে একই মাধ্যমে — বিকাশ, নগদ বা ব্যাংক ট্রান্সফার — পাঠানো হয়।",
        ],
      },
    ],
  },
};

export const companyContent = { ui, about, privacy, terms, refund };
export type LegalKey = "privacy" | "terms" | "refund";


export interface ContactContent {
  tag: string;
  title: string;
  highlight: string;
  description: string;
  /** Contact cards; their values (numbers, email, address) come from Platform Settings. */
  methods: { key: "phone" | "whatsapp" | "email" | "office"; title: string; hint: string; action: string }[];
  hoursTitle: string;
  hours: { day: string; time: string }[];
  formTag: string;
  formTitle: string;
  formDescription: string;
  fields: {
    name: string;
    namePlaceholder: string;
    institute: string;
    institutePlaceholder: string;
    type: string;
    typePlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    students: string;
    studentsPlaceholder: string;
    message: string;
    messagePlaceholder: string;
    optional: string;
  };
  types: { value: string; label: string }[];
  studentRanges: { value: string; label: string }[];
  submit: string;
  sending: string;
  privacyNote: string;
  errors: { required: string; phone: string; email: string };
  successTitle: string;
  successDesc: string;
  successAgain: string;
  sendError: string;
}

const contact: Record<Locale, ContactContent> = {
  en: {
    tag: "Contact Us",
    title: "Let's Talk About Your Institute",
    highlight: "Your Institute",
    description: "Book a free demo, ask about pricing or get help with your account. Our team speaks Bangla and English and usually replies within an hour.",
    methods: [
      { key: "phone", title: "Call Us", hint: "Saturday to Thursday, 9 AM – 6 PM", action: "Call now" },
      { key: "whatsapp", title: "WhatsApp", hint: "Quick answers, photos and screenshots welcome", action: "Open WhatsApp" },
      { key: "email", title: "Email", hint: "For support, billing and data requests", action: "Send email" },
      { key: "office", title: "Office", hint: "Visits by appointment", action: "Book a visit" },
    ],
    hoursTitle: "Support hours",
    hours: [
      { day: "Saturday – Thursday", time: "9:00 AM – 6:00 PM" },
      { day: "Friday", time: "Closed (WhatsApp only)" },
      { day: "Exam & admission season", time: "Extended to 9:00 PM" },
    ],
    formTag: "Free Demo",
    formTitle: "Book a Free Demo",
    formDescription: "Tell us a little about your institute and we will call you to set up a 30-minute demo in Bangla or English.",
    fields: {
      name: "Your name",
      namePlaceholder: "e.g. Md. Abdur Rahman",
      institute: "Institute name",
      institutePlaceholder: "e.g. Noor Academy",
      type: "Institute type",
      typePlaceholder: "Choose a type",
      phone: "Phone number",
      phonePlaceholder: "01XXXXXXXXX",
      email: "Email",
      emailPlaceholder: "you@example.com",
      students: "Number of students",
      studentsPlaceholder: "Choose a range",
      message: "What would you like to see?",
      messagePlaceholder: "e.g. Attendance SMS, fee collection with bKash, Hifz tracking…",
      optional: "optional",
    },
    types: [
      { value: "school", label: "School" },
      { value: "college", label: "College" },
      { value: "qawmi", label: "Qawmi Madrasah" },
      { value: "alia", label: "Alia Madrasah" },
      { value: "hifz", label: "Hifz Khana" },
      { value: "coaching", label: "Coaching Center" },
      { value: "unified", label: "Unified Campus" },
    ],
    studentRanges: [
      { value: "under-300", label: "Under 300" },
      { value: "300-1500", label: "300 – 1,500" },
      { value: "1500-5000", label: "1,500 – 5,000" },
      { value: "over-5000", label: "Over 5,000" },
    ],
    submit: "Request Demo",
    sending: "Sending…",
    privacyNote: "We only use these details to contact you about Acadify.",
    errors: {
      required: "Please fill in this field.",
      phone: "Enter an 11-digit Bangladeshi mobile number, like 01712345678.",
      email: "Enter an email address like you@example.com.",
    },
    successTitle: "Thank you! We got your request.",
    successDesc: "Our team will call you within one working day to set up your demo.",
    successAgain: "Send another request",
    sendError: "We could not send your request. Please check your internet connection and try again, or call us.",
  },
  bn: {
    tag: "যোগাযোগ",
    title: "আপনার প্রতিষ্ঠান নিয়ে কথা বলি",
    highlight: "আপনার প্রতিষ্ঠান",
    description: "ফ্রি ডেমো বুক করুন, মূল্য জানুন বা অ্যাকাউন্টে সাহায্য নিন। আমাদের টিম বাংলা ও ইংরেজিতে কথা বলে এবং সাধারণত এক ঘণ্টার মধ্যে উত্তর দেয়।",
    methods: [
      { key: "phone", title: "কল করুন", hint: "শনিবার থেকে বৃহস্পতিবার, সকাল ৯টা – সন্ধ্যা ৬টা", action: "এখনই কল করুন" },
      { key: "whatsapp", title: "হোয়াটসঅ্যাপ", hint: "দ্রুত উত্তর, ছবি ও স্ক্রিনশট পাঠাতে পারেন", action: "হোয়াটসঅ্যাপ খুলুন" },
      { key: "email", title: "ইমেইল", hint: "সাপোর্ট, বিলিং ও তথ্য সংক্রান্ত অনুরোধ", action: "ইমেইল পাঠান" },
      { key: "office", title: "অফিস", hint: "অ্যাপয়েন্টমেন্ট নিয়ে আসুন", action: "ভিজিট বুক করুন" },
    ],
    hoursTitle: "সাপোর্টের সময়",
    hours: [
      { day: "শনিবার – বৃহস্পতিবার", time: "সকাল ৯টা – সন্ধ্যা ৬টা" },
      { day: "শুক্রবার", time: "বন্ধ (শুধু হোয়াটসঅ্যাপ)" },
      { day: "পরীক্ষা ও ভর্তির মৌসুম", time: "রাত ৯টা পর্যন্ত" },
    ],
    formTag: "ফ্রি ডেমো",
    formTitle: "ফ্রি ডেমো বুক করুন",
    formDescription: "আপনার প্রতিষ্ঠান সম্পর্কে একটু জানান, আমরা ফোন করে বাংলা বা ইংরেজিতে ৩০ মিনিটের ডেমোর ব্যবস্থা করব।",
    fields: {
      name: "আপনার নাম",
      namePlaceholder: "যেমন: মো. আব্দুর রহমান",
      institute: "প্রতিষ্ঠানের নাম",
      institutePlaceholder: "যেমন: নূর একাডেমি",
      type: "প্রতিষ্ঠানের ধরণ",
      typePlaceholder: "ধরণ বেছে নিন",
      phone: "ফোন নম্বর",
      phonePlaceholder: "০১XXXXXXXXX",
      email: "ইমেইল",
      emailPlaceholder: "you@example.com",
      students: "শিক্ষার্থীর সংখ্যা",
      studentsPlaceholder: "পরিসীমা বেছে নিন",
      message: "কী দেখতে চান?",
      messagePlaceholder: "যেমন: হাজিরার এসএমএস, বিকাশে ফি আদায়, হিফজ ট্র্যাকিং…",
      optional: "ঐচ্ছিক",
    },
    types: [
      { value: "school", label: "স্কুল" },
      { value: "college", label: "কলেজ" },
      { value: "qawmi", label: "কওমি মাদরাসা" },
      { value: "alia", label: "আলিয়া মাদরাসা" },
      { value: "hifz", label: "হিফজখানা" },
      { value: "coaching", label: "কোচিং সেন্টার" },
      { value: "unified", label: "সমন্বিত ক্যাম্পাস" },
    ],
    studentRanges: [
      { value: "under-300", label: "৩০০-এর কম" },
      { value: "300-1500", label: "৩০০ – ১,৫০০" },
      { value: "1500-5000", label: "১,৫০০ – ৫,০০০" },
      { value: "over-5000", label: "৫,০০০-এর বেশি" },
    ],
    submit: "ডেমোর অনুরোধ পাঠান",
    sending: "পাঠানো হচ্ছে…",
    privacyNote: "এই তথ্য শুধু এক্যাডিফাই নিয়ে আপনার সাথে যোগাযোগের জন্য ব্যবহার করা হবে।",
    errors: {
      required: "অনুগ্রহ করে এই ঘরটি পূরণ করুন।",
      phone: "১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮।",
      email: "you@example.com এর মতো একটি ইমেইল ঠিকানা দিন।",
    },
    successTitle: "ধন্যবাদ! আপনার অনুরোধ পেয়েছি।",
    successDesc: "ডেমোর ব্যবস্থা করতে আমাদের টিম এক কর্মদিবসের মধ্যে আপনাকে ফোন করবে।",
    successAgain: "আরেকটি অনুরোধ পাঠান",
    sendError: "আপনার অনুরোধ পাঠানো যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।",
  },
};

export const contactContent = contact;
