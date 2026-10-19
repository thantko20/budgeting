import {
	ACCOUNT_TYPE_LABELS,
	ACCOUNT_TYPES,
	type AccountBalance,
} from "@budgeting/ledger";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AccountEditor,
	accountBalanceText,
	CreateAccountForm,
} from "@/components/account-forms";
import { accountsQuery } from "@/lib/accounts-query";
import { formatAmount } from "@/lib/format-amount";

export const Route = createFileRoute("/accounts")({
	loader: ({ context }) => context.queryClient.ensureQueryData(accountsQuery()),
	component: AccountsPage,
});

function AccountsPage() {
	const { data, isFetching, isError, error } = useQuery(accountsQuery());
	const active = data?.accounts.filter((account) => !account.archived) ?? [];
	const archived = data?.accounts.filter((account) => account.archived) ?? [];

	return (
		<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6">
			<div>
				<h1 className="font-semibold text-3xl tracking-tight">Accounts</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Cash, banks, wallets, and cards. Credit cards are debt and are left
					out of available money.
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
							<ul className="grid gap-3 sm:grid-cols-2">
								{data.netWorth.map((row) => (
									<li key={row.currency} className="rounded-lg border p-4">
										<p className="text-muted-foreground text-sm">
											{row.currency}
										</p>
										<dl className="mt-3 grid gap-2 text-sm">
											<div className="flex justify-between gap-4">
												<dt>Available</dt>
												<dd className="tabular-nums">
													{formatAmount(row.assetsMinor, row.currency)}
												</dd>
											</div>
											<div className="flex justify-between gap-4">
												<dt>Credit card debt</dt>
												<dd className="tabular-nums">
													{formatAmount(row.debtMinor, row.currency)}
												</dd>
											</div>
											<div className="flex justify-between gap-4 font-semibold">
												<dt>Net worth</dt>
												<dd className="tabular-nums">
													{formatAmount(row.netMinor, row.currency)}
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
								<ul className="grid gap-3">
									{rows.map((account) => (
										<AccountRow key={account.id} account={account} />
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
								They cannot be used for new transactions or transfers.
							</p>
							<ul className="grid gap-3">
								{archived.map((account) => (
									<AccountRow key={account.id} account={account} />
								))}
							</ul>
						</section>
					) : null}

					<section aria-labelledby="add-account-heading" className="grid gap-3">
						<h2 id="add-account-heading" className="font-medium text-lg">
							Add an account
						</h2>
						<CreateAccountForm />
					</section>
				</>
			) : null}
		</main>
	);
}

function AccountRow({ account }: { account: AccountBalance }) {
	return (
		<li className="rounded-lg border p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<h3 className="font-medium">{account.name}</h3>
				<p className="tabular-nums">{accountBalanceText(account)}</p>
			</div>
			<p className="text-muted-foreground text-sm">
				{ACCOUNT_TYPE_LABELS[account.type]} · {account.currency}
			</p>
			<details className="mt-3">
				<summary className="cursor-pointer text-sm">
					Edit {account.name}
				</summary>
				<div className="mt-3">
					<AccountEditor account={account} />
				</div>
			</details>
		</li>
	);
}
