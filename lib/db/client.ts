import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/** Drizzle over Neon's HTTP driver. Shared by the app (via lib/db) and by scripts such as the seed. */
export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  return drizzle({ client: neon(url), schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
