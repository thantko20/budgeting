import { and, desc, eq, gte, lte } from "drizzle-orm";
import { civilDateInMonth, monthBounds } from "../dates";
import { LOCAL_OWNER_ID, SEED_ACCOUNT_ID } from "../ids";
import {
	DEFAULT_CURRENCY,
	isCurrencyCode,
	MoneyParseError,
	parseDecimalToMinor,
} from "../money";
import type { CreateTransactionInput, Direction } from "../schema";
import { type CurrencySummary, summarizeByCurrency } from "../summary";
import { accounts, categories, transactions } from "./schema";
import type { BudgetDatabase } from "./types";

export class LedgerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LedgerError";
	}
}

export type CategoryRecord = {
	id: string;
	name: string;
	direction: Direction;
};

export type TransactionRecord = {
	id: string;
	occurredOn: string;
	payee: string;
	direction: Direction;
	amountMinor: number;
	categoryId: string;
	categoryName: string;
	accountId: string;
	accountName: string;
	currency: string;
};

export type MonthSnapshot = {
	month: string;
	start: string;
	end: string;
	accounts: Array<{ id: string; name: string; currency: string }>;
	categories: CategoryRecord[];
	transactions: TransactionRecord[];
	summaries: CurrencySummary[];
};

export async function getMonthSnapshot(
	db: BudgetDatabase,
	month: string,
): Promise<MonthSnapshot> {
	const bounds = monthBounds(month);
	const [accountRows, categoryRows, transactionRows] = await Promise.all([
		db
			.select({
				id: accounts.id,
				name: accounts.name,
				currency: accounts.currency,
			})
			.from(accounts)
			.where(eq(accounts.ownerId, LOCAL_OWNER_ID))
			.orderBy(accounts.name),
		db
			.select({
				id: categories.id,
				name: categories.name,
				direction: categories.direction,
			})
			.from(categories)
			.where(eq(categories.ownerId, LOCAL_OWNER_ID))
			.orderBy(categories.name),
		db
			.select({
				id: transactions.id,
				occurredOn: transactions.occurredOn,
				payee: transactions.payee,
				direction: transactions.direction,
				amountMinor: transactions.amountMinor,
				categoryId: transactions.categoryId,
				categoryName: categories.name,
				accountId: transactions.accountId,
				accountName: accounts.name,
				currency: accounts.currency,
			})
			.from(transactions)
			.innerJoin(categories, eq(transactions.categoryId, categories.id))
			.innerJoin(accounts, eq(transactions.accountId, accounts.id))
			.where(
				and(
					eq(transactions.ownerId, LOCAL_OWNER_ID),
					gte(transactions.occurredOn, bounds.start),
					lte(transactions.occurredOn, bounds.end),
				),
			)
			.orderBy(desc(transactions.occurredOn), desc(transactions.createdAt)),
	]);

	const transactionsForMonth: TransactionRecord[] = transactionRows.map(
		(row) => ({
			id: row.id,
			occurredOn: row.occurredOn,
			payee: row.payee,
			direction: row.direction as Direction,
			amountMinor: row.amountMinor,
			categoryId: row.categoryId,
			categoryName: row.categoryName,
			accountId: row.accountId,
			accountName: row.accountName,
			currency: row.currency,
		}),
	);

	const summaries = summarizeByCurrency(
		transactionsForMonth.flatMap((row) => {
			if (!isCurrencyCode(row.currency)) {
				return [];
			}
			return [
				{
					direction: row.direction,
					amountMinor: row.amountMinor,
					currency: row.currency,
					categoryId: row.categoryId,
					categoryName: row.categoryName,
				},
			];
		}),
	);

	const currency =
		accountRows.find((account) => account.id === SEED_ACCOUNT_ID)?.currency ??
		accountRows[0]?.currency ??
		DEFAULT_CURRENCY;
	const withZero =
		summaries.length > 0 || !isCurrencyCode(currency)
			? summaries
			: [
					{
						currency,
						incomeMinor: 0,
						expenseMinor: 0,
						netMinor: 0,
						spendingByCategory: [],
					},
				];

	return {
		month,
		start: bounds.start,
		end: bounds.end,
		accounts: accountRows,
		categories: categoryRows.map((category) => ({
			id: category.id,
			name: category.name,
			direction: category.direction as Direction,
		})),
		transactions: transactionsForMonth,
		summaries: withZero,
	};
}

export async function insertTransaction(
	db: BudgetDatabase,
	input: CreateTransactionInput,
): Promise<{ id: string }> {
	const [account] = await db
		.select()
		.from(accounts)
		.where(
			and(
				eq(accounts.id, input.accountId),
				eq(accounts.ownerId, LOCAL_OWNER_ID),
			),
		)
		.limit(1);
	if (!account || !isCurrencyCode(account.currency)) {
		throw new LedgerError("Choose an account you own.");
	}

	const [category] = await db
		.select()
		.from(categories)
		.where(
			and(
				eq(categories.id, input.categoryId),
				eq(categories.ownerId, LOCAL_OWNER_ID),
			),
		)
		.limit(1);
	if (!category) {
		throw new LedgerError("Choose a category you own.");
	}
	if (category.direction !== input.direction) {
		throw new LedgerError("That category does not match the transaction type.");
	}
	if (!civilDateInMonth(input.occurredOn, input.occurredOn.slice(0, 7))) {
		throw new LedgerError("Choose a real calendar date.");
	}

	let amountMinor: number;
	try {
		amountMinor = parseDecimalToMinor(input.amount, account.currency);
	} catch (error) {
		if (error instanceof MoneyParseError) {
			throw new LedgerError(error.message);
		}
		throw error;
	}
	if (amountMinor === 0) {
		throw new LedgerError("Enter an amount other than zero.");
	}

	const id = crypto.randomUUID();
	await db.insert(transactions).values({
		id,
		ownerId: LOCAL_OWNER_ID,
		accountId: account.id,
		categoryId: category.id,
		direction: input.direction,
		amountMinor,
		occurredOn: input.occurredOn,
		payee: input.payee.trim(),
		createdAt: new Date().toISOString(),
	});
	return { id };
}
