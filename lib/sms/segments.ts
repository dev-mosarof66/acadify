/*
 * SMS length rules. Plain English (GSM-7) fits 160 characters in one part, 153 per part when split.
 * Anything else, including Bangla, is sent as Unicode: 70 in one part, 67 per part when split.
 */

const GSM7 = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\[~\]|€]*$/;
/** These count as two characters in GSM-7. */
const GSM7_EXTENDED = /[\^{}\[~\]|€]/g;

export function smsSegments(text: string): { segments: number; unicode: boolean; length: number } {
  const unicode = !GSM7.test(text);
  const length = unicode ? [...text].length : text.length + (text.match(GSM7_EXTENDED)?.length ?? 0);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { segments: length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi), unicode, length };
}

/** ৳ amount from poisha, e.g. 35 → "৳0.35". */
export const formatPoisha = (poisha: number) => `৳${(poisha / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
