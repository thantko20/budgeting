import type { CurrencyCode } from "./money";
import type { Direction } from "./schema";

export type SummaryRow = {
	direction: Direction;
	amountMinor: number;
	currency: CurrencyCode;
	categoryId: string;
	categoryName: string;
};

export type CategorySpending = {
	categoryId: string;
	name: string;
	totalMinor: number;
};

export type CurrencySummary = {
	currency: CurrencyCode;
	incomeMinor: number;
	expenseMinor: number;
	netMinor: number;
	spendingByCategory: CategorySpending[];
};

export function summarizeByCurrency(rows: SummaryRow[]): CurrencySummary[] {
	const grouped = new Map<CurrencyCode, SummaryRow[]>();
	for (const row of rows) {
		const bucket = grouped.get(row.currency);
		if (bucket) {
			bucket.push(row);
		} else {
			grouped.set(row.currency, [row]);
		}
	}

	return [...grouped.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([currency, currencyRows]) =>
			summarizeCurrency(currency, currencyRows),
		);
}

function summarizeCurrency(
	currency: CurrencyCode,
	rows: SummaryRow[],
): CurrencySummary {
	let incomeMinor = 0;
	let expenseMinor = 0;
	const categories = new Map<string, CategorySpending>();

	for (const row of rows) {
		if (row.direction === "income") {
			incomeMinor += row.amountMinor;
			continue;
		}

		expenseMinor += row.amountMinor;
		const existing = categories.get(row.categoryId);
		if (existing) {
			existing.totalMinor += row.amountMinor;
		} else {
			categories.set(row.categoryId, {
				categoryId: row.categoryId,
				name: row.categoryName,
				totalMinor: row.amountMinor,
			});
		}
	}

	const spendingByCategory = [...categories.values()]
		.filter((category) => category.totalMinor !== 0)
		.sort(
			(left, right) =>
				right.totalMinor - left.totalMinor ||
				left.name.localeCompare(right.name),
		);

	return {
		currency,
		incomeMinor,
		expenseMinor,
		netMinor: incomeMinor - expenseMinor,
		spendingByCategory,
	};
}
