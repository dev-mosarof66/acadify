/*
 * Labels and formatters shared by server and client components.
 * (Plain module on purpose: values exported from a "use client" file can't be called from server code.)
 */

export const SHIFT_LABELS = { morning: "Morning", day: "Day", evening: "Evening" } as const;

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
/** "2026-10-16" → "Friday 16 October" */
export const dayLabel = (date: string) => DATE_LABEL.format(new Date(`${date}T00:00:00Z`));

/** Class 9–10 study groups. */
export const STUDY_GROUPS = ["science", "commerce", "humanities"] as const;
export type StudyGroup = (typeof STUDY_GROUPS)[number];
export const GROUP_LABELS: Record<StudyGroup, string> = { science: "Science", commerce: "Commerce", humanities: "Humanities" };
/** Does a subject taught to `subjectGroup` (null = everyone) apply to a student of `studentGroup`? */
export const subjectApplies = (subjectGroup: StudyGroup | null, studentGroup: StudyGroup | null) => subjectGroup === null || subjectGroup === studentGroup;
