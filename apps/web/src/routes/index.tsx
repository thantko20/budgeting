import {
	civilDateInMonth,
	civilDateInTimeZone,
	currentMonth,
	DEFAULT_TIME_ZONE,
	formatMinor,
	formatMonthLabel,
	isCurrencyCode,
	isValidMonth,
	shiftMonth,
} from "@budgeting/ledger";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TransactionForm } from "@/components/transaction-form";
import { monthQuery } from "@/lib/month-query";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => {
		const month = search.month;
		if (typeof month === "string" && isValidMonth(month)) {
			return { month };
		}
		return { month: currentMonth(DEFAULT_TIME_ZONE) };
	},
	loaderDeps: ({ search }) => ({ month: search.month }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(monthQuery(deps.month)),
	component: MonthPage,
});

function MonthPage() {
	const { month } = Route.useSearch();
	const { data, isFetching, isError, error } = useQuery({
		...monthQuery(month),
		placeholderData: keepPreviousData,
	});
	const today = civilDateInTimeZone(new Date(), DEFAULT_TIME_ZONE);

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
						search={{ month: shiftMonth(month, -1) }}
						className="rounded-md border px-3 py-2 text-sm"
					>
						Previous month
					</Link>
					<Link
						to="/"
						search={{ month: shiftMonth(month, 1) }}
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
					<section aria-labelledby="totals-heading" className="grid gap-3">
						<h2 id="totals-heading" className="font-medium text-lg">
							Totals
						</h2>
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
							key={month}
							today={civilDateInMonth(today, month) ? today : data.start}
							accounts={data.accounts}
							categories={data.categories}
						/>
					</section>

					<section
						aria-labelledby="transactions-heading"
						className="grid gap-3"
					>
						<h2 id="transactions-heading" className="font-medium text-lg">
							Transactions
						</h2>
						{data.transactions.length === 0 ? (
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
										{data.transactions.map((transaction) => (
											<tr
												key={transaction.id}
												className="border-b last:border-0"
											>
												<td className="whitespace-nowrap px-3 py-2">
													{transaction.occurredOn}
												</td>
												<td className="px-3 py-2">{transaction.payee}</td>
												<td className="px-3 py-2">
													{transaction.categoryName}
												</td>
												<td className="px-3 py-2 capitalize">
													{transaction.direction}
													{transaction.amountMinor < 0 ? (
														<span className="sr-only"> refund</span>
													) : null}
												</td>
												<td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
													{formatAmount(
														transaction.amountMinor,
														transaction.currency,
													)}
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

function formatAmount(amountMinor: number, currency: string): string {
	if (!isCurrencyCode(currency)) {
		return String(amountMinor);
	}
	return formatMinor(amountMinor, currency);
}
