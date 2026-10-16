"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

// $$...$$, \[...\], $...$ and \(...\), the forms the parser uses for formulas
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

function toHtml(tex: string, display: boolean) {
  // KaTeX escapes its input and does not run scripts or load URLs unless `trust` is set
  return katex.renderToString(tex, { throwOnError: false, displayMode: display, output: "html" });
}

/** Replaces every formula in `html` with rendered KaTeX markup. `html` must already be safe (escaped or sanitized). */
export function renderMathInHtml(html: string): string {
  return html.replace(MATH, (_m, a, b, c, d) => {
    const display = a !== undefined || b !== undefined;
    return toHtml((a ?? b ?? c ?? d).trim(), display);
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text with formulas rendered; everything that isn't a formula stays text. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const html = renderMathInHtml(escapeHtml(text));
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A formula passage: shown as a centred display equation. */
export function MathBlock({ tex }: { tex: string }) {
  const clean = tex.replace(/^\s*\$\$?|\$\$?\s*$/g, "").trim();
  return <div className="overflow-x-auto py-1 text-center" dangerouslySetInnerHTML={{ __html: toHtml(clean, true) }} />;
}
