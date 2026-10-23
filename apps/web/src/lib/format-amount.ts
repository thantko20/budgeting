import { formatMinor, isCurrencyCode } from "@budgeting/ledger";

export function formatAmount(amountMinor: number, currency: string): string {
	if (!isCurrencyCode(currency)) {
		return String(amountMinor);
	}
	return formatMinor(amountMinor, currency);
}
