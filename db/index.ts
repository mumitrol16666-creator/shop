import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  try {
    const dbBinding = getD1Binding();
    if (dbBinding) {
      return drizzle(dbBinding, { schema });
    }
  } catch {}
  return null;
}

export function getD1Binding() {
  try {
    const g = globalThis as unknown as { env?: { DB?: any }; DB?: any };
    return g.env?.DB || g.DB || null;
  } catch {
    return null;
  }
}
