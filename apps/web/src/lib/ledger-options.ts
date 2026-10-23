import type { AccountType, Direction } from "@budgeting/ledger";

export type AccountOption = {
	id: string;
	name: string;
	type: AccountType;
	currency: string;
	archived: boolean;
};

export type CategoryOption = {
	id: string;
	name: string;
	direction: Direction;
};
