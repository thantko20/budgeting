import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buildActivity } from "@/lib/activity";
import { formatAmount } from "@/lib/format-amount";
import { monthQuery } from "@/lib/month-query";
import { readMonth } from "@/lib/search";

export const Route = createFileRoute("/categories")({
	validateSearch: (search: Record<string, unknown>) => ({
		month: readMonth(search),
	}),
	loaderDeps: ({ search }) => ({ month: search.month }),
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(monthQuery(deps.month)),
	head: () => ({ meta: [{ title: "Categories · Budget" }] }),
	component: CategoriesPage,
});

function CategoriesPage() {
	const { month } = Route.useSearch();
	const { data, isError, error } = useQuery(monthQuery(month));
	const items = data ? buildActivity(data) : [];

	return (
		<main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:px-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
					Categories
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Totals for the month in the top bar. Category names come from the
					starter set.
				</p>
			</div>
			{isError ? <p role="alert">{error.message}</p> : null}
			{data ? (
				<div className="grid gap-6 md:grid-cols-2">
					<CategoryColumn
						title="Income"
						categories={data.categories.filter(
							(category) => category.direction === "income",
						)}
						items={items}
						direction="income"
					/>
					<CategoryColumn
						title="Expenses"
						categories={data.categories.filter(
							(category) => category.direction === "expense",
						)}
						items={items}
						direction="expense"
					/>
				</div>
			) : null}
		</main>
	);
}

function CategoryColumn({
	title,
	categories,
	items,
	direction,
}: {
	title: string;
	categories: Array<{ id: string; name: string }>;
	items: ReturnType<typeof buildActivity>;
	direction: "income" | "expense";
}) {
	return (
		<section aria-labelledby={`${direction}-categories`} className="grid gap-3">
			<h2 id={`${direction}-categories`} className="font-medium text-lg">
				{title}
			</h2>
			<ul className="grid gap-2">
				{categories.map((category) => {
					const totals = new Map<string, number>();
					for (const item of items) {
						if (item.kind !== direction || item.categoryId !== category.id) {
							continue;
						}
						totals.set(
							item.currency,
							(totals.get(item.currency) ?? 0) + item.amountMinor,
						);
					}
					const lines = [...totals.entries()];
					return (
						<li
							key={category.id}
							className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
						>
							<span className="flex items-center gap-2">
								{category.name}
								<Badge tone={direction}>
									{direction === "income" ? "Income" : "Expense"}
								</Badge>
							</span>
							<span className="text-right tabular-nums">
								{lines.length === 0
									? "—"
									: lines
											.map(([currency, total]) => formatAmount(total, currency))
											.join(", ")}
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
