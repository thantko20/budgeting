import { formatAmount } from "@/lib/format-amount";

export type ActivityKind = "income" | "expense" | "transfer";

export type ActivityItem = {
	id: string;
	occurredOn: string;
	createdAt: string;
	title: string;
	account: string;
	accountId: string;
	otherAccountId?: string;
	category: string;
	categoryId?: string;
	kind: ActivityKind;
	amountMinor: number;
	currency: string;
};

export function buildActivity(data: {
	transactions: Array<{
		id: string;
		occurredOn: string;
		createdAt: string;
		payee: string;
		direction: string;
		amountMinor: number;
		categoryId: string;
		categoryName: string;
		accountId: string;
		accountName: string;
		currency: string;
	}>;
	transfers: Array<{
		id: string;
		occurredOn: string;
		createdAt: string;
		memo: string;
		amountMinor: number;
		currency: string;
		fromAccountId: string;
		fromAccountName: string;
		toAccountId: string;
		toAccountName: string;
	}>;
}): ActivityItem[] {
	return [
		...data.transactions.map((transaction) => ({
			id: transaction.id,
			occurredOn: transaction.occurredOn,
			createdAt: transaction.createdAt,
			title: transaction.payee,
			account: transaction.accountName,
			accountId: transaction.accountId,
			category: transaction.categoryName,
			categoryId: transaction.categoryId,
			kind: (transaction.direction === "income"
				? "income"
				: "expense") as ActivityKind,
			amountMinor: transaction.amountMinor,
			currency: transaction.currency,
		})),
		...data.transfers.map((transfer) => ({
			id: transfer.id,
			occurredOn: transfer.occurredOn,
			createdAt: transfer.createdAt,
			title: transfer.memo,
			account: `${transfer.fromAccountName} → ${transfer.toAccountName}`,
			accountId: transfer.fromAccountId,
			otherAccountId: transfer.toAccountId,
			category: "Transfer",
			kind: "transfer" as const,
			amountMinor: transfer.amountMinor,
			currency: transfer.currency,
		})),
	].sort(
		(left, right) =>
			right.occurredOn.localeCompare(left.occurredOn) ||
			right.createdAt.localeCompare(left.createdAt),
	);
}

export function formatCivilDate(civilDate: string): string {
	const [year, month, day] = civilDate.split("-").map(Number);
	if (!year || !month || !day) {
		return civilDate;
	}
	return new Intl.DateTimeFormat("en", {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function presentAmount(
	kind: ActivityKind,
	amountMinor: number,
	currency: string,
): { text: string; tone: "income" | "expense" | "neutral" } {
	if (kind === "transfer") {
		return { text: formatAmount(amountMinor, currency), tone: "neutral" };
	}
	if (kind === "income") {
		if (amountMinor < 0) {
			return { text: formatAmount(amountMinor, currency), tone: "expense" };
		}
		return {
			text: `+${formatAmount(amountMinor, currency)}`,
			tone: "income",
		};
	}
	if (amountMinor < 0) {
		return {
			text: `+${formatAmount(Math.abs(amountMinor), currency)}`,
			tone: "income",
		};
	}
	return {
		text: `−${formatAmount(amountMinor, currency)}`,
		tone: "expense",
	};
}

export function amountToneClass(
	tone: "income" | "expense" | "neutral",
): string {
	if (tone === "income") {
		return "text-emerald-700 dark:text-emerald-400";
	}
	if (tone === "expense") {
		return "text-rose-700 dark:text-rose-400";
	}
	return "text-foreground";
}
