import { queryOptions } from "@tanstack/react-query";
import { getMonth } from "@/server/budget";

export function monthQuery(month: string, accountId?: string) {
	return queryOptions({
		queryKey: ["month", month, accountId ?? "all"],
		queryFn: () => getMonth({ data: { month, accountId } }),
	});
}
