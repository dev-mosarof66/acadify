/**
 * Table passages are stored as HTML written by the parser. Before one is shown in the dashboard it is
 * reduced to plain table markup: only the tags below survive, with no attributes except numeric
 * colspan/rowspan, and everything else (scripts, styles, event handlers, links, images) is removed.
 */
const ALLOWED = new Set(["table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "br", "sup", "sub", "b", "i", "strong", "em"]);

export function sanitizeTableHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, name: string, attrs: string) => {
      const n = name.toLowerCase();
      if (!ALLOWED.has(n)) return "";
      if (tag.startsWith("</")) return `</${n}>`;
      const kept = [...attrs.matchAll(/\b(colspan|rowspan)\s*=\s*["']?(\d{1,2})["']?(?=[\s/]|$)/gi)].map((m) => ` ${m[1].toLowerCase()}="${m[2]}"`);
      return `<${n}${kept.join("")}>`;
    });
}
