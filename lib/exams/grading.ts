/*
 * Grading scales. Percentages are marks ÷ full marks × 100 for each subject.
 *
 * gpa5: Bangladesh SSC/Dakhil/HSC scale. A failed subject (F) makes the overall result F with GPA 0.00.
 * qawmi: Mumtaz–Rasib divisions used by Qawmi madrasahs, on the overall percentage. Below 35% is Rasib (fail).
 * If a madrasah board uses different cut-offs, change QAWMI below; nothing else needs to change.
 */

export type GradingScale = "gpa5" | "qawmi";

export const SCALE_LABELS: Record<GradingScale, string> = {
  gpa5: "GPA 5.0 (A+ to F)",
  qawmi: "Mumtaz to Rasib (Qawmi)",
};

const GPA5 = [
  { min: 80, grade: "A+", point: 5 },
  { min: 70, grade: "A", point: 4 },
  { min: 60, grade: "A-", point: 3.5 },
  { min: 50, grade: "B", point: 3 },
  { min: 40, grade: "C", point: 2 },
  { min: 33, grade: "D", point: 1 },
  { min: 0, grade: "F", point: 0 },
] as const;

const QAWMI = [
  { min: 80, grade: "Mumtaz" },
  { min: 65, grade: "Jayyid Jiddan" },
  { min: 50, grade: "Jayyid" },
  { min: 35, grade: "Maqbul" },
  { min: 0, grade: "Rasib" },
] as const;

export interface SubjectScore {
  marks: number | null;
  absent: boolean;
  fullMarks: number;
  passMarks: number;
}

export interface SubjectGrade {
  grade: string;
  point: number | null;
  passed: boolean;
}

/** One subject's grade. Absent or below the subject's pass marks counts as failed. */
export function gradeSubject(scale: GradingScale, s: SubjectScore): SubjectGrade {
  const pct = s.marks === null ? 0 : (s.marks / s.fullMarks) * 100;
  const passed = !s.absent && s.marks !== null && s.marks >= s.passMarks;
  if (scale === "gpa5") {
    if (!passed) return { grade: "F", point: 0, passed: false };
    const g = GPA5.find((b) => pct >= b.min)!;
    return { grade: g.grade, point: g.point, passed: true };
  }
  return { grade: passed ? QAWMI.find((b) => pct >= b.min)!.grade : "Rasib", point: null, passed };
}

export interface OverallResult {
  total: number;
  fullTotal: number;
  percent: number;
  /** "A+" / "F" for GPA; a division name for Qawmi. */
  grade: string;
  gpa: number | null;
  passed: boolean;
  /** False while some subjects have no marks yet. */
  complete: boolean;
}

export function overallResult(scale: GradingScale, subjects: SubjectScore[]): OverallResult {
  const complete = subjects.length > 0 && subjects.every((s) => s.absent || s.marks !== null);
  const total = subjects.reduce((n, s) => n + (s.marks ?? 0), 0);
  const fullTotal = subjects.reduce((n, s) => n + s.fullMarks, 0);
  const percent = fullTotal ? Math.round((total / fullTotal) * 1000) / 10 : 0;
  const grades = subjects.map((s) => gradeSubject(scale, s));
  const passed = complete && grades.every((g) => g.passed);

  if (scale === "gpa5") {
    if (!passed) return { total, fullTotal, percent, grade: "F", gpa: 0, passed: false, complete };
    const gpa = Math.round((grades.reduce((n, g) => n + (g.point ?? 0), 0) / grades.length) * 100) / 100;
    // Overall letter from the GPA
    const grade = gpa >= 5 ? "A+" : gpa >= 4 ? "A" : gpa >= 3.5 ? "A-" : gpa >= 3 ? "B" : gpa >= 2 ? "C" : "D";
    return { total, fullTotal, percent, grade, gpa, passed, complete };
  }
  const grade = passed ? QAWMI.find((b) => percent >= b.min)!.grade : "Rasib";
  return { total, fullTotal, percent, grade, gpa: null, passed, complete };
}

/** Merit positions: passed students by GPA (or %) then total marks; ties share a position. */
export function meritPositions<T extends { id: string; result: OverallResult }>(rows: T[]): Map<string, number> {
  const ranked = rows
    .filter((r) => r.result.passed)
    .sort((a, b) => (b.result.gpa ?? b.result.percent) - (a.result.gpa ?? a.result.percent) || b.result.total - a.result.total);
  const positions = new Map<string, number>();
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    const tie = prev && (prev.result.gpa ?? prev.result.percent) === (r.result.gpa ?? r.result.percent) && prev.result.total === r.result.total;
    positions.set(r.id, tie ? positions.get(prev.id)! : i + 1);
  });
  return positions;
}
