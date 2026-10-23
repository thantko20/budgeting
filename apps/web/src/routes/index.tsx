import {
	ACCOUNT_TYPE_LABELS,
	DEFAULT_CURRENCY,
	formatMonthLabel,
	isCurrencyCode,
} from "@budgeting/ledger";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountIcon } from "@/components/account-icon";
import { ActivityList } from "@/components/activity-list";
import { SpendingChart, TrendChart } from "@/components/charts";
import { accountsQuery } from "@/lib/accounts-query";
import { buildActivity } from "@/lib/activity";
import { formatAmount } from "@/lib/format-amount";
import { monthQuery } from "@/lib/month-query";
import { readMonth } from "@/lib/search";
import { trendQuery } from "@/lib/trend-query";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => ({
		month: readMonth(search),
	}),
	loaderDeps: ({ search }) => ({ month: search.month }),
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(monthQuery(deps.month)),
			context.queryClient.ensureQueryData(accountsQuery()),
			context.queryClient.ensureQueryData(trendQuery(deps.month)),
		]),
	head: () => ({ meta: [{ title: "Overview · Budget" }] }),
	component: OverviewPage,
});

function OverviewPage() {
	const { month } = Route.useSearch();
	const monthState = useQuery({
		...monthQuery(month),
		placeholderData: keepPreviousData,
	});
	const accountsState = useQuery(accountsQuery());
	const currency = pickCurrency(monthState.data?.summaries);
	const trendState = useQuery(trendQuery(month, currency));
	const summary = monthState.data?.summaries.find(
		(item) => item.currency === currency,
	);
	const worth = accountsState.data?.netWorth.find(
		(item) => item.currency === currency,
	);
	const recent = monthState.data
		? buildActivity(monthState.data).slice(0, 6)
		: [];
	const activeAccounts =
		accountsState.data?.accounts.filter(
			(account) => !account.archived && account.currency === currency,
		) ?? [];

	return (
		<main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-sm">
						Asia/Yangon · {currency}
					</p>
					<h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
						Overview
					</h1>
				</div>
				{monthState.isFetching || accountsState.isFetching ? (
					<p role="status" className="text-muted-foreground text-sm">
						Updating {formatMonthLabel(month)}
					</p>
				) : null}
			</div>

			{monthState.isError ? (
				<p role="alert">{monthState.error.message}</p>
			) : null}

			<section
				aria-label="Summary"
				className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
			>
				<Stat
					label="Income"
					value={formatAmount(summary?.incomeMinor ?? 0, currency)}
					hint={formatMonthLabel(month)}
					tone="income"
				/>
				<Stat
					label="Expenses"
					value={formatAmount(summary?.expenseMinor ?? 0, currency)}
					hint={formatMonthLabel(month)}
					tone="expense"
				/>
				<Stat
					label="Net"
					value={formatAmount(summary?.netMinor ?? 0, currency)}
					hint="Income minus expenses"
				/>
				<Stat
					label="Net worth"
					value={formatAmount(worth?.netMinor ?? 0, currency)}
					hint="Available minus card debt"
				/>
				<Stat
					label="Card debt"
					value={formatAmount(worth?.debtMinor ?? 0, currency)}
					hint="Not counted as available"
					tone="expense"
				/>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<article className="rounded-xl border bg-card p-4 shadow-sm">
					<h2 className="font-medium">Spending by category</h2>
					<div className="mt-4">
						<SpendingChart
							currency={currency}
							categories={summary?.spendingByCategory ?? []}
						/>
					</div>
				</article>
				<article className="rounded-xl border bg-card p-4 shadow-sm">
					<h2 className="font-medium">Income and expenses</h2>
					<p className="text-muted-foreground text-sm">
						Last six months. Transfers are excluded.
					</p>
					<div className="mt-4">
						<TrendChart currency={currency} points={trendState.data ?? []} />
					</div>
				</article>
			</section>

			<section className="grid gap-4 lg:grid-cols-5">
				<article className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
					<div className="flex items-center justify-between gap-2">
						<h2 className="font-medium">Accounts</h2>
						<Link
							to="/accounts"
							search={{ month }}
							className="text-sm underline"
						>
							View all
						</Link>
					</div>
					{activeAccounts.length === 0 ? (
						<p className="mt-4 text-muted-foreground text-sm">
							No accounts yet.
						</p>
					) : (
						<ul className="mt-3 divide-y">
							{activeAccounts.map((account) => (
								<li
									key={account.id}
									className="flex items-center justify-between gap-3 py-3"
								>
									<span className="flex min-w-0 items-center gap-3">
										<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
											<AccountIcon type={account.type} />
										</span>
										<span className="min-w-0">
											<span className="block truncate font-medium">
												{account.name}
											</span>
											<span className="block text-muted-foreground text-xs">
												{ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
											</span>
										</span>
									</span>
									<span
										className={`shrink-0 tabular-nums ${account.displayKind === "owed" ? "text-rose-700 dark:text-rose-400" : ""}`}
									>
										{account.displayKind === "owed"
											? `Owed ${formatAmount(account.displayMinor, account.currency)}`
											: account.displayKind === "credit"
												? `Credit ${formatAmount(account.displayMinor, account.currency)}`
												: formatAmount(account.displayMinor, account.currency)}
									</span>
								</li>
							))}
						</ul>
					)}
				</article>
				<article className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-3">
					<div className="mb-4 flex items-center justify-between gap-2">
						<h2 className="font-medium">Recent activity</h2>
						<Link
							to="/transactions"
							search={{
								month,
								account: undefined,
								category: undefined,
								type: "all",
							}}
							className="text-sm underline"
						>
							View month
						</Link>
					</div>
					<ActivityList
						items={recent}
						empty={`No transactions in ${formatMonthLabel(month)}.`}
					/>
				</article>
			</section>
		</main>
	);
}

function Stat({
	label,
	value,
	hint,
	tone = "neutral",
}: {
	label: string;
	value: string;
	hint: string;
	tone?: "income" | "expense" | "neutral";
}) {
	return (
		<article className="rounded-xl border bg-card p-4 shadow-sm">
			<h2 className="text-muted-foreground text-sm">{label}</h2>
			<p
				className={`mt-2 font-semibold text-2xl tabular-nums tracking-tight ${tone === "income" ? "text-emerald-700 dark:text-emerald-400" : ""} ${tone === "expense" ? "text-rose-700 dark:text-rose-400" : ""}`}
			>
				{value}
			</p>
			<p className="mt-1 text-muted-foreground text-xs">{hint}</p>
		</article>
	);
}

function pickCurrency(
	summaries: Array<{ currency: string }> | undefined,
): typeof DEFAULT_CURRENCY {
	const found = summaries?.find((item) => item.currency === DEFAULT_CURRENCY);
	const currency =
		found?.currency ?? summaries?.[0]?.currency ?? DEFAULT_CURRENCY;
	return isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;
}
