import {
	ACCOUNT_TYPE_LABELS,
	ACCOUNT_TYPES,
	type AccountType,
	CURRENCY_CODES,
	type CurrencyCode,
	createAccountSchema,
	DEFAULT_CURRENCY,
	minorToDecimalInput,
	updateAccountSchema,
} from "@budgeting/ledger";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount } from "@/lib/format-amount";
import {
	createAccount,
	setAccountArchived,
	updateAccount,
} from "@/server/budget";

const selectClass = "h-9 rounded-md border bg-transparent px-3 text-sm";
const currencies = CURRENCY_CODES;

export function CreateAccountForm() {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);
	const defaultCurrency: CurrencyCode = DEFAULT_CURRENCY;
	const form = useForm({
		defaultValues: {
			name: "",
			type: "digital_wallet" as AccountType,
			currency: defaultCurrency,
			openingBalance: "",
		},
		validators: {
			onSubmit: createAccountSchema,
		},
		onSubmit: async ({ value }) => {
			setFormError(null);
			const result = await createAccount({ data: value });
			if (!result.ok) {
				setFormError(result.message);
				return;
			}
			form.reset();
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["month"] });
		},
	});

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
				<form.Field name="name">
					{(field) => (
						<div className="grid gap-2 sm:col-span-2">
							<Label htmlFor="new-account-name">Name</Label>
							<Input
								id="new-account-name"
								name={field.name}
								placeholder="KBZPay"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? "new-account-name-error"
										: undefined
								}
							/>
							<FieldError
								id="new-account-name-error"
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="type">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="new-account-type">Type</Label>
							<select
								id="new-account-type"
								name={field.name}
								className={selectClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.value as AccountType)
								}
							>
								{ACCOUNT_TYPES.map((type) => (
									<option key={type} value={type}>
										{ACCOUNT_TYPE_LABELS[type]}
									</option>
								))}
							</select>
						</div>
					)}
				</form.Field>
				<form.Field name="currency">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor="new-account-currency">Currency</Label>
							<select
								id="new-account-currency"
								name={field.name}
								className={selectClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.value as CurrencyCode)
								}
							>
								{currencies.map((currency) => (
									<option key={currency} value={currency}>
										{currency}
									</option>
								))}
							</select>
						</div>
					)}
				</form.Field>
				<form.Subscribe selector={(state) => state.values.type}>
					{(type) => (
						<form.Field name="openingBalance">
							{(field) => (
								<div className="grid gap-2 sm:col-span-2">
									<Label htmlFor="new-account-opening">
										{type === "credit_card"
											? "Amount already owed"
											: "Opening balance"}
									</Label>
									<Input
										id="new-account-opening"
										name={field.name}
										inputMode="decimal"
										autoComplete="off"
										placeholder="Leave blank for zero"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
										aria-describedby="new-account-opening-hint"
									/>
									<p
										id="new-account-opening-hint"
										className="text-muted-foreground text-sm"
									>
										{type === "credit_card"
											? "For a credit card, a positive amount is what you already owe."
											: "Optional. Stored as whole minor units for the currency."}
									</p>
									<FieldError
										id="new-account-opening-error"
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>
					)}
				</form.Subscribe>
			</div>
			{formError ? (
				<p role="alert" className="text-destructive text-sm">
					{formError}
				</p>
			) : null}
			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving" : "Add account"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

export function AccountEditor({
	account,
}: {
	account: {
		id: string;
		name: string;
		type: AccountType;
		currency: CurrencyCode;
		openingBalanceMinor: number;
		archived: boolean;
	};
}) {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const form = useForm({
		defaultValues: {
			id: account.id,
			name: account.name,
			type: account.type,
			openingBalance: minorToDecimalInput(
				account.openingBalanceMinor,
				account.currency,
			),
		},
		validators: {
			onSubmit: updateAccountSchema,
		},
		onSubmit: async ({ value }) => {
			setFormError(null);
			const result = await updateAccount({ data: value });
			if (!result.ok) {
				setFormError(result.message);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: ["accounts"] });
			await queryClient.invalidateQueries({ queryKey: ["month"] });
		},
	});

	return (
		<div className="grid gap-3">
			<form
				className="grid gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<form.Field name="name">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor={`${account.id}-name`}>Name</Label>
							<Input
								id={`${account.id}-name`}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
							/>
							<FieldError
								id={`${account.id}-name-error`}
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>
				<form.Field name="type">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor={`${account.id}-type`}>Type</Label>
							<select
								id={`${account.id}-type`}
								name={field.name}
								className={selectClass}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									field.handleChange(event.target.value as AccountType)
								}
							>
								{ACCOUNT_TYPES.map((type) => (
									<option key={type} value={type}>
										{ACCOUNT_TYPE_LABELS[type]}
									</option>
								))}
							</select>
						</div>
					)}
				</form.Field>
				<form.Subscribe selector={(state) => state.values.type}>
					{(type) => (
						<form.Field name="openingBalance">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={`${account.id}-opening`}>
										{type === "credit_card"
											? "Amount already owed"
											: "Opening balance"}
									</Label>
									<Input
										id={`${account.id}-opening`}
										name={field.name}
										inputMode="decimal"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-describedby={`${account.id}-opening-hint`}
									/>
									<p
										id={`${account.id}-opening-hint`}
										className="text-muted-foreground text-sm"
									>
										Currency stays {account.currency}.{" "}
										{type === "credit_card"
											? "A positive amount is what you already owe."
											: "A positive amount is money already in the account."}
									</p>
									<FieldError
										id={`${account.id}-opening-error`}
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>
					)}
				</form.Subscribe>
				{formError ? (
					<p role="alert" className="text-destructive text-sm">
						{formError}
					</p>
				) : null}
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving" : "Save changes"}
						</Button>
					)}
				</form.Subscribe>
			</form>
			<Button
				type="button"
				variant="outline"
				disabled={pending}
				onClick={() => {
					setPending(true);
					void setAccountArchived({
						data: { id: account.id, archived: !account.archived },
					})
						.then(async (result) => {
							if (!result.ok) {
								setFormError(result.message);
								return;
							}
							await queryClient.invalidateQueries({ queryKey: ["accounts"] });
							await queryClient.invalidateQueries({ queryKey: ["month"] });
						})
						.finally(() => {
							setPending(false);
						});
				}}
			>
				{account.archived
					? `Restore ${account.name}`
					: `Archive ${account.name}`}
			</Button>
		</div>
	);
}

export function accountBalanceText(account: {
	type: AccountType;
	currency: string;
	displayKind: "balance" | "owed" | "credit";
	displayMinor: number;
}): string {
	const amount = formatAmount(account.displayMinor, account.currency);
	if (account.displayKind === "owed") {
		return `Owed ${amount}`;
	}
	if (account.displayKind === "credit") {
		return `Credit ${amount}`;
	}
	return amount;
}
