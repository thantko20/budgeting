import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { schema } from "./schema-bundle";

export type BudgetDatabase = PgliteDatabase<typeof schema>;
