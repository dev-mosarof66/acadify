import "server-only";

import { createDb } from "./client";

/** Server-only database handle. Importing this from a Client Component fails the build. */
export const db = createDb();

export * from "./schema";
