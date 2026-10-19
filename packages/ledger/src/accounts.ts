import type { CurrencyCode } from "./money";
import type { AccountType, Direction } from "./schema";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
	cash: "Cash",
	bank: "Bank",
	digital_wallet: "Digital wallet",
	credit_card: "Credit card",
	other: "Other",
};

export function isLiability(type: AccountType): boolean {
	return type === "credit_card";
}

export type BalanceTransaction = {
	accountId: string;
	direction: Direction;
	amountMinor: number;
};

export type BalanceTransfer = {
	fromAccountId: string;
	toAccountId: string;
	amountMinor: number;
};

export type BalanceAccount = {
	id: string;
	name: string;
	type: AccountType;
	currency: CurrencyCode;
	openingBalanceMinor: number;
	archived: boolean;
};

export type AccountBalance = BalanceAccount & {
	signedBalanceMinor: number;
	displayMinor: number;
	displayKind: "balance" | "owed" | "credit";
};

export type CurrencyNetWorth = {
	currency: CurrencyCode;
	assetsMinor: number;
	debtMinor: number;
	netMinor: number;
};

/**
 * Signed balance is money you have. Credit cards store a positive opening
 * balance as amount already owed, so their signed balance is negative while
 * a debt remains. Spending and transfers out decrease the signed balance.
 * Payments onto a card are transfers in and move the signed balance toward zero.
 */
export function balancesForAccounts(
	accountRows: BalanceAccount[],
	transactions: BalanceTransaction[],
	transfers: BalanceTransfer[],
): AccountBalance[] {
	return accountRows.map((account) => {
		let flow = 0;
		for (const transaction of transactions) {
			if (transaction.accountId !== account.id) {
				continue;
			}
			flow +=
				transaction.direction === "income"
					? transaction.amountMinor
					: -transaction.amountMinor;
		}
		for (const transfer of transfers) {
			if (transfer.toAccountId === account.id) {
				flow += transfer.amountMinor;
			}
			if (transfer.fromAccountId === account.id) {
				flow -= transfer.amountMinor;
			}
		}
		const opening = isLiability(account.type)
			? -account.openingBalanceMinor
			: account.openingBalanceMinor;
		const signedBalanceMinor = opening + flow;
		if (!isLiability(account.type)) {
			return {
				...account,
				signedBalanceMinor,
				displayMinor: signedBalanceMinor,
				displayKind: "balance" as const,
			};
		}
		if (signedBalanceMinor > 0) {
			return {
				...account,
				signedBalanceMinor,
				displayMinor: signedBalanceMinor,
				displayKind: "credit" as const,
			};
		}
		return {
			...account,
			signedBalanceMinor,
			displayMinor: -signedBalanceMinor,
			displayKind: "owed" as const,
		};
	});
}

export function netWorthByCurrency(
	accountRows: AccountBalance[],
): CurrencyNetWorth[] {
	const grouped = new Map<
		CurrencyCode,
		{ assetsMinor: number; debtMinor: number }
	>();
	for (const account of accountRows) {
		if (account.archived) {
			continue;
		}
		const current = grouped.get(account.currency) ?? {
			assetsMinor: 0,
			debtMinor: 0,
		};
		if (isLiability(account.type)) {
			current.debtMinor += -account.signedBalanceMinor;
		} else {
			current.assetsMinor += account.signedBalanceMinor;
		}
		grouped.set(account.currency, current);
	}

	return [...grouped.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([currency, totals]) => ({
			currency,
			assetsMinor: totals.assetsMinor,
			debtMinor: totals.debtMinor,
			netMinor: totals.assetsMinor - totals.debtMinor,
		}));
}
