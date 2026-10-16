import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeTableHtml } from "./html";

test("keeps plain table markup and numeric spans", () => {
  const html = '<table class="x"><tr><th colspan="2" style="color:red">রাশি</th></tr><tr><td>1<sup>2</sup></td><td>a<br>b</td></tr></table>';
  assert.equal(sanitizeTableHtml(html), '<table><tr><th colspan="2">রাশি</th></tr><tr><td>1<sup>2</sup></td><td>a<br>b</td></tr></table>');
});

test("removes scripts, handlers, links and images", () => {
  const html = '<table><tr><td onclick="x()"><script>alert(1)</script><a href="javascript:x()">link</a><img src=x onerror=y>text</td></tr></table>';
  assert.equal(sanitizeTableHtml(html), "<table><tr><td>linktext</td></tr></table>");
});

test("drops non-numeric spans and comments", () => {
  assert.equal(sanitizeTableHtml('<td colspan="2;x" rowspan=3><!-- hi -->ok</td>'), '<td rowspan="3">ok</td>');
});
