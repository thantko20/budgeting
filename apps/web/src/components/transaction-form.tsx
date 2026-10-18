import { createTransactionSchema, type Direction } from "@budgeting/ledger";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/server/budget";

export function TransactionForm({
	today,
	accounts,
	categories,
}: {
	today: string;
	accounts: Array<{ id: string; name: string; currency: string }>;
	categories: Array<{ id: string; name: string; direction: Direction }>;
}) {
	const queryClient = useQueryClient();
	const [formError, setFormError] = useState<string | null>(null);
	const expenseCategory =
		categories.find((category) => category.direction === "expense") ??
		categories[0];

	const form = useForm({
		defaultValues: {
			accountId: accounts[0]?.id ?? "",
			categoryId: expenseCategory?.id ?? "",
			direction: "expense" as Direction,
			amount: "",
			occurredOn: today,
			payee: "",
		},
		validators: {
			onSubmit: createTransactionSchema,
		},
		onSubmit: async ({ value }) => {
			setFormError(null);
			const result = await createTransaction({ data: value });
			if (!result.ok) {
				setFormError(result.message);
				return;
			}
			form.setFieldValue("amount", "");
			form.setFieldValue("payee", "");
			await queryClient.invalidateQueries({ queryKey: ["month"] });
		},
	});

	if (accounts.length === 0 || categories.length === 0) {
		return <p>No accounts are available yet.</p>;
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
				<form.Field name="direction">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor={field.name}>Type</Label>
							<select
								id={field.name}
								name={field.name}
								className="h-9 rounded-md border bg-transparent px-3 text-sm"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => {
									const direction = event.target.value as Direction;
									field.handleChange(direction);
									const current = categories.find(
										(category) =>
											category.id === form.getFieldValue("categoryId"),
									);
									if (current?.direction === direction) {
										return;
									}
									const next = categories.find(
										(category) => category.direction === direction,
									);
									if (next) {
										form.setFieldValue("categoryId", next.id);
									}
								}}
							>
								<option value="expense">Expense</option>
								<option value="income">Income</option>
							</select>
						</div>
					)}
				</form.Field>

				<form.Subscribe selector={(state) => state.values.direction}>
					{(direction) => (
						<form.Field name="categoryId">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Category</Label>
									<select
										id={field.name}
										name={field.name}
										className="h-9 rounded-md border bg-transparent px-3 text-sm"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									>
										{categories
											.filter((category) => category.direction === direction)
											.map((category) => (
												<option key={category.id} value={category.id}>
													{category.name}
												</option>
											))}
									</select>
									<FieldError
										id={`${field.name}-error`}
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						</form.Field>
					)}
				</form.Subscribe>

				<form.Field name="amount">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor={field.name}>Amount</Label>
							<Input
								id={field.name}
								name={field.name}
								inputMode="decimal"
								autoComplete="off"
								placeholder="1500 or -500 for a refund"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? `${field.name}-error`
										: undefined
								}
							/>
							<FieldError
								id={`${field.name}-error`}
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="occurredOn">
					{(field) => (
						<div className="grid gap-2">
							<Label htmlFor={field.name}>Date</Label>
							<Input
								id={field.name}
								name={field.name}
								type="date"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? `${field.name}-error`
										: undefined
								}
							/>
							<FieldError
								id={`${field.name}-error`}
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="payee">
					{(field) => (
						<div className="grid gap-2 sm:col-span-2">
							<Label htmlFor={field.name}>Payee</Label>
							<Input
								id={field.name}
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0
										? `${field.name}-error`
										: undefined
								}
							/>
							<FieldError
								id={`${field.name}-error`}
								errors={field.state.meta.errors}
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="accountId">
					{(field) => (
						<div className="grid gap-2 sm:col-span-2">
							<Label htmlFor={field.name}>Account</Label>
							<select
								id={field.name}
								name={field.name}
								className="h-9 rounded-md border bg-transparent px-3 text-sm"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name} ({account.currency})
									</option>
								))}
							</select>
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
						{isSubmitting ? "Saving" : "Add transaction"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

function FieldError({
	id,
	errors,
}: {
	id: string;
	errors: ReadonlyArray<unknown>;
}) {
	const message = messageFrom(errors);
	if (!message) {
		return null;
	}
	return (
		<p id={id} role="alert" className="text-destructive text-sm">
			{message}
		</p>
	);
}

function messageFrom(errors: ReadonlyArray<unknown>): string | undefined {
	const first = errors[0];
	if (typeof first === "string") {
		return first;
	}
	if (first && typeof first === "object" && "message" in first) {
		const message = first.message;
		if (typeof message === "string") {
			return message;
		}
	}
	return undefined;
}
