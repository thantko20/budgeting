import { describe, expect, it } from "vitest";
import type { BalanceAccount } from "./accounts";
import { balancesForAccounts, netWorthByCurrency } from "./accounts";

function account(
	overrides: Partial<BalanceAccount> & Pick<BalanceAccount, "id" | "type">,
): BalanceAccount {
	return {
		name: overrides.id,
		currency: "MMK",
		openingBalanceMinor: 0,
		archived: false,
		...overrides,
	};
}

describe("balancesForAccounts", () => {
	it("adds income and incoming transfers and subtracts spending and outgoing transfers", () => {
		const [cash] = balancesForAccounts(
			[account({ id: "cash", type: "cash", openingBalanceMinor: 1000 })],
			[
				{ accountId: "cash", direction: "income", amountMinor: 500 },
				{ accountId: "cash", direction: "expense", amountMinor: 200 },
				{ accountId: "cash", direction: "expense", amountMinor: -50 },
			],
			[
				{ fromAccountId: "cash", toAccountId: "wallet", amountMinor: 100 },
				{ fromAccountId: "bank", toAccountId: "cash", amountMinor: 30 },
			],
		);

		expect(cash?.signedBalanceMinor).toBe(1280);
		expect(cash?.displayKind).toBe("balance");
	});

	it("treats credit card spending as debt and a payment as a reduction", () => {
		const [card] = balancesForAccounts(
			[
				account({
					id: "card",
					type: "credit_card",
					openingBalanceMinor: 20000,
				}),
			],
			[
				{ accountId: "card", direction: "expense", amountMinor: 5000 },
				{ accountId: "card", direction: "expense", amountMinor: -1000 },
			],
			[{ fromAccountId: "bank", toAccountId: "card", amountMinor: 8000 }],
		);

		expect(card?.signedBalanceMinor).toBe(-16000);
		expect(card?.displayKind).toBe("owed");
		expect(card?.displayMinor).toBe(16000);
	});

	it("shows an overpaid credit card as a credit", () => {
		const [card] = balancesForAccounts(
			[account({ id: "card", type: "credit_card", openingBalanceMinor: 0 })],
			[],
			[{ fromAccountId: "bank", toAccountId: "card", amountMinor: 500 }],
		);

		expect(card?.displayKind).toBe("credit");
		expect(card?.displayMinor).toBe(500);
	});
});

describe("netWorthByCurrency", () => {
	it("subtracts credit card debt from assets and skips archived accounts", () => {
		const balances = balancesForAccounts(
			[
				account({ id: "cash", type: "cash", openingBalanceMinor: 100000 }),
				account({
					id: "card",
					type: "credit_card",
					openingBalanceMinor: 25000,
				}),
				account({
					id: "old",
					type: "bank",
					openingBalanceMinor: 999999,
					archived: true,
				}),
			],
			[],
			[],
		);

		expect(netWorthByCurrency(balances)).toEqual([
			{
				currency: "MMK",
				assetsMinor: 100000,
				debtMinor: 25000,
				netMinor: 75000,
			},
		]);
	});

	it("counts a credit card credit toward net worth and keeps currencies apart", () => {
		const balances = balancesForAccounts(
			[
				account({ id: "cash", type: "cash", openingBalanceMinor: 1000 }),
				account({
					id: "card",
					type: "credit_card",
					currency: "MMK",
					openingBalanceMinor: 0,
				}),
				account({
					id: "usd",
					type: "bank",
					currency: "USD",
					openingBalanceMinor: 500,
				}),
			],
			[],
			[{ fromAccountId: "cash", toAccountId: "card", amountMinor: 200 }],
		);

		expect(netWorthByCurrency(balances)).toEqual([
			{ currency: "MMK", assetsMinor: 800, debtMinor: -200, netMinor: 1000 },
			{ currency: "USD", assetsMinor: 500, debtMinor: 0, netMinor: 500 },
		]);
	});
});
