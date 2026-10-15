"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** True only after hydration, so the icon never mismatches the server-rendered HTML. */
function useMounted() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      title={label}
      aria-label={label}
      className={cn(
        "size-10 rounded-full border-border bg-card text-primary hover:border-primary-bright hover:bg-primary-light hover:text-primary dark:bg-card dark:hover:bg-primary-light cursor-pointer",
        className
      )}
    >
      {isDark ? <Sun className="size-[18px] text-accent" /> : <Moon className="size-[18px]" />}
    </Button>
  );
}

export default ThemeToggle;
