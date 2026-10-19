"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/super-admin/ui";
import { saveMeals, setBoarder } from "@/lib/boarding/actions";
import type { BoarderRow } from "@/lib/boarding/queries";
import { cn } from "@/lib/utils";

const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
] as const;
type Meal = (typeof MEALS)[number]["key"];

/** Meal sheet: tick who ate each meal; the totals are what the kitchen cooks for. */
export function MealSheet({ date, boarders, canEdit }: { date: string; boarders: BoarderRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(boarders);
  const [pending, start] = React.useTransition();
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  React.useEffect(() => setRows(boarders), [boarders]);

  const toggle = (id: string, meal: Meal) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [meal]: !r[meal] } : r)));
  const setAll = (meal: Meal, value: boolean) => setRows((rs) => rs.map((r) => ({ ...r, [meal]: value })));
  const total = (meal: Meal) => rows.filter((r) => r[meal]).length;

  const save = () =>
    start(async () => {
      const r = await saveMeals(date, rows.map((x) => ({ studentId: x.id, breakfast: x.breakfast, lunch: x.lunch, dinner: x.dinner })));
      setMessage(r.ok ? { ok: true, text: "Meals saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  const remove = (id: string) =>
    start(async () => {
      await setBoarder(id, false);
      router.refresh();
    });

  if (!rows.length) {
    return (
      <Panel>
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">No boarders yet. Add students below.</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3">
        {MEALS.map((m) => (
          <div key={m.key} className="rounded-xl bg-secondary px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-extrabold">{total(m.key)}</p>
            {canEdit && (
              <div className="mt-1 flex gap-3 text-xs font-semibold text-primary">
                <button type="button" onClick={() => setAll(m.key, true)}>
                  All
                </button>
                <button type="button" onClick={() => setAll(m.key, false)}>
                  None
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{r.nameBn || r.name}</p>
              <p className="text-xs text-muted-foreground">
                {r.className} · {r.sectionName} · Roll {r.roll}
              </p>
            </div>
            <div className="flex gap-1.5">
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(r.id, m.key)}
                  className={cn("h-9 rounded-lg border px-3 text-xs font-bold", r[m.key] ? "border-primary/30 bg-primary-light text-primary" : "border-border text-muted-foreground")}
                >
                  {m.label}
                </button>
              ))}
              {canEdit && (
                <button
                  type="button"
                  aria-label="Remove from boarding"
                  className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <UserMinus className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="flex items-center justify-end gap-3 border-t border-border p-4">
          {message && <span className={cn("text-sm font-semibold", message.ok ? "text-primary" : "text-destructive")}>{message.text}</span>}
          <Button onClick={save} disabled={pending} className="h-10 rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save meals
          </Button>
        </div>
      )}
    </Panel>
  );
}

/** Picks a student to add to the boarding. */
export function AddBoarder({ options }: { options: { id: string; label: string }[] }) {
  const router = useRouter();
  const [id, setId] = React.useState("");
  const [pending, start] = React.useTransition();
  const add = () =>
    start(async () => {
      await setBoarder(id, true);
      setId("");
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={id} onChange={(e) => setId(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm sm:max-w-sm">
        <option value="">Add a student to the boarding…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <Button variant="outline" className="h-10 rounded-xl" disabled={!id || pending} onClick={add}>
        <UserPlus className="size-4" />
        Add
      </Button>
    </div>
  );
}
