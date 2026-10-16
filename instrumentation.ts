export async function register() {
  // The knowledge-base worker needs the Node.js runtime and a server that stays up with a disk
  // (it is skipped on serverless hosting such as Vercel, where uploads are turned off anyway)
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startKbWorker } = await import("./lib/kb/worker");
    startKbWorker();
  }
}
