export const DEFAULT_TIME_ZONE = "Asia/Yangon";

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidMonth(value: string): boolean {
	const match = MONTH_PATTERN.exec(value);
	if (!match) {
		return false;
	}
	const month = Number(match[2]);
	return month >= 1 && month <= 12;
}

export function isValidCivilDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) {
		return false;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < 1900 || year > 9999 || month < 1 || month > 12) {
		return false;
	}
	return day >= 1 && day <= lastDayOfMonth(year, month);
}

export function lastDayOfMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthBounds(month: string): { start: string; end: string } {
	if (!isValidMonth(month)) {
		throw new Error(`Invalid month: ${month}`);
	}
	const year = Number(month.slice(0, 4));
	const monthNumber = Number(month.slice(5, 7));
	const last = lastDayOfMonth(year, monthNumber);
	return {
		start: `${month}-01`,
		end: `${month}-${String(last).padStart(2, "0")}`,
	};
}

export function shiftMonth(month: string, delta: number): string {
	if (!isValidMonth(month) || !Number.isInteger(delta)) {
		throw new Error(`Cannot shift month ${month} by ${delta}`);
	}
	const year = Number(month.slice(0, 4));
	const monthIndex = Number(month.slice(5, 7)) - 1;
	const shifted = new Date(Date.UTC(year, monthIndex + delta, 1));
	const nextYear = shifted.getUTCFullYear();
	const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
	return `${nextYear}-${nextMonth}`;
}

export function civilDateInTimeZone(instant: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(instant);
	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;
	if (!year || !month || !day) {
		throw new Error(`Could not resolve a civil date in ${timeZone}`);
	}
	return `${year}-${month}-${day}`;
}

export function currentMonth(timeZone: string, now = new Date()): string {
	return civilDateInTimeZone(now, timeZone).slice(0, 7);
}

export function monthOfCivilDate(civilDate: string): string {
	if (!isValidCivilDate(civilDate)) {
		throw new Error(`Invalid civil date: ${civilDate}`);
	}
	return civilDate.slice(0, 7);
}

export function civilDateInMonth(civilDate: string, month: string): boolean {
	const bounds = monthBounds(month);
	return civilDate >= bounds.start && civilDate <= bounds.end;
}

export function formatMonthLabel(month: string): string {
	if (!isValidMonth(month)) {
		throw new Error(`Invalid month: ${month}`);
	}
	const year = Number(month.slice(0, 4));
	const monthNumber = Number(month.slice(5, 7));
	const instant = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
	return new Intl.DateTimeFormat("en", {
		timeZone: "UTC",
		month: "long",
		year: "numeric",
	}).format(instant);
}
