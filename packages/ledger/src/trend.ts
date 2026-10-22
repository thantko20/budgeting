import { isValidMonth, monthBounds, shiftMonth } from "./dates";
import type { CurrencyCode } from "./money";
import type { Direction } from "./schema";

export type TrendRow = {
	occurredOn: string;
	direction: Direction;
	amountMinor: number;
	currency: CurrencyCode;
};

export type TrendPoint = {
	month: string;
	label: string;
	incomeMinor: number;
	expenseMinor: number;
	netMinor: number;
};

/**
 * Income and expense for each civil month in a window ending at `endMonth`.
 * Transfers are not part of the input, so they cannot affect the trend.
 * Months with no activity stay in the window as zeros.
 */
export function monthlyTrend(input: {
	endMonth: string;
	count: number;
	currency: CurrencyCode;
	rows: TrendRow[];
}): TrendPoint[] {
	if (
		!isValidMonth(input.endMonth) ||
		!Number.isInteger(input.count) ||
		input.count < 1 ||
		input.count > 24
	) {
		throw new Error("Choose a month window from 1 to 24 months.");
	}

	const months: string[] = [];
	for (let offset = input.count - 1; offset >= 0; offset -= 1) {
		months.push(shiftMonth(input.endMonth, -offset));
	}

	return months.map((month) => {
		const bounds = monthBounds(month);
		let incomeMinor = 0;
		let expenseMinor = 0;
		for (const row of input.rows) {
			if (row.currency !== input.currency) {
				continue;
			}
			if (row.occurredOn < bounds.start || row.occurredOn > bounds.end) {
				continue;
			}
			if (row.direction === "income") {
				incomeMinor += row.amountMinor;
			} else {
				expenseMinor += row.amountMinor;
			}
		}
		return {
			month,
			label: shortMonthLabel(month),
			incomeMinor,
			expenseMinor,
			netMinor: incomeMinor - expenseMinor,
		};
	});
}

function shortMonthLabel(month: string): string {
	const year = Number(month.slice(0, 4));
	const monthNumber = Number(month.slice(5, 7));
	return new Intl.DateTimeFormat("en", {
		timeZone: "UTC",
		month: "short",
	}).format(new Date(Date.UTC(year, monthNumber - 1, 1, 12)));
}
