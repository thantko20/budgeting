import { formatMonthLabel } from "@budgeting/ledger";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ActivityList } from "@/components/activity-list";
import { Label } from "@/components/ui/label";
import { type ActivityItem, buildActivity } from "@/lib/activity";
import { monthQuery } from "@/lib/month-query";
import { readMonth, readOptionalId } from "@/lib/search";

const TYPES = ["all", "income", "expense", "transfer"] as const;

export const Route = createFileRoute("/transactions")({
	validateSearch: (search: Record<string, unknown>) => {
		const type = TYPES.find((item) => item === search.type) ?? "all";
		return {
			month: readMonth(search),
			account: readOptionalId(search.account),
			category: readOptionalId(search.category),
			type,
		};
	},
	loaderDeps: ({ search }) => ({ month: search.month }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(monthQuery(deps.month)),
	head: () => ({ meta: [{ title: "Transactions · Budget" }] }),
	component: TransactionsPage,
});

function TransactionsPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/transactions" });
	const { data, isFetching, isError, error } = useQuery({
		...monthQuery(search.month),
		placeholderData: keepPreviousData,
	});
	const items = data ? filterActivity(buildActivity(data), search) : [];

	return (
		<main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:px-6">
			<div>
				<p className="text-muted-foreground text-sm">
					{formatMonthLabel(search.month)}
				</p>
				<h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
					Transactions
				</h1>
			</div>
			{isFetching ? (
				<p role="status" className="text-muted-foreground text-sm">
					Updating {formatMonthLabel(search.month)}
				</p>
			) : null}
			{isError ? <p role="alert">{error.message}</p> : null}
			{data ? (
				<>
					<form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
						<div className="grid gap-1.5">
							<Label htmlFor="filter-account">Account</Label>
							<select
								id="filter-account"
								className="h-9 rounded-md border bg-transparent px-3 text-sm"
								value={search.account ?? ""}
								onChange={(event) => {
									const account = event.target.value || undefined;
									void navigate({
										search: (previous) => ({ ...previous, account }),
									});
								}}
							>
								<option value="">All accounts</option>
								{data.accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
										{account.archived ? " (archived)" : ""}
									</option>
								))}
							</select>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="filter-category">Category</Label>
							<select
								id="filter-category"
								className="h-9 rounded-md border bg-transparent px-3 text-sm"
								value={search.category ?? ""}
								onChange={(event) => {
									const category = event.target.value || undefined;
									void navigate({
										search: (previous) => ({ ...previous, category }),
									});
								}}
							>
								<option value="">All categories</option>
								{data.categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="filter-type">Type</Label>
							<select
								id="filter-type"
								className="h-9 rounded-md border bg-transparent px-3 text-sm"
								value={search.type}
								onChange={(event) => {
									const type = event.target.value as (typeof TYPES)[number];
									void navigate({
										search: (previous) => ({ ...previous, type }),
									});
								}}
							>
								<option value="all">All types</option>
								<option value="income">Income</option>
								<option value="expense">Expense</option>
								<option value="transfer">Transfer</option>
							</select>
						</div>
					</form>
					{data.transfers.length > 0 && search.type !== "transfer" ? (
						<p className="text-muted-foreground text-sm">
							Transfers stay out of income and expense totals.
						</p>
					) : null}
					<ActivityList
						items={items}
						empty={
							search.account || search.category || search.type !== "all"
								? "Nothing matches these filters."
								: `No transactions in ${formatMonthLabel(search.month)}.`
						}
					/>
				</>
			) : null}
		</main>
	);
}

function filterActivity(
	items: ActivityItem[],
	search: { account?: string; category?: string; type: (typeof TYPES)[number] },
): ActivityItem[] {
	return items.filter((item) => {
		if (
			search.account &&
			item.accountId !== search.account &&
			item.otherAccountId !== search.account
		) {
			return false;
		}
		if (search.category && item.categoryId !== search.category) {
			return false;
		}
		if (search.type !== "all" && item.kind !== search.type) {
			return false;
		}
		return true;
	});
}
