import { describe, expect, it } from "vitest";
import { monthlyTrend } from "./trend";

describe("monthlyTrend", () => {
	it("fills a six-month window and keeps refunds inside income and expenses", () => {
		const points = monthlyTrend({
			endMonth: "2026-10",
			count: 6,
			currency: "MMK",
			rows: [
				{
					occurredOn: "2026-10-01",
					direction: "income",
					amountMinor: 500000,
					currency: "MMK",
				},
				{
					occurredOn: "2026-10-02",
					direction: "income",
					amountMinor: -10000,
					currency: "MMK",
				},
				{
					occurredOn: "2026-10-15",
					direction: "expense",
					amountMinor: 20000,
					currency: "MMK",
				},
				{
					occurredOn: "2026-10-31",
					direction: "expense",
					amountMinor: -5000,
					currency: "MMK",
				},
				{
					occurredOn: "2026-08-01",
					direction: "expense",
					amountMinor: 3000,
					currency: "MMK",
				},
				{
					occurredOn: "2026-04-30",
					direction: "expense",
					amountMinor: 999999,
					currency: "MMK",
				},
			],
		});

		expect(points.map((point) => point.month)).toEqual([
			"2026-05",
			"2026-06",
			"2026-07",
			"2026-08",
			"2026-09",
			"2026-10",
		]);
		expect(points.map((point) => point.label)).toEqual([
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
		]);
		expect(points[3]).toMatchObject({
			expenseMinor: 3000,
			incomeMinor: 0,
			netMinor: -3000,
		});
		expect(points[5]).toMatchObject({
			incomeMinor: 490000,
			expenseMinor: 15000,
			netMinor: 475000,
		});
		expect(points[0]).toMatchObject({
			incomeMinor: 0,
			expenseMinor: 0,
			netMinor: 0,
		});
	});

	it("does not mix another currency into the window", () => {
		const [point] = monthlyTrend({
			endMonth: "2026-01",
			count: 1,
			currency: "MMK",
			rows: [
				{
					occurredOn: "2026-01-10",
					direction: "expense",
					amountMinor: 1050,
					currency: "USD",
				},
				{
					occurredOn: "2026-01-11",
					direction: "expense",
					amountMinor: 1500,
					currency: "MMK",
				},
			],
		});

		expect(point?.expenseMinor).toBe(1500);
	});

	it("rejects a window outside 1 to 24 months", () => {
		expect(() =>
			monthlyTrend({
				endMonth: "2026-10",
				count: 0,
				currency: "MMK",
				rows: [],
			}),
		).toThrow(/window/);
	});
});
