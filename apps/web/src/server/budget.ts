import {
	createAccountSchema,
	createTransactionSchema,
	createTransferSchema,
	monthQuerySchema,
	setAccountArchivedSchema,
	updateAccountSchema,
} from "@budgeting/ledger";
import { createServerFn } from "@tanstack/react-start";

export const getMonth = createServerFn({ method: "GET" })
	.validator(monthQuerySchema)
	.handler(async ({ data }) => {
		const { getDb, getMonthSnapshot } = await import("@budgeting/ledger/db");
		const db = await getDb();
		return getMonthSnapshot(db, data.month, data.accountId);
	});

export const getAccounts = createServerFn({ method: "GET" }).handler(
	async () => {
		const { getAccountSnapshot, getDb } = await import("@budgeting/ledger/db");
		const db = await getDb();
		return getAccountSnapshot(db);
	},
);

export const createTransaction = createServerFn({ method: "POST" })
	.validator(createTransactionSchema)
	.handler(async ({ data }) => {
		const { getDb, insertTransaction } = await import("@budgeting/ledger/db");
		return run(async () => insertTransaction(await getDb(), data));
	});

export const createTransfer = createServerFn({ method: "POST" })
	.validator(createTransferSchema)
	.handler(async ({ data }) => {
		const { getDb, insertTransfer } = await import("@budgeting/ledger/db");
		return run(async () => insertTransfer(await getDb(), data));
	});

export const createAccount = createServerFn({ method: "POST" })
	.validator(createAccountSchema)
	.handler(async ({ data }) => {
		const { getDb, insertAccount } = await import("@budgeting/ledger/db");
		return run(async () => insertAccount(await getDb(), data));
	});

export const updateAccount = createServerFn({ method: "POST" })
	.validator(updateAccountSchema)
	.handler(async ({ data }) => {
		const { getDb, updateAccount: updateAccountRow } = await import(
			"@budgeting/ledger/db"
		);
		return run(async () => {
			await updateAccountRow(await getDb(), data);
		});
	});

export const setAccountArchived = createServerFn({ method: "POST" })
	.validator(setAccountArchivedSchema)
	.handler(async ({ data }) => {
		const { getDb, setAccountArchived: setArchived } = await import(
			"@budgeting/ledger/db"
		);
		return run(async () => {
			await setArchived(await getDb(), data);
		});
	});

async function run(work: () => Promise<unknown>) {
	const { LedgerError } = await import("@budgeting/ledger/db");
	try {
		await work();
		return { ok: true as const };
	} catch (error) {
		if (error instanceof LedgerError) {
			return { ok: false as const, message: error.message };
		}
		throw error;
	}
}
