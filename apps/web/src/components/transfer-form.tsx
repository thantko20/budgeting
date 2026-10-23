import {
	ACCOUNT_TYPE_LABELS,
	type AccountType,
	createTransferSchema,
} from "@budgeting/ledger";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransfer } from "@/server/budget";

const selectClass = "h-9 rounded-md border bg-transparent px-3 text-sm";

type AccountOption = {
	id: string;
	name: string;
	type: AccountType;
	currency: string;
	archived: boolean;
};

export function TransferForm({
	today,
	accounts,
	onSaved,
}: {
	today: string;
	accounts: AccountOption[];
	onSaved?: () => void;
}) {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);
	const active = accounts.filter((account) => !account.archived);
	const fromAccount = active[0];
	const toAccount =
		active.find(
			(account) =>
				account.id !== fromAccount?.id &&
				account.currency === fromAccount?.currency,
		) ?? active.find((account) => account.id !== fromAccount?.id);

	const form = useForm({
		defaultValues: {
			fromAccountId: fromAccount?.id ?? "",
			toAccountId: toAccount?.id ?? "",
			amount: "",
			occurredOn: today,
			memo: "",
		},
		validators: {
			onSubmit: createTransferSchema,
		},
		onSubmit: async ({ value }) => {
			setFormError(null);
			const from = active.find((account) => account.id === value.fromAccountId);
			const to = active.find((account) => account.id === value.toAccountId);
			if (from && to && from.currency !== to.currency) {
				setFormError(
					`Transfers stay in one currency. ${from.name} is ${from.currency} and ${to.name} is ${to.currency}.`,
				);
				return;
			}
			const result = await createTransfer({ data: value });
			if (!result.ok) {
				setFormError(result.message);
				return;
			}
			form.setFieldValue("amount", "");
			form.setFieldValue("memo", "");
			await queryClient.invalidateQueries({ queryKey: ["month"] });
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["trend"] });
			onSaved?.();
		},
	});

	if (active.length < 2) {
		return (
			<p className="text-muted-foreground">
				Add another account before transferring.
			</p>
		);
	}

	return (
		<form
			className="grid gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="fromAccountId">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="transfer-from">From</Label>
							<select
								id="transfer-from"
								name={field.name}
								className={selectClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							>
								{active.map((account) => (
									<option key={account.id} value={account.id}>
										{accountLabel(account)}
									</option>
								))}
							</select>
							<FieldError
								id="transfer-from-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="toAccountId">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="transfer-to">To</Label>
							<select
								id="transfer-to"
								name={field.name}
								className={selectClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							>
								{active.map((account) => (
									<option key={account.id} value={account.id}>
										{accountLabel(account)}
									</option>
								))}
							</select>
							<FieldError
								id="transfer-to-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="amount">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="transfer-amount">Amount</Label>
							<Input
								id="transfer-amount"
								name={field.name}
								inputMode="decimal"
								autoComplete="off"
								placeholder="10000"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? "transfer-amount-error"
										: undefined
								}
							/>
							<FieldError
								id="transfer-amount-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="occurredOn">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="transfer-date">Date</Label>
							<Input
								id="transfer-date"
								name={field.name}
								type="date"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? "transfer-date-error"
										: undefined
								}
							/>
							<FieldError
								id="transfer-date-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="memo">
					{(field) => (
						<div className="grid gap-2 sm:col-span-2">
							<Label htmlFor="transfer-memo">Memo</Label>
							<Input
								id="transfer-memo"
								name={field.name}
								placeholder="Top up KBZPay"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? "transfer-memo-error"
										: undefined
								}
							/>
							<FieldError
								id="transfer-memo-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
			</div>
			{formError ? (
				<p role="alert" className="text-destructive text-sm">
					{formError}
				</p>
			) : null}
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving" : "Add transfer"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

function accountLabel(account: AccountOption): string {
	return `${account.name} · ${ACCOUNT_TYPE_LABELS[account.type]} (${account.currency})`;
}
