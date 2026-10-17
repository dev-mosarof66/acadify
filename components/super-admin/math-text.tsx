"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

// $$...$$, \[...\], $...$ and \(...\), the forms the parser uses for formulas
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

/** The text of the {...} group that starts at `from` (which must be a "{"), and the index after its closing brace. */
function braceGroup(s: string, from: number): { inner: string; end: number } | null {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return { inner: s.slice(from + 1, i), end: i + 1 };
  }
  return null;
}

/** The parser writes long division with MathJax-only \enclose{longdiv}{...} and <u>...</u>; KaTeX has neither. */
export function fixTex(tex: string): string {
  let out = tex.replace(/<u>([\s\S]*?)<\/u>/g, "\\underline{$1}");
  const tag = "\\enclose{longdiv}";
  for (let at = out.indexOf(tag); at >= 0; at = out.indexOf(tag)) {
    const group = braceGroup(out, at + tag.length);
    if (!group) break;
    out = `${out.slice(0, at)})\\overline{\\,${group.inner}}${out.slice(group.end)}`;
  }
  return out;
}

function toHtml(tex: string, display: boolean) {
  // KaTeX escapes its input and does not run scripts or load URLs unless `trust` is set
  return katex.renderToString(fixTex(tex), { throwOnError: false, displayMode: display, output: "html" });
}

/** Replaces every formula in `html` with rendered KaTeX markup. `html` must already be safe (escaped or sanitized). */
export function renderMathInHtml(html: string): string {
  return html.replace(MATH, (_m, a, b, c, d) => {
    const display = a !== undefined || b !== undefined;
    return toHtml((a ?? b ?? c ?? d).trim(), display);
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The parser writes exponents as <sup>2</sup>; after escaping, turn just those two tags back into real ones. */
const allowScripts = (escaped: string) => escaped.replace(/&lt;(\/?)(sup|sub)&gt;/g, "<$1$2>");

/** Plain text with formulas rendered; everything that isn't a formula stays text. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const html = renderMathInHtml(allowScripts(escapeHtml(text)));
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A formula passage: shown as a centred display equation. */
export function MathBlock({ tex }: { tex: string }) {
  const clean = tex.replace(/^\s*\$\$?|\$\$?\s*$/g, "").trim();
  return <div className="overflow-x-auto py-1 text-center" dangerouslySetInnerHTML={{ __html: toHtml(clean, true) }} />;
}
