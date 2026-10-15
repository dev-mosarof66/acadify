"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Selection: ids persist across pages and filters until cleared.
 * ------------------------------------------------------------------------- */

export function useSelection<T>(getId: (item: T) => string) {
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());

  const isSelected = React.useCallback((item: T) => selected.has(getId(item)), [selected, getId]);

  const toggle = React.useCallback(
    (item: T) =>
      setSelected((prev) => {
        const next = new Set(prev);
        const id = getId(item);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [getId]
  );

  /** Selects every item in `items` if any is unselected, otherwise unselects them all. */
  const toggleMany = React.useCallback(
    (items: T[]) =>
      setSelected((prev) => {
        const next = new Set(prev);
        const allOn = items.length > 0 && items.every((i) => next.has(getId(i)));
        items.forEach((i) => (allOn ? next.delete(getId(i)) : next.add(getId(i))));
        return next;
      }),
    [getId]
  );

  const selectMany = React.useCallback((items: T[]) => setSelected((prev) => new Set([...prev, ...items.map(getId)])), [getId]);
  const clear = React.useCallback(() => setSelected(new Set()), []);

  return { selected, count: selected.size, isSelected, toggle, toggleMany, selectMany, clear };
}

/** Header checkbox for the rows currently shown: checked, unchecked or partial. */
export function SelectAllCheckbox<T>({
  items,
  isSelected,
  onToggle,
  label = "Select all rows on this page",
}: {
  items: T[];
  isSelected: (item: T) => boolean;
  onToggle: () => void;
  label?: string;
}) {
  const on = items.filter(isSelected).length;
  const all = items.length > 0 && on === items.length;
  return (
    <Checkbox
      checked={all}
      indeterminate={on > 0 && !all}
      onCheckedChange={onToggle}
      disabled={items.length === 0}
      aria-label={label}
      className="size-[18px] rounded-[5px]"
    />
  );
}

export function RowCheckbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={label} className="size-[18px] rounded-[5px]" />;
}

/** Bar shown while rows are selected: count, "select all matching", bulk actions, clear. */
export function BulkBar({
  count,
  total,
  onSelectAll,
  onClear,
  children,
}: {
  count: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-primary-light px-4 py-2.5 text-sm animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <span className="font-bold text-primary tabular-nums" aria-live="polite">
        {count} selected
      </span>
      {count < total && (
        <button type="button" onClick={onSelectAll} className="font-semibold text-primary underline-offset-2 hover:underline">
          Select all {total} matching
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {children}
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1 rounded-full px-3 font-semibold">
          <X className="size-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}

/** Small outline action button for the bulk bar. */
export function BulkAction({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 gap-1.5 rounded-full border-primary/30 bg-card px-3 font-semibold hover:bg-card dark:bg-card"
    >
      {children}
    </Button>
  );
}

/** Removable pill for an active filter. */
export function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-light pr-1 pl-3 text-[13px] font-semibold text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="grid size-6 place-items-center rounded-full hover:bg-primary hover:text-primary-foreground"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * Pagination
 * ------------------------------------------------------------------------- */

export const PAGE_SIZES = [10, 20, 50] as const;

/** Pages over `items`; jumps back to page 1 whenever `resetKey` changes (filters, search, sort). */
export function usePagination<T>(items: T[], resetKey: string, initialSize: number = PAGE_SIZES[0]) {
  const [pageSize, setPageSize] = React.useState(initialSize);
  const [page, setPage] = React.useState(1);
  const [lastKey, setLastKey] = React.useState(resetKey);

  // Reset during render (not in an effect) when the filters change
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    page: current,
    pageCount,
    pageSize,
    pageItems,
    from: items.length ? start + 1 : 0,
    to: start + pageItems.length,
    total: items.length,
    setPage: (p: number) => setPage(Math.min(Math.max(1, p), pageCount)),
    setPageSize: (s: number) => {
      setPageSize(s);
      setPage(1);
    },
  };
}

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageList(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function PaginationBar({
  page,
  pageCount,
  pageSize,
  from,
  to,
  total,
  noun,
  setPage,
  setPageSize,
}: ReturnType<typeof usePagination<unknown>> & { noun: string }) {
  const sizeItems = PAGE_SIZES.map((s) => ({ value: String(s), label: `${s} / page` }));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px]">
      <p className="text-muted-foreground tabular-nums">
        {total ? `Showing ${from}–${to} of ${total} ${total === 1 ? noun.replace(/s$/, "") : noun}` : `No ${noun}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => v && setPageSize(Number(v))} items={sizeItems}>
          <SelectTrigger aria-label="Rows per page" className="h-8 w-[118px] rounded-lg bg-card text-[13px] dark:bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeItems.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="size-8 rounded-lg bg-card dark:bg-card"
          >
            <ChevronLeft />
          </Button>
          {pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="icon"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn("size-8 rounded-lg text-[13px] font-bold tabular-nums", p !== page && "text-muted-foreground")}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="size-8 rounded-lg bg-card dark:bg-card"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ----------------------------------------------------------------------------
 * Export helpers
 * ------------------------------------------------------------------------- */

/** Downloads rows as a CSV file (UTF-8 with BOM so Excel shows Bangla/৳ correctly). */
export function downloadCsv(filename: string, rows: Record<string, string | number | undefined>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | undefined) => {
    const s = v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copies text and briefly reports success through the returned label. */
export function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false)
    );
  return { copied, copy };
}
