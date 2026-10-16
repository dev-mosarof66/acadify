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
