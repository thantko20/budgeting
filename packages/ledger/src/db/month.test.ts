import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { SEED_ACCOUNT_ID } from "../ids";
import { openBudgetDatabase } from "./client";
import { getMonthSnapshot, insertTransaction } from "./queries";

const clients: PGlite[] = [];

afterEach(async () => {
	await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe("month snapshot", () => {
	it("keeps a refund inside the civil month and out of the next one", async () => {
		const client = new PGlite();
		clients.push(client);
		const db = await openBudgetDatabase(client);

		await insertTransaction(db, {
			accountId: SEED_ACCOUNT_ID,
			categoryId: "cat_salary",
			direction: "income",
			amount: "500000",
			occurredOn: "2026-10-01",
			payee: "Employer",
		});
		await insertTransaction(db, {
			accountId: SEED_ACCOUNT_ID,
			categoryId: "cat_food",
			direction: "expense",
			amount: "20000",
			occurredOn: "2026-10-31",
			payee: "Market",
		});
		await insertTransaction(db, {
			accountId: SEED_ACCOUNT_ID,
			categoryId: "cat_food",
			direction: "expense",
			amount: "-5000",
			occurredOn: "2026-10-31",
			payee: "Market refund",
		});
		await insertTransaction(db, {
			accountId: SEED_ACCOUNT_ID,
			categoryId: "cat_transport",
			direction: "expense",
			amount: "3000",
			occurredOn: "2026-11-01",
			payee: "Bus",
		});

		const october = await getMonthSnapshot(db, "2026-10");
		expect(october.start).toBe("2026-10-01");
		expect(october.end).toBe("2026-10-31");
		expect(october.transactions).toHaveLength(3);
		expect(october.summaries).toEqual([
			{
				currency: "MMK",
				incomeMinor: 500000,
				expenseMinor: 15000,
				netMinor: 485000,
				spendingByCategory: [
					{ categoryId: "cat_food", name: "Food", totalMinor: 15000 },
				],
			},
		]);

		const november = await getMonthSnapshot(db, "2026-11");
		expect(november.transactions.map((row) => row.payee)).toEqual(["Bus"]);
		expect(november.summaries[0]?.expenseMinor).toBe(3000);
	});
});
