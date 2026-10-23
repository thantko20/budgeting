import { Badge } from "@/components/ui/badge";
import {
	type ActivityItem,
	amountToneClass,
	formatCivilDate,
	presentAmount,
} from "@/lib/activity";

export function ActivityList({
	items,
	empty,
}: {
	items: ActivityItem[];
	empty: string;
}) {
	if (items.length === 0) {
		return <p className="text-muted-foreground text-sm">{empty}</p>;
	}

	const groups = new Map<string, ActivityItem[]>();
	for (const item of items) {
		const group = groups.get(item.occurredOn) ?? [];
		group.push(item);
		groups.set(item.occurredOn, group);
	}

	return (
		<div className="grid gap-5">
			{[...groups.entries()].map(([date, rows]) => (
				<section
					key={date}
					aria-label={formatCivilDate(date)}
					className="grid gap-2"
				>
					<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
						{formatCivilDate(date)}
					</h3>
					<ul className="divide-y rounded-xl border bg-card">
						{rows.map((item) => {
							const amount = presentAmount(
								item.kind,
								item.amountMinor,
								item.currency,
							);
							return (
								<li
									key={item.id}
									className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_auto]"
								>
									<div className="min-w-0">
										<p className="truncate font-medium">{item.title}</p>
										<p className="truncate text-muted-foreground text-sm">
											{item.account}
										</p>
									</div>
									<div className="hidden gap-1.5 sm:flex">
										<Badge
											tone={
												item.kind === "transfer"
													? "transfer"
													: item.kind === "income"
														? "income"
														: "expense"
											}
										>
											{item.kind === "income"
												? "Income"
												: item.kind === "expense"
													? "Expense"
													: "Transfer"}
										</Badge>
										<Badge>{item.category}</Badge>
									</div>
									<p
										className={`text-right font-medium tabular-nums ${amountToneClass(amount.tone)}`}
									>
										{amount.text}
										{item.kind === "expense" && item.amountMinor < 0 ? (
											<span className="sr-only"> refund</span>
										) : null}
									</p>
								</li>
							);
						})}
					</ul>
				</section>
			))}
		</div>
	);
}
