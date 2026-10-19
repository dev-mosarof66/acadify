/**
 * Turns per-page Markdown from the PDF parser into Chapter -> Topic -> Passage drafts with page numbers.
 * Headings give structure; tables (HTML) and LaTeX formulas become their own passage kinds.
 * Pure functions, no I/O, so they can be tested and re-run on stored pages for free.
 */

export type PassageKind = "text" | "definition" | "formula" | "example" | "exercise" | "activity" | "table" | "objective" | "figure" | "answer";

export interface PageMarkdown {
  /** 1-based page number in the PDF. */
  number: number;
  markdown: string;
}

export interface PassageDraft {
  kind: PassageKind;
  body: string;
  section: string | null;
  caption: string | null;
  /** File name (in the chapter's assets/ folder) of the picture this figure passage shows, once attached. */
  image: string | null;
  formulas: string[];
  pdfPageStart: number;
  pdfPageEnd: number;
}

export interface TopicDraft {
  /** "3.0" intro, "3.2" numbered section, "3.ex" sample questions. */
  key: string;
  title: string;
  ordinal: number;
  passages: PassageDraft[];
}

export interface ChapterDraft {
  number: number;
  title: string;
  englishTitle: string | null;
  pdfPageStart: number;
  pdfPageEnd: number;
  topics: TopicDraft[];
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function normalizeDigits(s: string) {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

const BN_ORDINALS: Record<string, number> = {
  প্রথম: 1, দ্বিতীয়: 2, তৃতীয়: 3, চতুর্থ: 4, পঞ্চম: 5, ষষ্ঠ: 6, সপ্তম: 7,
  অষ্টম: 8, নবম: 9, দশম: 10, একাদশ: 11, দ্বাদশ: 12, ত্রয়োদশ: 13, চতুর্দশ: 14,
};
const EN_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
};
const EN_ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14,
};

const BN_CHAPTER_RE = new RegExp(`^(${Object.keys(BN_ORDINALS).join("|")})\\s+অধ্যায়$`);
const EN_CHAPTER_RE = /^chapter\s+(\d+|[a-z]+)\s*[:.\-–]?\s*(.*)$/i;
const EN_ORDINAL_CHAPTER_RE = /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth)\s+chapter\s*[:.\-–]?\s*(.*)$/i;

/** The chapter number and any title on the same line, or null when the heading is not a chapter opener. */
function chapterOpener(text: string): { number: number; title: string } | null {
  const bn = text.match(BN_CHAPTER_RE);
  if (bn) return { number: BN_ORDINALS[bn[1]], title: "" };
  // Maths books head chapters "অধ্যায় ১" (word first, then a digit)
  const digit = normalizeDigits(text).match(/^অধ্যায়\s+(\d{1,2})$/);
  if (digit) return { number: Number(digit[1]), title: "" };
  const en = text.match(EN_CHAPTER_RE);
  if (en) {
    const raw = en[1].toLowerCase();
    const number = /^\d+$/.test(raw) ? Number(raw) : EN_NUMBERS[raw];
    if (number) return { number, title: en[2].trim() };
  }
  const ord = text.match(EN_ORDINAL_CHAPTER_RE);
  if (ord) return { number: EN_ORDINALS[ord[1].toLowerCase()], title: ord[2].trim() };
  return null;
}

// "<one word> অধ্যায়" with nothing else: how a chapter opener looks when the number word is misread
const LOOSE_OPENER = /^\S{2,}\s+অধ্যায়$/;

type Mode = "text" | "objective" | "activity" | "example" | "exercise" | "answer";
// The answer key printed at the end of a book ("অনুশীলনীর উত্তর") lists answers for many chapters; it is neither lesson nor exercise
const ANSWER_KEY_RE = /^(অনুশীলনীর উত্তর|উত্তরমালা|উত্তর সংকেত|answers? to (the )?exercises?)/i;

// Headings that change what the following blocks are (not new sections).
const MODE_RULES: [Mode, RegExp][] = [
  ["objective", /^(এ অধ্যায় শেষে আমরা|learning outcomes|by the end of this chapter)/i],
  ["activity", /^(নিজে করো|দলীয় কাজ|একক কাজ|জোড়ায় কাজ|অনুসন্ধান|activity|experiment|group work)/i],
  ["example", /^(উদাহরণ|example\b|worked example)/i],
  ["exercise", /^(বহুনির্বাচনি প্রশ্ন|সৃজনশীল প্রশ্ন|সূজনশীল প্রশ্ন|সংক্ষিপ্ত[\s-]+উত্তর প্রশ্ন|অনুশীলনী|exercises?\b|multiple choice|short answer|creative questions?)/i],
];
// Starts (or re-enters) the chapter's exercise topic. The question-type headings count too: a chapter can go straight
// into "সংক্ষিপ্ত-উত্তর প্রশ্ন" without an "অনুশীলনী" heading.
const EXERCISE_TOPIC_RE = /^(নমুনা প্রশ্ন|অনুশীলনী|বহুনির্বাচনি প্রশ্ন|সৃজনশীল প্রশ্ন|সূজনশীল প্রশ্ন|সংক্ষিপ্ত[\s-]+উত্তর প্রশ্ন|sample questions|exercises?\b)/i;
// Maths books don't number their sections; a heading like "সার্বিক সেট (Universal Set)" is how a new one starts.
// ...or a top-level heading with no English term: not a theorem, construction, solution or "কাজ" line, which are headings too
const PLAIN_SECTION_RE = /^(?!(উপপাদ্য|প্রতিজ্ঞা|সম্পাদ্য|অঙ্কন|সমাধান|প্রমাণ|কাজ|উদাহরণ|দৃষ্টব্য|বিশেষ দ্রষ্টব্য|মন্তব্য|ফর্মা))[^:：]{4,80}$/;
const UNNUMBERED_SECTION_RE =/^[^()]*[ঀ-৿][^()]*\([^()]*[A-Za-z]{3,}[^()]*\)\s*$/;
const TABLE_CAPTION_RE = /^(টেবিল|table)\s*[0-9০-৯]/i;
// Image descriptions and captions the parser emits for figures.
const FIGURE_RE = /^(drawing|illustration|photo|photograph|image|diagram|chart|graph|figure|picture):|^\*{0,2}(চিত্র|fig\.?|figure)\s*[0-9০-৯]/i;
const ANSWER_RE = /^\*{0,2}(উত্তর|সমাধান|answer|solution)/i;
// Blocks that still belong to an activity box or worked example once it has started.
const STEP_RE = /^\s*(\([০-৯0-9]+\)|[-*>]|\d+\.|[০-৯]+\.)/;
const SECTION_NO_RE = /^(\d+)\.(\d+)(?:\.(\d+))?\s+(.+)$/;
const MATH_ONLY_RE = /^\s*(\$\$[^$]+\$\$|\$[^$]+\$)\s*$/;
const DEFINITION_RE = /^\*{0,2}(সংজ্ঞা|definition)/i;
const SENTENCE_END_RE = /[।?!:)”".]$/;

/** `raw` is the number `want`, allowing for the digits the parser mixes up: ৪/৮ and ১/৭/৯ (seen in the NCTB books). */
const digitsMatch = (raw: string, want: number) =>
  new RegExp(`^${String(want).replace(/\d/g, (d) => ("48".includes(d) ? "[48]" : "179".includes(d) ? "[179]" : d))}$`).test(raw);

const cleanHeading =(line: string) => line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
const formulasIn = (text: string) => [...text.matchAll(/\$\$([^$]+)\$\$|\$([^$]+)\$/g)].map((m) => (m[1] ?? m[2]).trim());

type Block = { type: "heading" | "para" | "table"; text: string; /** "#" count, for headings */ level?: number };

/** Splits one page of Markdown into heading, paragraph and table blocks, in order. */
export function pageBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "para", text: para.join("\n").trim() });
    para = [];
  };
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push({ type: "heading", text: cleanHeading(line), level: line.match(/^#+/)![0].length });
      continue;
    }
    if (/^\s*<table/.test(line)) {
      flush();
      let html = line;
      while (!/<\/table>/.test(html) && i + 1 < lines.length) html += "\n" + lines[++i];
      blocks.push({ type: "table", text: html.trim() });
      continue;
    }
    // "icon:" labels, <hr/> rules and the bare "flow_chart" label before a diagram's code are parser noise
    if (/^\s*icon:/i.test(line) || /^\s*<hr\s*\/?>\s*$/i.test(line) || /^\s*flow_chart\s*$/i.test(line) || !line.trim()) {
      flush();
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/**
 * Builds every chapter found in `pages` (in page order). Pages before the first chapter opener
 * (cover, contents) are ignored.
 */
export function buildBookTree(pages: PageMarkdown[], opts: { keepEmpty?: boolean; expect?: { number: number; title: string } } = {}): ChapterDraft[] {
  const chapters: ChapterDraft[] = [];
  let chapter: ChapterDraft | null = null;
  let topic: TopicDraft | null = null;
  let seq = 0; // last numbered topic (N.M) seen in this chapter
  let mode: Mode = "text";
  let section: string | null = null;
  let caption: string | null = null;
  let expectTitle = false;
  let modeBlocks = 0; // blocks seen since the current mode heading
  let closing = false; // a worked example's answer has been seen
  let carry: PassageDraft | null = null; // last open paragraph of the previous page, eligible for merge

  const newTopic = (c: ChapterDraft, key: string, title: string) => {
    topic = { key, title, ordinal: c.topics.length, passages: [] };
    c.topics.push(topic);
    mode = "text";
    section = null;
  };

  // Physics and chemistry number their sections (1.2); if no heading does, sections are told apart by their English term
  const numberedBook = pages.some((p) => pageBlocks(p.markdown).some((b) => b.type === "heading" && /^\d+\.\d+\s/.test(normalizeDigits(b.text))));

  // When the caller knows which chapter these pages are, start it now so content is kept even if no opener heading is found
  let synthetic = false;
  if (opts.expect) {
    const start = pages[0]?.number ?? 0;
    chapter = { number: opts.expect.number, title: opts.expect.title, englishTitle: null, pdfPageStart: start, pdfPageEnd: start, topics: [] };
    chapters.push(chapter);
    newTopic(chapter, `${opts.expect.number}.0`, "ভূমিকা ও শিখনফল");
    synthetic = true;
  }

  for (const page of pages) {
    let first = true;
    for (const b of pageBlocks(page.markdown)) {
      if (b.type === "heading") {
        carry = null;
        first = false;
        const text = b.text;

        let opener = chapterOpener(text);
        if (opts.expect) {
          // We cut this chapter out ourselves, so its opener is whichever "<word> অধ্যায়" heading comes first,
          // even if the parser misread the number word ("ত্রয়োদশ" came back as "অয়োদশ")
          if (opener && opener.number !== opts.expect.number) opener = null;
          if (!opener && synthetic && LOOSE_OPENER.test(text)) opener = { number: opts.expect.number, title: "" };
        }
        if (opener && synthetic && chapter) {
          // the chapter was created up front; this heading is its real start
          synthetic = false;
          chapter.pdfPageStart = page.number;
          chapter.title = opener.title;
          seq = 0;
          caption = null;
          mode = "text";
          section = null;
          expectTitle = !opener.title;
          continue;
        }
        if (opener) {
          chapter = { number: opener.number, title: opener.title, englishTitle: null, pdfPageStart: page.number, pdfPageEnd: page.number, topics: [] };
          chapters.push(chapter);
          seq = 0;
          caption = null;
          newTopic(chapter, `${opener.number}.0`, "ভূমিকা ও শিখনফল");
          expectTitle = !opener.title;
          continue;
        }
        if (!chapter || !topic) continue;
        if (expectTitle) {
          // "সেট ও ফাংশন (Set and Function)": the bracketed part is the English title
          const both = text.match(/^(.+?)\s*\(([^()]*[A-Za-z][^()]*)\)\s*$/);
          chapter.title = both ? both[1].trim() : text;
          if (both && !chapter.englishTitle) chapter.englishTitle = both[2].trim();
          expectTitle = false;
          continue;
        }
        if (/^\(.*\)$/.test(text) && !(topic as TopicDraft).passages.length && !chapter.englishTitle) {
          chapter.englishTitle = text.slice(1, -1).trim();
          continue;
        }
        if (ANSWER_KEY_RE.test(text)) {
          newTopic(chapter, `${chapter.number}.ans`, text);
          mode = "answer";
          continue;
        }
        // inside the answer key every heading ("অনুশীলনী ১.১", "৫.২") only labels a block of answers
        if (mode === "answer") {
          section = text;
          continue;
        }
        // The parser reads ৪ as ৮, so "৪.১" can come back as "৮.১" or "8.8"; the order of the sections settles which it is
        const num = normalizeDigits(text).match(SECTION_NO_RE);
        if (num && !num[3] && digitsMatch(num[1], chapter.number) && digitsMatch(num[2], seq + 1)) {
          seq += 1;
          newTopic(chapter, `${chapter.number}.${seq}`, text.replace(/^\S+\s+/, ""));
          continue;
        }
        if (EXERCISE_TOPIC_RE.test(text)) {
          // A chapter can have an exercise per section; they all go into the one N.ex topic
          const key = `${chapter.number}.ex`;
          const existing = chapter.topics.find((t) => t.key === key);
          if (existing) {
            topic = existing;
            section = text;
          } else newTopic(chapter, key, text);
          mode = "exercise";
          continue;
        }
        if (TABLE_CAPTION_RE.test(text)) {
          caption = text;
          continue;
        }
        // after an exercise the lesson resumes under any plain heading, even a "###" one that carries a formula
        const startsSection = UNNUMBERED_SECTION_RE.test(text) || ((b.level === 2 || (b.level === 3 && mode === "exercise")) && PLAIN_SECTION_RE.test(text));
        if (!numberedBook && startsSection && !FIGURE_RE.test(text) && !MODE_RULES.some(([, re]) => re.test(text))) {
          // A new lesson section; it also ends any exercise that came before it in the chapter
          seq += 1;
          newTopic(chapter, `${chapter.number}.${seq}`, text);
          continue;
        }
        const rule = MODE_RULES.find(([, re]) => re.test(text));
        if (rule) {
          mode = rule[0];
          section = text;
          modeBlocks = 0;
          closing = false;
          continue;
        }
        if (mode !== "exercise") mode = "text";
        section = text; // a numbered sub-section (1.3.2) or any other heading
        continue;
      }
      if (!chapter || !topic) continue;

      const body = b.text;
      let special: PassageKind | null = null;
      if (b.type === "table") special = "table";
      else if (FIGURE_RE.test(body)) special = "figure";
      else if (MATH_ONLY_RE.test(body)) special = "formula";

      // Activity boxes and worked examples end at the first block that is not a step, figure,
      // formula, table or short line; examples also end right after their answer.
      if (mode === "activity" || mode === "example") {
        const stays = modeBlocks === 0 || special || STEP_RE.test(body) || body.length < 120;
        if (!stays || (mode === "example" && closing && !special)) mode = "text";
      }
      modeBlocks += 1;
      if (mode === "example" && ANSWER_RE.test(body)) closing = true;

      let kind: PassageKind = mode === "answer" ? "answer" : (special ?? mode);
      if (!special && DEFINITION_RE.test(body)) kind = "definition";

      // A paragraph cut by the page break continues on the next page.
      const open = carry as PassageDraft | null;
      if (open && first && kind === "text" && !STEP_RE.test(body)) {
        open.body += " " + body;
        open.pdfPageEnd = page.number;
        open.formulas = formulasIn(open.body);
        first = false;
        carry = SENTENCE_END_RE.test(open.body) ? null : open;
        continue;
      }
      first = false;

      const passage: PassageDraft = {
        kind,
        body,
        section,
        caption: null,
        image: null,
        formulas: formulasIn(body),
        pdfPageStart: page.number,
        pdfPageEnd: page.number,
      };
      if (kind === "table") {
        passage.caption = caption;
        caption = null;
      }
      (topic as TopicDraft).passages.push(passage);
      carry = kind === "text" && !SENTENCE_END_RE.test(body) ? passage : null;
    }
    if (chapter) chapter.pdfPageEnd = page.number;
    // a carried paragraph only survives to the first block of the next page
    const stale = carry as PassageDraft | null;
    if (stale && stale.pdfPageEnd !== page.number) carry = null;
  }
  return opts.keepEmpty ? chapters : chapters.filter((c) => c.topics.some((t) => t.passages.length));
}
