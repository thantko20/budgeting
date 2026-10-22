import type { AccountType } from "@budgeting/ledger";
import {
	BanknoteIcon,
	CreditCardIcon,
	LandmarkIcon,
	ShapesIcon,
	WalletIcon,
} from "lucide-react";

const ICONS = {
	cash: BanknoteIcon,
	bank: LandmarkIcon,
	digital_wallet: WalletIcon,
	credit_card: CreditCardIcon,
	other: ShapesIcon,
} as const;

export function AccountIcon({
	type,
	className = "size-5",
}: {
	type: AccountType;
	className?: string;
}) {
	const Icon = ICONS[type];
	return <Icon className={className} aria-hidden="true" />;
}
