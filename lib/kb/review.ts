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
];

export function applyCorrections(text: string): { text: string; changed: boolean } {
  let changed = false;
  let out = text;
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
  const prose = text.replace(/<[^>]*>/g, " ").replace(/\$[^$]*\$/g, " ").replace(/\([^)]*\)/g, " ");
  return prose.split("\n").some((line) => {
    if (!/[ঀ-৿]/.test(line)) return false;
    return (line.match(/[A-Za-z]{2,}/g) ?? []).some((w) => !KEEP.has(w) && (w === w.toUpperCase() || w === w.toLowerCase()));
  });
}

export type ReviewReason = "latin-junk" | "known-confusable-corrected" | "verify-formula" | "verify-table";

export function reviewReasons(p: Pick<PassageDraft, "kind" | "body" | "formulas">, corrected: boolean): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (p.kind !== "table" && hasLatinJunk(p.body)) reasons.push("latin-junk");
  if (corrected) reasons.push("known-confusable-corrected");
  if (p.kind === "formula" || p.formulas.length) reasons.push("verify-formula");
  if (p.kind === "table") reasons.push("verify-table");
  return reasons;
}
