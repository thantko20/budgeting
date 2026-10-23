import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = ["0000_init", "0001_accounts"] as const;

export async function applyMigrations(client: PGlite): Promise<void> {
	await client.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		);
	`);
	for (const id of MIGRATIONS) {
		const existing = await client.query<{ id: string }>(
			"SELECT id FROM schema_migrations WHERE id = $1",
			[id],
		);
		if (existing.rows.length > 0) {
			continue;
		}
		await client.exec(readMigrationSql(id));
		await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
	}
}

function readMigrationSql(id: string): string {
	const fileName = `${id}.sql`;
	const here = dirname(fileURLToPath(import.meta.url));
	const candidates = [
		join(here, "../../drizzle", fileName),
		join(process.cwd(), "packages/ledger/drizzle", fileName),
		join(process.cwd(), "../../packages/ledger/drizzle", fileName),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return readFileSync(candidate, "utf8");
		}
	}
	throw new Error(
		`Could not find packages/ledger/drizzle/${fileName}. Run the server with the repo as the working directory, or from apps/web.`,
	);
}
