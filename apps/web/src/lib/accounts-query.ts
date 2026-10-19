import { queryOptions } from "@tanstack/react-query";
import { getAccounts } from "@/server/budget";

export function accountsQuery() {
	return queryOptions({
		queryKey: ["accounts"],
		queryFn: () => getAccounts(),
	});
}
