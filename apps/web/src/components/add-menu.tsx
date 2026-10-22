import {
	civilDateInMonth,
	civilDateInTimeZone,
	DEFAULT_TIME_ZONE,
} from "@budgeting/ledger";
import {
	ArrowLeftRightIcon,
	PlusIcon,
	ReceiptIcon,
	WalletIcon,
} from "lucide-react";
import { useState } from "react";
import { CreateAccountForm } from "@/components/account-forms";
import { TransactionForm } from "@/components/transaction-form";
import { TransferForm } from "@/components/transfer-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AccountOption, CategoryOption } from "@/lib/ledger-options";

type DialogKind = "transaction" | "transfer" | "account";

export function AddMenu({
	month,
	accounts,
	categories,
}: {
	month: string;
	accounts: AccountOption[];
	categories: CategoryOption[];
}) {
	const [open, setOpen] = useState<DialogKind | null>(null);
	const today = civilDateInTimeZone(new Date(), DEFAULT_TIME_ZONE);
	const date = civilDateInMonth(today, month) ? today : `${month}-01`;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button">
						<PlusIcon />
						Add
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={() => setOpen("transaction")}>
						<ReceiptIcon />
						Transaction
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setOpen("transfer")}>
						<ArrowLeftRightIcon />
						Transfer
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setOpen("account")}>
						<WalletIcon />
						Account
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={open === "transaction"}
				onOpenChange={(next) => setOpen(next ? "transaction" : null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add a transaction</DialogTitle>
						<DialogDescription>
							Income and expenses for this month. Refunds use a negative amount.
						</DialogDescription>
					</DialogHeader>
					<TransactionForm
						key={`txn-${month}`}
						today={date}
						accounts={accounts}
						categories={categories}
						onSaved={() => setOpen(null)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				open={open === "transfer"}
				onOpenChange={(next) => setOpen(next ? "transfer" : null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add a transfer</DialogTitle>
						<DialogDescription>
							Move money between accounts in the same currency. Transfers are
							not income or expenses.
						</DialogDescription>
					</DialogHeader>
					<TransferForm
						key={`transfer-${month}`}
						today={date}
						accounts={accounts}
						onSaved={() => setOpen(null)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				open={open === "account"}
				onOpenChange={(next) => setOpen(next ? "account" : null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add an account</DialogTitle>
						<DialogDescription>
							Cash, a bank, a wallet such as KBZPay, or a credit card.
						</DialogDescription>
					</DialogHeader>
					<CreateAccountForm onSaved={() => setOpen(null)} />
				</DialogContent>
			</Dialog>
		</>
	);
}
