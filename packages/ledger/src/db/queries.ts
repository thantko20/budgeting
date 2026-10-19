import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import {
	type AccountBalance,
	type BalanceAccount,
	balancesForAccounts,
	type CurrencyNetWorth,
	netWorthByCurrency,
} from "../accounts";
import { civilDateInMonth, monthBounds } from "../dates";
import { LOCAL_OWNER_ID, SEED_ACCOUNT_ID } from "../ids";
import {
	type CurrencyCode,
	DEFAULT_CURRENCY,
	isCurrencyCode,
	MoneyParseError,
	parseDecimalToMinor,
} from "../money";
import type {
	AccountType,
	CreateAccountInput,
	CreateTransactionInput,
	CreateTransferInput,
	Direction,
	SetAccountArchivedInput,
	UpdateAccountInput,
} from "../schema";
import { isAccountType } from "../schema";
import { type CurrencySummary, summarizeByCurrency } from "../summary";
import { accounts, categories, transactions, transfers } from "./schema";
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

export type AccountRecord = {
	id: string;
	name: string;
	type: AccountType;
	currency: string;
	archived: boolean;
};

export type TransactionRecord = {
	id: string;
	occurredOn: string;
	createdAt: string;
	payee: string;
	direction: Direction;
	amountMinor: number;
	categoryId: string;
	categoryName: string;
	accountId: string;
	accountName: string;
	currency: string;
};

export type TransferRecord = {
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
};

export type MonthSnapshot = {
	month: string;
	start: string;
	end: string;
	accountId?: string;
	accounts: AccountRecord[];
	categories: CategoryRecord[];
	transactions: TransactionRecord[];
	transfers: TransferRecord[];
	summaries: CurrencySummary[];
};

export type AccountsSnapshot = {
	accounts: AccountBalance[];
	netWorth: CurrencyNetWorth[];
};

export async function getMonthSnapshot(
	db: BudgetDatabase,
	month: string,
	accountId?: string,
): Promise<MonthSnapshot> {
	const bounds = monthBounds(month);
	const accountRows = await loadAccounts(db);
	const categoryRows = await db
		.select({
			id: categories.id,
			name: categories.name,
			direction: categories.direction,
		})
		.from(categories)
		.where(eq(categories.ownerId, LOCAL_OWNER_ID))
		.orderBy(categories.name);

	const knownAccount = accountId
		? accountRows.find((account) => account.id === accountId)
		: undefined;
	const transactionFilters = [
		eq(transactions.ownerId, LOCAL_OWNER_ID),
		gte(transactions.occurredOn, bounds.start),
		lte(transactions.occurredOn, bounds.end),
	];
	if (accountId) {
		transactionFilters.push(eq(transactions.accountId, accountId));
	}

	const transferFilters = [
		eq(transfers.ownerId, LOCAL_OWNER_ID),
		gte(transfers.occurredOn, bounds.start),
		lte(transfers.occurredOn, bounds.end),
	];
	const transferWhere = accountId
		? and(
				...transferFilters,
				or(
					eq(transfers.fromAccountId, accountId),
					eq(transfers.toAccountId, accountId),
				),
			)
		: and(...transferFilters);

	const [transactionRows, transferRows] = await Promise.all([
		db
			.select({
				id: transactions.id,
				occurredOn: transactions.occurredOn,
				createdAt: transactions.createdAt,
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
			.where(and(...transactionFilters))
			.orderBy(desc(transactions.occurredOn), desc(transactions.createdAt)),
		db
			.select()
			.from(transfers)
			.where(transferWhere)
			.orderBy(desc(transfers.occurredOn), desc(transfers.createdAt)),
	]);

	const transactionsForMonth: TransactionRecord[] = transactionRows.map(
		(row) => ({
			id: row.id,
			occurredOn: row.occurredOn,
			createdAt: row.createdAt,
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

	const accountById = new Map(
		accountRows.map((account) => [account.id, account]),
	);
	const transfersForMonth: TransferRecord[] = transferRows.flatMap((row) => {
		const fromAccount = accountById.get(row.fromAccountId);
		const toAccount = accountById.get(row.toAccountId);
		if (!fromAccount || !toAccount) {
			return [];
		}
		return [
			{
				id: row.id,
				occurredOn: row.occurredOn,
				createdAt: row.createdAt,
				memo: row.memo,
				amountMinor: row.amountMinor,
				currency: fromAccount.currency,
				fromAccountId: fromAccount.id,
				fromAccountName: fromAccount.name,
				toAccountId: toAccount.id,
				toAccountName: toAccount.name,
			},
		];
	});

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
		knownAccount?.currency ??
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
		accountId: knownAccount?.id,
		accounts: accountRows.map(toAccountRecord),
		categories: categoryRows.map((category) => ({
			id: category.id,
			name: category.name,
			direction: category.direction as Direction,
		})),
		transactions: transactionsForMonth,
		transfers: transfersForMonth,
		summaries: withZero,
	};
}

export async function getAccountSnapshot(
	db: BudgetDatabase,
): Promise<AccountsSnapshot> {
	const accountRows = await loadAccounts(db);
	const [transactionRows, transferRows] = await Promise.all([
		db
			.select({
				accountId: transactions.accountId,
				direction: transactions.direction,
				amountMinor: transactions.amountMinor,
			})
			.from(transactions)
			.where(eq(transactions.ownerId, LOCAL_OWNER_ID)),
		db
			.select({
				fromAccountId: transfers.fromAccountId,
				toAccountId: transfers.toAccountId,
				amountMinor: transfers.amountMinor,
			})
			.from(transfers)
			.where(eq(transfers.ownerId, LOCAL_OWNER_ID)),
	]);

	const balanceAccounts: BalanceAccount[] = accountRows.flatMap((account) => {
		if (!isCurrencyCode(account.currency) || !isAccountType(account.type)) {
			return [];
		}
		return [
			{
				id: account.id,
				name: account.name,
				type: account.type,
				currency: account.currency,
				openingBalanceMinor: account.openingBalanceMinor,
				archived: account.archived,
			},
		];
	});

	const withBalances = balancesForAccounts(
		balanceAccounts,
		transactionRows.map((row) => ({
			accountId: row.accountId,
			direction: row.direction as Direction,
			amountMinor: row.amountMinor,
		})),
		transferRows,
	);

	return {
		accounts: withBalances,
		netWorth: netWorthByCurrency(withBalances),
	};
}

export async function insertAccount(
	db: BudgetDatabase,
	input: CreateAccountInput,
): Promise<{ id: string }> {
	const openingBalanceMinor = parseOpening(
		input.openingBalance,
		input.currency,
	);
	const id = crypto.randomUUID();
	await db.insert(accounts).values({
		id,
		ownerId: LOCAL_OWNER_ID,
		name: input.name.trim(),
		type: input.type,
		currency: input.currency,
		openingBalanceMinor,
		archived: false,
		createdAt: new Date().toISOString(),
	});
	return { id };
}

export async function updateAccount(
	db: BudgetDatabase,
	input: UpdateAccountInput,
): Promise<void> {
	const account = await ownedAccount(db, input.id);
	const openingBalanceMinor = parseOpening(
		input.openingBalance,
		account.currency,
	);
	await db
		.update(accounts)
		.set({
			name: input.name.trim(),
			type: input.type,
			openingBalanceMinor,
		})
		.where(
			and(eq(accounts.id, account.id), eq(accounts.ownerId, LOCAL_OWNER_ID)),
		);
}

export async function setAccountArchived(
	db: BudgetDatabase,
	input: SetAccountArchivedInput,
): Promise<void> {
	const account = await ownedAccount(db, input.id);
	await db
		.update(accounts)
		.set({ archived: input.archived })
		.where(
			and(eq(accounts.id, account.id), eq(accounts.ownerId, LOCAL_OWNER_ID)),
		);
}

export async function insertTransaction(
	db: BudgetDatabase,
	input: CreateTransactionInput,
): Promise<{ id: string }> {
	const account = await ownedAccount(db, input.accountId);
	if (account.archived) {
		throw new LedgerError(
			"That account is archived. Restore it before adding a transaction.",
		);
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

	const amountMinor = parseAmount(input.amount, account.currency);
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

export async function insertTransfer(
	db: BudgetDatabase,
	input: CreateTransferInput,
): Promise<{ id: string }> {
	if (input.fromAccountId === input.toAccountId) {
		throw new LedgerError("Choose two different accounts.");
	}
	const fromAccount = await ownedAccount(db, input.fromAccountId);
	const toAccount = await ownedAccount(db, input.toAccountId);
	if (fromAccount.archived || toAccount.archived) {
		throw new LedgerError(
			"That account is archived. Restore it before transferring.",
		);
	}
	if (fromAccount.currency !== toAccount.currency) {
		throw new LedgerError(
			`Transfers stay in one currency. ${fromAccount.name} is ${fromAccount.currency} and ${toAccount.name} is ${toAccount.currency}.`,
		);
	}
	if (!civilDateInMonth(input.occurredOn, input.occurredOn.slice(0, 7))) {
		throw new LedgerError("Choose a real calendar date.");
	}

	const amountMinor = parseAmount(input.amount, fromAccount.currency);
	if (amountMinor <= 0) {
		throw new LedgerError(
			"Enter a positive amount. To move money the other way, swap the accounts.",
		);
	}

	const id = crypto.randomUUID();
	await db.insert(transfers).values({
		id,
		ownerId: LOCAL_OWNER_ID,
		fromAccountId: fromAccount.id,
		toAccountId: toAccount.id,
		amountMinor,
		occurredOn: input.occurredOn,
		memo: input.memo.trim(),
		createdAt: new Date().toISOString(),
	});
	return { id };
}

async function loadAccounts(db: BudgetDatabase) {
	return db
		.select()
		.from(accounts)
		.where(eq(accounts.ownerId, LOCAL_OWNER_ID))
		.orderBy(accounts.name);
}

async function ownedAccount(db: BudgetDatabase, accountId: string) {
	const [account] = await db
		.select()
		.from(accounts)
		.where(
			and(eq(accounts.id, accountId), eq(accounts.ownerId, LOCAL_OWNER_ID)),
		)
		.limit(1);
	if (
		!account ||
		!isCurrencyCode(account.currency) ||
		!isAccountType(account.type)
	) {
		throw new LedgerError("Choose an account you own.");
	}
	return {
		...account,
		currency: account.currency as CurrencyCode,
		type: account.type as AccountType,
	};
}

function toAccountRecord(account: {
	id: string;
	name: string;
	type: string;
	currency: string;
	archived: boolean;
}): AccountRecord {
	return {
		id: account.id,
		name: account.name,
		type: isAccountType(account.type) ? account.type : "other",
		currency: account.currency,
		archived: account.archived,
	};
}

function parseOpening(input: string, currency: CurrencyCode): number {
	if (input.trim() === "") {
		return 0;
	}
	return parseAmount(input, currency);
}

function parseAmount(input: string, currency: CurrencyCode): number {
	try {
		return parseDecimalToMinor(input, currency);
	} catch (error) {
		if (error instanceof MoneyParseError) {
			throw new LedgerError(error.message);
		}
		throw error;
	}
}
