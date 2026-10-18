import { queryOptions } from "@tanstack/react-query";
import { getMonth } from "@/server/budget";

export function monthQuery(month: string) {
	return queryOptions({
		queryKey: ["month", month],
		queryFn: () => getMonth({ data: { month } }),
	});
}
