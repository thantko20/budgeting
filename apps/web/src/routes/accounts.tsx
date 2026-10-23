import {
	ACCOUNT_TYPE_LABELS,
	ACCOUNT_TYPES,
	type AccountBalance,
} from "@budgeting/ledger";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountEditor, accountBalanceText } from "@/components/account-forms";
import { AccountIcon } from "@/components/account-icon";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { accountsQuery } from "@/lib/accounts-query";
import { formatAmount } from "@/lib/format-amount";
import { readMonth } from "@/lib/search";

export const Route = createFileRoute("/accounts")({
	validateSearch: (search: Record<string, unknown>) => ({
		month: readMonth(search),
	}),
	loader: ({ context }) => context.queryClient.ensureQueryData(accountsQuery()),
	head: () => ({ meta: [{ title: "Accounts · Budget" }] }),
	component: AccountsPage,
});

function AccountsPage() {
	const { data, isFetching, isError, error } = useQuery(accountsQuery());
	const [editing, setEditing] = useState<AccountBalance | null>(null);
	const active = data?.accounts.filter((account) => !account.archived) ?? [];
	const archived = data?.accounts.filter((account) => account.archived) ?? [];

	return (
		<main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
					Accounts
				</h1>
				<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
					Cash, banks, wallets, and cards. Credit cards are debt and are left
					out of available money. Use Add to create an account.
				</p>
			</div>
			{isFetching ? (
				<p role="status" className="text-muted-foreground text-sm">
					Updating accounts
				</p>
			) : null}
			{isError ? <p role="alert">{error.message}</p> : null}
			{data ? (
				<>
					<section aria-labelledby="net-worth-heading" className="grid gap-3">
						<h2 id="net-worth-heading" className="font-medium text-lg">
							Net worth
						</h2>
						{data.netWorth.length === 0 ? (
							<p className="text-muted-foreground">No balances yet.</p>
						) : (
							<ul className="grid gap-3 md:grid-cols-2">
								{data.netWorth.map((row) => (
									<li
										key={row.currency}
										className="rounded-xl border bg-card p-4 shadow-sm"
									>
										<p className="text-muted-foreground text-sm">
											{row.currency}
										</p>
										<p className="mt-1 font-semibold text-2xl tabular-nums">
											{formatAmount(row.netMinor, row.currency)}
										</p>
										<dl className="mt-3 grid gap-1 text-sm">
											<div className="flex justify-between gap-4">
												<dt>Available</dt>
												<dd className="tabular-nums">
													{formatAmount(row.assetsMinor, row.currency)}
												</dd>
											</div>
											<div className="flex justify-between gap-4">
												<dt>Credit card debt</dt>
												<dd className="text-rose-700 tabular-nums dark:text-rose-400">
													{formatAmount(row.debtMinor, row.currency)}
												</dd>
											</div>
										</dl>
									</li>
								))}
							</ul>
						)}
					</section>
					{ACCOUNT_TYPES.map((type) => {
						const rows = active.filter((account) => account.type === type);
						if (rows.length === 0) {
							return null;
						}
						return (
							<section
								key={type}
								aria-labelledby={`${type}-heading`}
								className="grid gap-3"
							>
								<h2 id={`${type}-heading`} className="font-medium text-lg">
									{ACCOUNT_TYPE_LABELS[type]}
								</h2>
								<ul className="grid gap-3 sm:grid-cols-2">
									{rows.map((account) => (
										<AccountCard
											key={account.id}
											account={account}
											onEdit={() => setEditing(account)}
										/>
									))}
								</ul>
							</section>
						);
					})}
					{archived.length > 0 ? (
						<section aria-labelledby="archived-heading" className="grid gap-3">
							<h2 id="archived-heading" className="font-medium text-lg">
								Archived
							</h2>
							<p className="text-muted-foreground text-sm">
								Archived accounts stay in history and are left out of net worth.
							</p>
							<ul className="grid gap-3 sm:grid-cols-2">
								{archived.map((account) => (
									<AccountCard
										key={account.id}
										account={account}
										onEdit={() => setEditing(account)}
									/>
								))}
							</ul>
						</section>
					) : null}
				</>
			) : null}
			<Dialog
				open={editing !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditing(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit {editing?.name ?? "account"}</DialogTitle>
						<DialogDescription>
							Currency stays the same. Archiving hides the account from new
							transactions.
						</DialogDescription>
					</DialogHeader>
					{editing ? (
						<AccountEditor account={editing} onSaved={() => setEditing(null)} />
					) : null}
				</DialogContent>
			</Dialog>
		</main>
	);
}

function AccountCard({
	account,
	onEdit,
}: {
	account: AccountBalance;
	onEdit: () => void;
}) {
	const owed = account.displayKind === "owed";
	return (
		<li className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
						<AccountIcon type={account.type} />
					</span>
					<div className="min-w-0">
						<h3 className="truncate font-medium">{account.name}</h3>
						<p className="text-muted-foreground text-sm">
							{ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
						</p>
					</div>
				</div>
				<p
					className={`text-right font-semibold tabular-nums ${owed ? "text-rose-700 dark:text-rose-400" : ""}`}
				>
					{accountBalanceText(account)}
				</p>
			</div>
			<button type="button" className="mt-3 text-sm underline" onClick={onEdit}>
				Edit {account.name}
			</button>
		</li>
	);
}
