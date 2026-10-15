/*
 * Labels and formatters shared by server and client components.
 * (Plain module on purpose: values exported from a "use client" file can't be called from server code.)
 */

export const SHIFT_LABELS = { morning: "Morning", day: "Day", evening: "Evening" } as const;

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
/** "2026-10-16" → "Friday 16 October" */
export const dayLabel = (date: string) => DATE_LABEL.format(new Date(`${date}T00:00:00Z`));
