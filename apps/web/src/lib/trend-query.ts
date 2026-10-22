import type { CurrencyCode } from "@budgeting/ledger";
import { queryOptions } from "@tanstack/react-query";
import { getTrend } from "@/server/budget";

export function trendQuery(month: string, currency: CurrencyCode = "MMK") {
	return queryOptions({
		queryKey: ["trend", month, currency],
		queryFn: () => getTrend({ data: { month, currency } }),
	});
}
