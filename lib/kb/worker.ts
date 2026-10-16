import "server-only";

import { listJobs } from "./jobs";
import { advanceJob } from "./process";
import { needsWork } from "./queue";

const TICK_MS = 5000;

declare global {
  var __kbWorker: ReturnType<typeof setInterval> | undefined;
}

/**
 * The background job: every few seconds, move along every knowledge-base upload that has work left
 * (reading its contents, handing queued chapters to the parser, saving finished ones into kb/).
 * It runs inside the server process, so the dashboard page does not need to stay open, and after a
 * restart it carries on from the job files. Started once from instrumentation.ts.
 */
export function startKbWorker() {
  if (globalThis.__kbWorker) return; // already running (dev reloads call this again)

  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      for (const job of await listJobs()) {
        if (!needsWork(job)) continue;
        try {
          await advanceJob(job.id);
        } catch (err) {
          console.error(`[kb] job ${job.id} could not be advanced:`, err);
        }
      }
    } catch (err) {
      console.error("[kb] worker tick failed:", err);
    } finally {
      busy = false;
    }
  };

  globalThis.__kbWorker = setInterval(tick, TICK_MS);
  globalThis.__kbWorker.unref?.();
  console.log("[kb] background worker started");
}
