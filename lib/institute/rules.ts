/** Input rules shared by the student form and the CSV import. Plain module: no server-only imports. */

export const BD_MOBILE = /^01[3-9]\d{8}$/;

export const toAsciiDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

/** "+880 1712-345678" → "01712345678" */
export const localMobile = (v: string) => toAsciiDigits(v).replace(/\D/g, "").replace(/^88(?=01)/, "");
