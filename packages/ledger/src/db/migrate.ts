import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PGlite } from "@electric-sql/pglite";

const MIGRATION_ID = "0000_init";

export async function applyMigrations(client: PGlite): Promise<void> {
	await client.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		);
	`);
	const existing = await client.query<{ id: string }>(
		"SELECT id FROM schema_migrations WHERE id = $1",
		[MIGRATION_ID],
	);
	if (existing.rows.length > 0) {
		return;
	}
	await client.exec(readMigrationSql());
	await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
		MIGRATION_ID,
	]);
}

function readMigrationSql(): string {
	const here = dirname(fileURLToPath(import.meta.url));
	const candidates = [
		join(here, "../../drizzle/0000_init.sql"),
		join(process.cwd(), "packages/ledger/drizzle/0000_init.sql"),
		join(process.cwd(), "../../packages/ledger/drizzle/0000_init.sql"),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return readFileSync(candidate, "utf8");
		}
	}
	throw new Error(
		"Could not find packages/ledger/drizzle/0000_init.sql. Run the server with the repo as the working directory, or from apps/web.",
	);
}
