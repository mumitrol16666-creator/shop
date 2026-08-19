import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  try {
    // In Cloudflare Workers environment, env is available on globalThis or cloudflare runtime
    const g = globalThis as unknown as { env?: { DB?: any }; DB?: any };
    const dbBinding = g.env?.DB || g.DB;
    if (dbBinding) {
      return drizzle(dbBinding, { schema });
    }
  } catch {}
  return null;
}
