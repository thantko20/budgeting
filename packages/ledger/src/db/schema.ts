import { bigint, boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	ownerId: text("owner_id").notNull(),
	name: text("name").notNull(),
	type: text("type").notNull(),
	currency: text("currency").notNull(),
	openingBalanceMinor: bigint("opening_balance_minor", {
		mode: "number",
	}).notNull(),
	archived: boolean("archived").notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).notNull(),
});

export const categories = pgTable("categories", {
	id: text("id").primaryKey(),
	ownerId: text("owner_id").notNull(),
	name: text("name").notNull(),
	direction: text("direction").notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).notNull(),
});

export const transactions = pgTable("transactions", {
	id: text("id").primaryKey(),
	ownerId: text("owner_id").notNull(),
	accountId: text("account_id").notNull(),
	categoryId: text("category_id").notNull(),
	direction: text("direction").notNull(),
	amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
	occurredOn: text("occurred_on").notNull(),
	payee: text("payee").notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).notNull(),
});

export const transfers = pgTable("transfers", {
	id: text("id").primaryKey(),
	ownerId: text("owner_id").notNull(),
	fromAccountId: text("from_account_id").notNull(),
	toAccountId: text("to_account_id").notNull(),
	amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
	occurredOn: text("occurred_on").notNull(),
	memo: text("memo").notNull(),
	createdAt: timestamp("created_at", {
		withTimezone: true,
		mode: "string",
	}).notNull(),
});
