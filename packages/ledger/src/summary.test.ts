import { describe, expect, it } from "vitest";
import { summarizeByCurrency } from "./summary";

describe("summarizeByCurrency", () => {
	it("subtracts expense refunds from spending and from the category", () => {
		const [summary] = summarizeByCurrency([
			{
				direction: "income",
				amountMinor: 500000,
				currency: "MMK",
				categoryId: "cat_salary",
				categoryName: "Salary",
			},
			{
				direction: "expense",
				amountMinor: 20000,
				currency: "MMK",
				categoryId: "cat_food",
				categoryName: "Food",
			},
			{
				direction: "expense",
				amountMinor: -5000,
				currency: "MMK",
				categoryId: "cat_food",
				categoryName: "Food",
			},
			{
				direction: "income",
				amountMinor: -10000,
				currency: "MMK",
				categoryId: "cat_salary",
				categoryName: "Salary",
			},
		]);

		expect(summary).toMatchObject({
			currency: "MMK",
			incomeMinor: 490000,
			expenseMinor: 15000,
			netMinor: 475000,
		});
		expect(summary?.spendingByCategory).toEqual([
			{ categoryId: "cat_food", name: "Food", totalMinor: 15000 },
		]);
	});

	it("does not add minor units of different currencies together", () => {
		const summaries = summarizeByCurrency([
			{
				direction: "expense",
				amountMinor: 1500,
				currency: "MMK",
				categoryId: "cat_food",
				categoryName: "Food",
			},
			{
				direction: "expense",
				amountMinor: 1050,
				currency: "USD",
				categoryId: "cat_food",
				categoryName: "Food",
			},
		]);

		expect(summaries.map((summary) => summary.currency)).toEqual([
			"MMK",
			"USD",
		]);
		expect(summaries[0]?.expenseMinor).toBe(1500);
		expect(summaries[1]?.expenseMinor).toBe(1050);
	});
});
