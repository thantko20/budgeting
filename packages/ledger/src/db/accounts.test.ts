import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_ACCOUNT_ID } from "../ids";
import { openBudgetDatabase } from "./client";
import { applyMigrations } from "./migrate";
import {
	getAccountSnapshot,
	getMonthSnapshot,
	insertAccount,
	insertTransaction,
	insertTransfer,
	LedgerError,
	setAccountArchived,
} from "./queries";

const clients: PGlite[] = [];

afterEach(async () => {
	await Promise.all(clients.splice(0).map((client) => client.close()));
});

function migrationSql(name: string): string {
	return readFileSync(
		join(dirname(fileURLToPath(import.meta.url)), "../../drizzle", name),
		"utf8",
	);
}

describe("account migration", () => {
	it("keeps an existing cash row and marks it type cash", async () => {
		const client = new PGlite();
		clients.push(client);
		await client.exec(migrationSql("0000_init.sql"));
		await client.exec(`
			CREATE TABLE schema_migrations (
				id text PRIMARY KEY,
				applied_at timestamptz NOT NULL DEFAULT now()
			);
		`);
		await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
			"0000_init",
		]);
		await client.query(
			"INSERT INTO accounts (id, owner_id, name, currency, created_at) VALUES ($1, $2, $3, $4, $5)",
			["acct_cash", "local", "Cash", "MMK", "2026-10-01T00:00:00.000Z"],
		);

		await applyMigrations(client);

		const rows = await client.query<{
			type: string;
			opening_balance_minor: string | number;
			archived: boolean;
		}>(
			"SELECT type, opening_balance_minor, archived FROM accounts WHERE id = $1",
			["acct_cash"],
		);
		expect(rows.rows[0]?.type).toBe("cash");
		expect(Number(rows.rows[0]?.opening_balance_minor)).toBe(0);
		expect(rows.rows[0]?.archived).toBe(false);
	});
});

describe("accounts and transfers", () => {
	it("seeds cash as a cash account", async () => {
		const db = await database();
		const snapshot = await getAccountSnapshot(db);
		const cash = snapshot.accounts.find(
			(account) => account.id === SEED_ACCOUNT_ID,
		);
		expect(cash).toMatchObject({
			name: "Cash",
			type: "cash",
			currency: "MMK",
			archived: false,
			openingBalanceMinor: 0,
		});
	});

	it("moves balances on a transfer and leaves month income and expenses alone", async () => {
		const db = await database();
		const bank = await insertAccount(db, {
			name: "CB Bank",
			type: "bank",
			currency: "MMK",
			openingBalance: "1000000",
		});
		const wallet = await insertAccount(db, {
			name: "KBZPay",
			type: "digital_wallet",
			currency: "MMK",
			openingBalance: "",
		});
		const card = await insertAccount(db, {
			name: "Visa",
			type: "credit_card",
			currency: "MMK",
			openingBalance: "20000",
		});

		await insertTransaction(db, {
			accountId: card.id,
			categoryId: "cat_food",
			direction: "expense",
			amount: "5000",
			occurredOn: "2026-10-15",
			payee: "Market",
		});
		await insertTransfer(db, {
			fromAccountId: bank.id,
			toAccountId: wallet.id,
			amount: "30000",
			occurredOn: "2026-10-16",
			memo: "Top up KBZPay",
		});
		await insertTransfer(db, {
			fromAccountId: bank.id,
			toAccountId: card.id,
			amount: "8000",
			occurredOn: "2026-10-20",
			memo: "Card payment",
		});

		const balances = await getAccountSnapshot(db);
		const byName = Object.fromEntries(
			balances.accounts.map((account) => [account.name, account]),
		);
		expect(byName["CB Bank"]?.signedBalanceMinor).toBe(962000);
		expect(byName.KBZPay?.signedBalanceMinor).toBe(30000);
		expect(byName.Visa?.displayKind).toBe("owed");
		expect(byName.Visa?.displayMinor).toBe(17000);
		expect(balances.netWorth).toContainEqual({
			currency: "MMK",
			assetsMinor: 992000,
			debtMinor: 17000,
			netMinor: 975000,
		});

		const october = await getMonthSnapshot(db, "2026-10");
		expect(october.transfers.map((transfer) => transfer.memo).sort()).toEqual([
			"Card payment",
			"Top up KBZPay",
		]);
		expect(october.summaries).toEqual([
			{
				currency: "MMK",
				incomeMinor: 0,
				expenseMinor: 5000,
				netMinor: -5000,
				spendingByCategory: [
					{ categoryId: "cat_food", name: "Food", totalMinor: 5000 },
				],
			},
		]);

		const walletOnly = await getMonthSnapshot(db, "2026-10", wallet.id);
		expect(walletOnly.transactions).toHaveLength(0);
		expect(walletOnly.transfers).toHaveLength(1);
		expect(walletOnly.summaries[0]).toMatchObject({
			incomeMinor: 0,
			expenseMinor: 0,
			netMinor: 0,
		});
	});

	it("rejects a cross-currency transfer without writing a row", async () => {
		const db = await database();
		const bank = await insertAccount(db, {
			name: "CB Bank",
			type: "bank",
			currency: "MMK",
			openingBalance: "",
		});
		const usd = await insertAccount(db, {
			name: "USD account",
			type: "bank",
			currency: "USD",
			openingBalance: "",
		});

		await expect(
			insertTransfer(db, {
				fromAccountId: bank.id,
				toAccountId: usd.id,
				amount: "1000",
				occurredOn: "2026-10-01",
				memo: "Should fail",
			}),
		).rejects.toThrow(LedgerError);

		const snapshot = await getMonthSnapshot(db, "2026-10");
		expect(snapshot.transfers).toHaveLength(0);
	});

	it("blocks new activity on an archived account and keeps its history", async () => {
		const db = await database();
		const wallet = await insertAccount(db, {
			name: "WavePay",
			type: "digital_wallet",
			currency: "MMK",
			openingBalance: "1000",
		});
		await insertTransaction(db, {
			accountId: wallet.id,
			categoryId: "cat_transport",
			direction: "expense",
			amount: "400",
			occurredOn: "2026-10-02",
			payee: "Bus",
		});
		await setAccountArchived(db, { id: wallet.id, archived: true });

		await expect(
			insertTransaction(db, {
				accountId: wallet.id,
				categoryId: "cat_food",
				direction: "expense",
				amount: "100",
				occurredOn: "2026-10-03",
				payee: "Tea",
			}),
		).rejects.toThrow(/archived/);
		await expect(
			insertTransfer(db, {
				fromAccountId: SEED_ACCOUNT_ID,
				toAccountId: wallet.id,
				amount: "100",
				occurredOn: "2026-10-03",
				memo: "Top up",
			}),
		).rejects.toThrow(/archived/);

		const october = await getMonthSnapshot(db, "2026-10", wallet.id);
		expect(october.transactions.map((row) => row.payee)).toEqual(["Bus"]);
		const snapshot = await getAccountSnapshot(db);
		const wave = snapshot.accounts.find((account) => account.id === wallet.id);
		expect(wave?.archived).toBe(true);
		expect(wave?.signedBalanceMinor).toBe(600);
		expect(
			snapshot.netWorth.find((row) => row.currency === "MMK")?.assetsMinor,
		).toBe(0);
	});
});

async function database() {
	const client = new PGlite();
	clients.push(client);
	return openBudgetDatabase(client);
}
