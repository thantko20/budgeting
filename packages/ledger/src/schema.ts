import { z } from "zod";
import { isValidCivilDate, isValidMonth } from "./dates";
import { isCurrencyCode } from "./money";

export const directionSchema = z.enum(["income", "expense"]);

export type Direction = z.infer<typeof directionSchema>;

export const currencyCodeSchema = z
	.string()
	.refine(isCurrencyCode, "Choose a supported currency.");

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
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;
