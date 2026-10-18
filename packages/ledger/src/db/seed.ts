import { eq } from "drizzle-orm";
import { LOCAL_OWNER_ID, SEED_ACCOUNT_ID, SEED_CATEGORIES } from "../ids";
import { DEFAULT_CURRENCY } from "../money";
import { accounts, categories } from "./schema";
import type { BudgetDatabase } from "./types";

export async function seedIfEmpty(db: BudgetDatabase): Promise<void> {
	const existing = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.ownerId, LOCAL_OWNER_ID))
		.limit(1);
	if (existing.length > 0) {
		return;
	}

	const createdAt = new Date().toISOString();
	await db.insert(accounts).values({
		id: SEED_ACCOUNT_ID,
		ownerId: LOCAL_OWNER_ID,
		name: "Cash",
		currency: DEFAULT_CURRENCY,
		createdAt,
	});
	await db.insert(categories).values(
		SEED_CATEGORIES.map((category) => ({
			id: category.id,
			ownerId: LOCAL_OWNER_ID,
			name: category.name,
			direction: category.direction,
			createdAt,
		})),
	);
}
