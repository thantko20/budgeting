import { z } from "zod";
import { isValidCivilDate, isValidMonth } from "./dates";
import { CURRENCY_CODES } from "./money";

export const directionSchema = z.enum(["income", "expense"]);

export type Direction = z.infer<typeof directionSchema>;

export const ACCOUNT_TYPES = [
	"cash",
	"bank",
	"digital_wallet",
	"credit_card",
	"other",
] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export type AccountType = z.infer<typeof accountTypeSchema>;

export function isAccountType(value: string): value is AccountType {
	return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export const currencyCodeSchema = z.enum(CURRENCY_CODES, {
	error: "Choose a supported currency.",
});

export const civilDateSchema = z
	.string()
	.refine(isValidCivilDate, "Choose a real calendar date (YYYY-MM-DD).");

export const monthSchema = z
	.string()
	.refine(isValidMonth, "Choose a month (YYYY-MM).");

export const createTransactionSchema = z.object({
	accountId: z.string().trim().min(1, "Choose an account."),
	categoryId: z.string().trim().min(1, "Choose a category."),
	direction: directionSchema,
	amount: z.string().trim().min(1, "Enter an amount."),
	occurredOn: civilDateSchema,
	payee: z.string().trim().min(1, "Enter a payee.").max(120),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const monthQuerySchema = z.object({
	month: monthSchema,
	accountId: z.string().trim().min(1).optional(),
});

export const trendQuerySchema = z.object({
	month: monthSchema,
	currency: currencyCodeSchema.optional(),
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;

export const createAccountSchema = z.object({
	name: z.string().trim().min(1, "Enter a name.").max(80),
	type: accountTypeSchema,
	currency: currencyCodeSchema,
	openingBalance: z.string().trim(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
	id: z.string().trim().min(1),
	name: z.string().trim().min(1, "Enter a name.").max(80),
	type: accountTypeSchema,
	openingBalance: z.string().trim(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const setAccountArchivedSchema = z.object({
	id: z.string().trim().min(1),
	archived: z.boolean(),
});

export type SetAccountArchivedInput = z.infer<typeof setAccountArchivedSchema>;

export const createTransferSchema = z
	.object({
		fromAccountId: z.string().trim().min(1, "Choose the account to move from."),
		toAccountId: z.string().trim().min(1, "Choose the account to move to."),
		amount: z.string().trim().min(1, "Enter an amount."),
		occurredOn: civilDateSchema,
		memo: z.string().trim().min(1, "Enter a memo.").max(120),
	})
	.refine((value) => value.fromAccountId !== value.toAccountId, {
		message: "Choose two different accounts.",
		path: ["toAccountId"],
	});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
