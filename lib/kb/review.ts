/**
 * Known parser mistakes and the review flags a passage gets. Pure functions.
 *
 * Every correction below was confirmed against a page image of the NCTB Physics (Bangla) book.
 * Add to the list only after checking the printed page, never from a guess.
 */
import type { PassageDraft } from "./mdtree";

const BN = "\\u0980-\\u09FF";
const notBn = (re: string) => new RegExp(`(?<![${BN}])${re}(?![${BN}])`, "g");

export const CORRECTIONS: { name: string; pattern: RegExp; to: string }[] = [
  { name: "শত্তি", pattern: /শত্তি/g, to: "শক্তি" },
  { name: "যন্দ্র", pattern: /যন্দ্র/g, to: "যন্ত্র" },
  { name: "ক্বমবিকাশ", pattern: /ক্বমবিকাশ/g, to: "ক্রমবিকাশ" },
  { name: "উথান", pattern: /উথান/g, to: "উত্থান" },
  { name: "যোড়শ", pattern: notBn("যোড়শ"), to: "ষোড়শ" },
  { name: "সূজনশীল", pattern: /সূজনশীল/g, to: "সৃজনশীল" },
  { name: "ভোত", pattern: notBn("ভোত"), to: "ভৌত" },
  { name: "ভোতিক", pattern: notBn("ভোতিক"), to: "ভৌতিক" },
  { name: "সৃক্ষ", pattern: /সৃক্ষ/g, to: "সূক্ষ্ম" },
  { name: "বস্তুরটির", pattern: /বস্তুরটির/g, to: "বস্তুটির" },
  // Confirmed against the printed pages of the Physics book, each non-words that recur dozens of times:
  { name: "বস্তুরকে", pattern: /বস্তুরকে/g, to: "বস্তুকে" },
  { name: "বস্তুরটি", pattern: /বস্তুরটি/g, to: "বস্তুটি" },
  { name: "বস্তুরটা", pattern: /বস্তুরটা/g, to: "বস্তুটা" },
  { name: "দ্বিতি", pattern: /দ্বিতি/g, to: "দ্রুতি" }, // দ্রুতি (speed) read as দ্বিতি on pages 42-63; দ্বিতীয় is a different word
  // The book's font draws ঙ্গ so that it looks like ঞ্জ (the page header reads "তরঙ্গ ও শব্দ"); the word is তরঙ্গ
  { name: "তরঞ্জোর", pattern: /তরঞ্জোর/g, to: "তরঙ্গের" },
  { name: "তরঞ্জা", pattern: /তরঞ্জা/g, to: "তরঙ্গ" },
  // Chemistry chapter 4: the chapter's own title page reads "পর্যায় সারণি"; the contents page and some headings misread it
  { name: "পর্দায় সারণি", pattern: /পর্দায় সারণি/g, to: "পর্যায় সারণি" },
  { name: "পার্যায় সারণি", pattern: /পার্যায় সারণি/g, to: "পর্যায় সারণি" },
  // The parser reads the conjunct ক্ষ as স্ফ or স্ক. Chemistry chapter 9's heading "স্ফারক এবং স্ফার (Base and Alkali)"
  // gives the English term for ক্ষারক / ক্ষার; "স্ফার" opening a word is that, in every inflection (স্ফারে, স্ফারীয়, ...),
  // and never স্ফারিত (dilated). "স্কুদ্র" and "স্কুন্দ" are not words; ক্ষুদ্র is what the sentences need.
  { name: "স্ফার…", pattern: new RegExp(`(?<![${BN}])স্ফার(?!ি)`, "g"), to: "ক্ষার" },
  // Chemistry and Higher Math, confirmed on the printed pages. Each wrong form is not a word, and recurs many times.
  { name: "স্কার", pattern: new RegExp(`(?<![${BN}])স্কার`, "g"), to: "ক্ষার" },
  { name: "আকারিক", pattern: /আকারিক/g, to: "আকরিক" },
  { name: "হাইড্রোক্লোরাইড", pattern: /হাইড্রোক্লোরাইড|হাইড্রোক্লাইড/g, to: "হাইড্রোক্সাইড" },
  { name: "সম্ভাবনা-র", pattern: /সন্[ধন]্যাবনা/g, to: "সম্ভাবনা" },
  { name: "সম্ভাব্য-র", pattern: /সন্[ধন]্যাব্য/g, to: "সম্ভাব্য" },
  { name: "স্কুড", pattern: new RegExp(`(?<![${BN}])স্কুড(?:্র)?(?![${BN}])`, "g"), to: "ক্ষুদ্র" },
  { name: "যন", pattern: new RegExp(`(?<![${BN}])যন(?![${BN}])`, "g"), to: "ঘন" },
  { name: "সুযম", pattern: /সুযম/g, to: "সুষম" },
  { name: "নিক্ষেপ-র", pattern: /নিি?ক্ষেপ|নিষ্কেপ|নিষেপ|নিষ্কৈপ/g, to: "নিক্ষেপ" },
  { name: "ব্যটারি", pattern: /ব্যটারি/g, to: "ব্যাটারি" },
  { name: "সম্বর্কে", pattern: /সম্বর্কে/g, to: "সম্পর্কে" },
  { name: "মনতব্য", pattern: /মনতব্য/g, to: "মন্তব্য" },
  { name: "দিঘাত", pattern: /দিঘাত/g, to: "দ্বিঘাত" },
  { name: "অবস্ফুত্তর", pattern: /অবস্ফুত্তর/g, to: "অবস্থান্তর" },
  { name: "বৈক্রিয়া", pattern: /বৈক্রিয়া/g, to: "বিক্রিয়া" },
  { name: "বিক্রয়ক", pattern: /বিক্রয়ক/g, to: "বিক্রিয়ক" },
  { name: "বিলোষণ", pattern: /বিলোষণ|বিল্লেখণ/g, to: "বিশ্লেষণ" },
  { name: "ফ্যাকটি", pattern: /ফ্যাকটি/g, to: "ফ্যাটি" },
  { name: "সমস্বয়ে", pattern: /সমস্বয়ে/g, to: "সমন্বয়ে" },
  { name: "উদ্দায়ী", pattern: /উদ্দায়ী|উদ্ভায়ী/g, to: "উদ্বায়ী" },
  { name: "ঘটেবে", pattern: /ঘটেবে/g, to: "ঘটবে" },
  { name: "পর্দায়বৃত্ত", pattern: /পর্দায়বৃত্ত|পার্যায়বৃত্ত|পর্দায়ের/g, to: "পর্যায়ের" },
  { name: "সধ্বরণশীল", pattern: /সধ্বরণশীল|সন্ধোরণশীল/g, to: "সঞ্চরণশীল" },
  { name: "তাপহারাী", pattern: /তাপহারাী/g, to: "তাপহারী" },
  { name: "কার্ঠ", pattern: /কার্ঠ/g, to: "কাঠ" },
  { name: "ভেনচিট্র", pattern: /ভেনচিট্র/g, to: "ভেনচিত্র" },
  { name: "ঐকে", pattern: new RegExp(`(?<![${BN}])ঐকে(?![${BN}])`, "g"), to: "এঁকে" },
  { name: "জোটি", pattern: /জোটির/g, to: "জোটের" },
  { name: "জোট-র", pattern: new RegExp(`জোটি(?![${BN}])`, "g"), to: "জোট" },
  { name: "কর্ঠিন", pattern: /কর্ঠিন/g, to: "কঠিন" },
  { name: "কাঠিন", pattern: new RegExp(`কাঠিন(?![${BN}])`, "g"), to: "কঠিন" },
  { name: "উধর্ব", pattern: /উধর্ব/g, to: "ঊর্ধ্ব" },
  { name: "গ্যুড", pattern: new RegExp(`(?<![${BN}])গ্যুড(?![${BN}])`, "g"), to: "গাঢ়" },
  { name: "বর্গিত", pattern: /বর্গিত/g, to: "বর্ণিত" },
  { name: "সমনিহিত", pattern: /সমনিহিত/g, to: "সন্নিহিত" },
  { name: "সমদ্বিভাউ", pattern: /সমদ্বিভাউ/g, to: "সমদ্বিবাহু" },
  { name: "ঠাঁক", pattern: /ঠাঁক|ঠাকলে/g, to: "আঁক" },
  { name: "ইলেকট্রোপ্লেটিং", pattern: /ইলেকট্রোপ্লোটিং|ইলেকট্রোপ্লেনিং/g, to: "ইলেকট্রোপ্লেটিং" },
  { name: "পরিক্ষার", pattern: /পরিক্ষার/g, to: "পরিষ্কার" },
  { name: "বৃন্তাকার", pattern: /বৃন্তাকার/g, to: "বৃত্তাকার" },
  { name: "আবিস্কৃত", pattern: /আবিস্কৃত/g, to: "আবিষ্কৃত" },
  { name: "মেডেলিফ", pattern: /মেডেলিফ/g, to: "মেন্ডেলিফ" },
  // Higher Math: অন্বয় (relation) is read as "অস্বয়" throughout chapter 1; জ্ঞাত etc. are handled per passage
  { name: "অস্বয়", pattern: /অস্বয়/g, to: "অন্বয়" },
  { name: "অস্বিত", pattern: /অস্বিত/g, to: "অন্বিত" },
  { name: "নির্ণয়ে সমাধান", pattern: /নির্ণয়ে সমাধান/g, to: "নির্ণেয় সমাধান" },
  { name: "মৃৎস্ফার", pattern: /(?:মু|মূ|মৃ)[ৎং]স্ফার/g, to: "মৃৎক্ষার" }, // মৃৎক্ষার ধাতু: alkaline-earth metals (chemistry 4 and 8)
  // Tamil the parser wrote for Bangla: the word அதிக ("more" = অধিক), the "ি য়" of নিয়ন, and the া of আলমিরা, চেহারা
  { name: "அதிக", pattern: /அதிக/g, to: "অধিক" },
  { name: "ிய", pattern: /ிய/g, to: "িয়" },
  { name: "ா", pattern: /ா/g, to: "া" },
  { name: "আঙ্গয়েй", pattern: /আঙ্গয়েй/g, to: "আগ্নেয়" }, // আগ্নেয় শিলা (igneous rock), chemistry 10
  { name: "স্কুদ্র", pattern: /স্কুদ্র/g, to: "ক্ষুদ্র" },
  { name: "স্কুন্দ", pattern: /স্কুন্দ/g, to: "ক্ষুদ্র" },
];

// Devanagari (minus the danda । that Bangla shares) and Gujarati, which the parser sometimes writes a Bangla word in.
const INDIC_RUN = /[ऀ-ॣ०-ॿ઀-૿]/;
// Anything still in another script after conversion: Tamil, Cyrillic and the other Indic scripts
const FOREIGN_SCRIPT = /[ऀ-ॣ०-ॿ਀-෿Ѐ-ӿ]/;

// Devanagari letters whose Bangla counterpart is not simply 0x80 higher (Bangla has no व, and writes ळ/ऩ/ऱ as ল/ন/র)
const DEVANAGARI_EXCEPTIONS: Record<number, number> = {
  0x0935: 0x09ac, 0x0929: 0x09a8, 0x0931: 0x09b0, 0x0933: 0x09b2, 0x0934: 0x09b2,
  0x0958: 0x0995, 0x0959: 0x0996, 0x095a: 0x0997, 0x095b: 0x099c, 0x095c: 0x09dc, 0x095d: 0x09dd, 0x095e: 0x09ab, 0x095f: 0x09df,
  0x090d: 0x098f, 0x090e: 0x098f, 0x0911: 0x0993, 0x0912: 0x0993, 0x0946: 0x09c7, 0x0949: 0x09cb, 0x094a: 0x09cb,
  0x0945: 0, 0x093d: 0, 0x0950: 0,
};

/**
 * The parser sometimes writes a Bangla word in the Devanagari or Gujarati letters of the same sound (अधिक for অধিক,
 * चित्र for চিত্র). Those scripts line up with Bangla letter for letter, so they convert back exactly. A plain য that follows
 * a letter is the য় of বলয়, বিষয়; after a virama (ত্য) or an anusvara (সংযোগ) or at the start of a word it stays য.
 */
export function bengalify(text: string): string {
  if (!INDIC_RUN.test(text)) return text;
  const out: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const gujarati = cp >= 0x0a80 && cp <= 0x0aff;
    const dev = gujarati ? cp - 0x180 : cp;
    if (dev === 0x0964 || dev === 0x0965 || dev < 0x0900 || dev > 0x097f) {
      out.push(ch);
      continue;
    }
    let bn = DEVANAGARI_EXCEPTIONS[dev] ?? (dev <= 0x094d || (dev >= 0x0966 && dev <= 0x096f) ? dev + 0x80 : null);
    if (bn === 0) continue;
    if (bn === null) {
      out.push(ch);
      continue;
    }
    if (bn === 0x09af) {
      const prev = out[out.length - 1]?.codePointAt(0) ?? 0;
      if (prev >= 0x0980 && prev <= 0x09ff && prev !== 0x09cd && prev !== 0x0982) bn = 0x09df;
    }
    out.push(String.fromCodePoint(bn));
  }
  // The books spell য়, ড় and ঢ় as the letter plus a nukta; match that rather than the single-code-point forms
  return out.join("").replace(/য়/g, "য়").replace(/ড়/g, "ড়").replace(/ঢ়/g, "ঢ়");
}

export function applyCorrections(text: string): { text: string; changed: boolean } {
  let changed = false;
  let out = bengalify(text);
  if (out !== text) changed = true;
  for (const c of CORRECTIONS) {
    c.pattern.lastIndex = 0;
    out = out.replace(c.pattern, () => {
      changed = true;
      return c.to;
    });
  }
  return { text: out, changed };
}

// Units and abbreviations that legitimately appear as lone Latin words in Bangla prose.
const KEEP = new Set(["SI", "CGS", "MKS", "FPS", "DC", "AC", "LED", "GPS", "LASER", "RADAR", "MRI", "kg", "cm", "mm", "km", "m", "g", "mol", "pm", "nm", "second", "joule"]);

/** Latin junk inside Bangla prose: all-caps or all-lowercase words outside parentheses, HTML and LaTeX. */
export function hasLatinJunk(text: string): boolean {
  // Chemical formulas and ions (H<sub>2</sub>SO<sub>4</sub>, OH<sup>-</sup>) are real Latin letters in Bangla prose; drop them before the HTML is stripped
  const prose = text
    .replace(/[A-Za-z()]*(?:<su[bp]>[^<]*<\/su[bp]>[A-Za-z()]*)+/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\([^)]*\)/g, " ");
  return prose.split("\n").some((line) => {
    if (!/[ঀ-৿]/.test(line)) return false;
    return (line.match(/[A-Za-z]{2,}/g) ?? []).some((w) => !KEEP.has(w) && (w === w.toUpperCase() || w === w.toLowerCase()));
  });
}

export const hasForeignScript = (text: string) => FOREIGN_SCRIPT.test(text);

export type ReviewReason = "latin-junk" | "foreign-script" | "known-confusable-corrected" | "verify-formula" | "verify-table";

export function reviewReasons(p: Pick<PassageDraft, "kind" | "body" | "formulas">, corrected: boolean): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (p.kind !== "table" && hasLatinJunk(p.body)) reasons.push("latin-junk");
  if (hasForeignScript(p.body)) reasons.push("foreign-script");
  if (corrected) reasons.push("known-confusable-corrected");
  if (p.kind === "formula" || p.formulas.length) reasons.push("verify-formula");
  if (p.kind === "table") reasons.push("verify-table");
  return reasons;
}
