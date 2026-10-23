import {
	currentMonth,
	DEFAULT_TIME_ZONE,
	isValidMonth,
} from "@budgeting/ledger";

export function readMonth(search: Record<string, unknown>): string {
	const month = search.month;
	if (typeof month === "string" && isValidMonth(month)) {
		return month;
	}
	return currentMonth(DEFAULT_TIME_ZONE);
}

export function readOptionalId(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}
	return undefined;
}
