import {
	civilDateInMonth,
	civilDateInTimeZone,
	currentMonth,
	DEFAULT_TIME_ZONE,
	formatMonthLabel,
	isValidMonth,
	shiftMonth,
} from "@budgeting/ledger";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TransactionForm } from "@/components/transaction-form";
import { TransferForm } from "@/components/transfer-form";
import { formatAmount } from "@/lib/format-amount";
import { monthQuery } from "@/lib/month-query";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => {
		const month =
			typeof search.month === "string" && isValidMonth(search.month)
				? search.month
				: currentMonth(DEFAULT_TIME_ZONE);
		const account =
			typeof search.account === "string" && search.account.trim().length > 0
				? search.account.trim()
				: undefined;
		return { month, account };
	},
	loaderDeps: ({ search }) => ({
		month: search.month,
		account: search.account,
	}),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(monthQuery(deps.month, deps.account)),
	component: MonthPage,
});

function MonthPage() {
	const { month, account } = Route.useSearch();
	const { data, isFetching, isError, error } = useQuery({
		...monthQuery(month, account),
		placeholderData: keepPreviousData,
	});
	const today = civilDateInTimeZone(new Date(), DEFAULT_TIME_ZONE);
	const rows = data ? activityRows(data) : [];

	return (
		<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-sm">Asia/Yangon</p>
					<h1 className="font-semibold text-3xl tracking-tight">
						{formatMonthLabel(month)}
					</h1>
				</div>
				<nav aria-label="Choose month" className="flex gap-2">
					<Link
						to="/"
						search={{ month: shiftMonth(month, -1), account }}
						className="rounded-md border px-3 py-2 text-sm"
					>
						Previous month
					</Link>
					<Link
						to="/"
						search={{ month: shiftMonth(month, 1), account }}
						className="rounded-md border px-3 py-2 text-sm"
					>
						Next month
					</Link>
				</nav>
			</div>

			{isFetching ? (
				<p role="status" className="text-muted-foreground text-sm">
					Updating {formatMonthLabel(month)}
				</p>
			) : null}

			{isError ? <p role="alert">{error.message}</p> : null}

			{data ? (
				<>
					<nav aria-label="Filter by account" className="flex flex-wrap gap-2">
						<AccountFilter
							month={month}
							label="All accounts"
							current={account}
						/>
						{data.accounts.map((item) => (
							<AccountFilter
								key={item.id}
								month={month}
								accountId={item.id}
								label={item.archived ? `${item.name} (archived)` : item.name}
								current={account}
							/>
						))}
					</nav>

					<section aria-labelledby="totals-heading" className="grid gap-3">
						<h2 id="totals-heading" className="font-medium text-lg">
							Totals
						</h2>
						{data.transfers.length > 0 ? (
							<p className="text-muted-foreground text-sm">
								Transfers between accounts are not included in these totals.
							</p>
						) : null}
						<div className="grid gap-3 sm:grid-cols-3">
							{data.summaries.map((summary) => (
								<div key={summary.currency} className="contents">
									<Total
										label="Income"
										value={formatAmount(summary.incomeMinor, summary.currency)}
									/>
									<Total
										label="Expenses"
										value={formatAmount(summary.expenseMinor, summary.currency)}
									/>
									<Total
										label="Net"
										value={formatAmount(summary.netMinor, summary.currency)}
									/>
								</div>
							))}
						</div>
					</section>

					<section aria-labelledby="spending-heading" className="grid gap-3">
						<h2 id="spending-heading" className="font-medium text-lg">
							Spending by category
						</h2>
						{data.summaries.every(
							(summary) => summary.spendingByCategory.length === 0,
						) ? (
							<p className="text-muted-foreground">No spending this month.</p>
						) : (
							<ul className="divide-y rounded-lg border">
								{data.summaries.flatMap((summary) =>
									summary.spendingByCategory.map((category) => (
										<li
											key={`${summary.currency}-${category.categoryId}`}
											className="flex items-center justify-between gap-4 px-4 py-3"
										>
											<span>{category.name}</span>
											<span className="tabular-nums">
												{formatAmount(category.totalMinor, summary.currency)}
											</span>
										</li>
									)),
								)}
							</ul>
						)}
					</section>

					<section aria-labelledby="add-heading" className="grid gap-3">
						<h2 id="add-heading" className="font-medium text-lg">
							Add a transaction
						</h2>
						<TransactionForm
							key={`${month}-${account ?? "all"}`}
							today={civilDateInMonth(today, month) ? today : data.start}
							accounts={data.accounts}
							categories={data.categories}
							accountId={account}
						/>
					</section>

					<section aria-labelledby="transfer-heading" className="grid gap-3">
						<h2 id="transfer-heading" className="font-medium text-lg">
							Add a transfer
						</h2>
						<TransferForm
							key={`transfer-${month}`}
							today={civilDateInMonth(today, month) ? today : data.start}
							accounts={data.accounts}
						/>
					</section>

					<section
						aria-labelledby="transactions-heading"
						className="grid gap-3"
					>
						<h2 id="transactions-heading" className="font-medium text-lg">
							Transactions
						</h2>
						{rows.length === 0 ? (
							<p className="text-muted-foreground">
								No transactions this month.
							</p>
						) : (
							<div className="overflow-x-auto rounded-lg border">
								<table className="w-full text-sm">
									<caption className="sr-only">
										Transactions in {formatMonthLabel(month)}
									</caption>
									<thead className="border-b text-left">
										<tr>
											<th scope="col" className="px-3 py-2 font-medium">
												Date
											</th>
											<th scope="col" className="px-3 py-2 font-medium">
												Payee
											</th>
											<th scope="col" className="px-3 py-2 font-medium">
												Account
											</th>
											<th scope="col" className="px-3 py-2 font-medium">
												Category
											</th>
											<th scope="col" className="px-3 py-2 font-medium">
												Type
											</th>
											<th
												scope="col"
												className="px-3 py-2 text-right font-medium"
											>
												Amount
											</th>
										</tr>
									</thead>
									<tbody>
										{rows.map((row) => (
											<tr key={row.id} className="border-b last:border-0">
												<td className="whitespace-nowrap px-3 py-2">
													{row.occurredOn}
												</td>
												<td className="px-3 py-2">{row.title}</td>
												<td className="px-3 py-2">{row.account}</td>
												<td className="px-3 py-2">{row.category}</td>
												<td className="px-3 py-2">
													{row.kind}
													{row.refund ? (
														<span className="sr-only"> refund</span>
													) : null}
												</td>
												<td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
													{formatAmount(row.amountMinor, row.currency)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</section>
				</>
			) : null}
		</main>
	);
}

function Total({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border p-4">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p>
		</div>
	);
}

function AccountFilter({
	month,
	accountId,
	label,
	current,
}: {
	month: string;
	accountId?: string;
	label: string;
	current?: string;
}) {
	const selected = (current ?? undefined) === accountId;
	return (
		<Link
			to="/"
			search={{ month, account: accountId }}
			aria-current={selected ? "page" : undefined}
			className={`rounded-md border px-3 py-1.5 text-sm ${selected ? "font-semibold" : ""}`}
		>
			{label}
		</Link>
	);
}

function activityRows(data: {
	transactions: Array<{
		id: string;
		occurredOn: string;
		createdAt: string;
		payee: string;
		direction: string;
		amountMinor: number;
		categoryName: string;
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
		fromAccountName: string;
		toAccountName: string;
	}>;
}) {
	return [
		...data.transactions.map((transaction) => ({
			id: transaction.id,
			occurredOn: transaction.occurredOn,
			createdAt: transaction.createdAt,
			title: transaction.payee,
			account: transaction.accountName,
			category: transaction.categoryName,
			kind: transaction.direction === "income" ? "Income" : "Expense",
			amountMinor: transaction.amountMinor,
			currency: transaction.currency,
			refund: transaction.amountMinor < 0,
		})),
		...data.transfers.map((transfer) => ({
			id: transfer.id,
			occurredOn: transfer.occurredOn,
			createdAt: transfer.createdAt,
			title: transfer.memo,
			account: `${transfer.fromAccountName} to ${transfer.toAccountName}`,
			category: "Transfer",
			kind: "Transfer",
			amountMinor: transfer.amountMinor,
			currency: transfer.currency,
			refund: false,
		})),
	].sort(
		(left, right) =>
			right.occurredOn.localeCompare(left.occurredOn) ||
			right.createdAt.localeCompare(left.createdAt),
	);
}
