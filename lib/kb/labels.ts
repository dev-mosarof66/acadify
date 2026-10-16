/** How a book is named in the dashboard: "Physics · Class 9-10 · Bangla version". Pure, safe to import anywhere. */
export interface BookLabelParts {
  subject: string;
  classLevel: string;
  language: string;
}

const VERSION: Record<string, string> = { bn: "Bangla version", en: "English version" };

/** "higher-math" -> "Higher math" */
export const subjectName = (subject: string) => {
  const words = subject.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** "Class 9-10 · Bangla version" (the class is left out when the book has none). */
export const versionLabel = ({ classLevel, language }: Pick<BookLabelParts, "classLevel" | "language">) =>
  [classLevel ? `Class ${classLevel}` : null, VERSION[language] ?? language].filter(Boolean).join(" · ");

export const bookLabel = (b: BookLabelParts) => `${subjectName(b.subject)} · ${versionLabel(b)}`;

/** Books that share a class and a version (language), e.g. every subject of "Class 9-10 · Bangla version". */
export interface BookGroup<T extends BookLabelParts> {
  /** "9-10/bn", or "all/bn" for books with no class. Used in the group's page address. */
  key: string;
  classLevel: string;
  language: string;
  books: T[];
}

export const groupKey = (b: Pick<BookLabelParts, "classLevel" | "language">) => `${b.classLevel || "all"}/${b.language}`;

const firstNumber = (classLevel: string) => Number(classLevel.match(/\d+/)?.[0] ?? 99);

export function groupBooks<T extends BookLabelParts>(books: T[]): BookGroup<T>[] {
  const groups = new Map<string, BookGroup<T>>();
  for (const b of books) {
    const key = groupKey(b);
    const g = groups.get(key) ?? { key, classLevel: b.classLevel, language: b.language, books: [] };
    g.books.push(b);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, books: g.books.sort((a, b) => a.subject.localeCompare(b.subject)) }))
    .sort((a, b) => firstNumber(a.classLevel) - firstNumber(b.classLevel) || a.language.localeCompare(b.language));
}
