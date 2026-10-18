import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyMigrations } from "./migrate";
import { schema } from "./schema-bundle";
import { seedIfEmpty } from "./seed";
import type { BudgetDatabase } from "./types";

/**
 * Local database is PGlite: Postgres compiled to WASM, stored in a directory,
 * with nothing else to install. Migrations are ordinary Postgres SQL, so a
 * later Render deploy can run the same file against hosted Postgres and swap
 * this client for Drizzle's node-postgres driver when DATABASE_URL is set.
 * This build opens the file database only; it does not connect out.
 */
const globalStore = globalThis as {
	__budgetDb?: Promise<BudgetDatabase>;
};

export async function openBudgetDatabase(
	client: PGlite,
): Promise<BudgetDatabase> {
	await applyMigrations(client);
	const db = drizzle({ client, schema });
	await seedIfEmpty(db);
	return db;
}

export function getDb(): Promise<BudgetDatabase> {
	if (!globalStore.__budgetDb) {
		globalStore.__budgetDb = openFileDatabase();
	}
	return globalStore.__budgetDb;
}

async function openFileDatabase(): Promise<BudgetDatabase> {
	const dataDir = process.env.BUDGET_DATA_DIR ?? join(process.cwd(), "data");
	const client = new PGlite(dataDir);
	return openBudgetDatabase(client);
}

export type { MonthSnapshot } from "./queries";
export { getMonthSnapshot, insertTransaction, LedgerError } from "./queries";
