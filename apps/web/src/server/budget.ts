import { createTransactionSchema, monthQuerySchema } from "@budgeting/ledger";
import { createServerFn } from "@tanstack/react-start";

export const getMonth = createServerFn({ method: "GET" })
	.validator(monthQuerySchema)
	.handler(async ({ data }) => {
		const { getDb, getMonthSnapshot } = await import("@budgeting/ledger/db");
		const db = await getDb();
		return getMonthSnapshot(db, data.month);
	});

export const createTransaction = createServerFn({ method: "POST" })
	.validator(createTransactionSchema)
	.handler(async ({ data }) => {
		const { LedgerError, getDb, insertTransaction } = await import(
			"@budgeting/ledger/db"
		);
		try {
			const db = await getDb();
			await insertTransaction(db, data);
			return { ok: true as const };
		} catch (error) {
			if (error instanceof LedgerError) {
				return { ok: false as const, message: error.message };
			}
			throw error;
		}
	});
