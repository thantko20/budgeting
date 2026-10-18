export const LOCAL_OWNER_ID = "local";

export const SEED_ACCOUNT_ID = "acct_cash";

export const SEED_CATEGORIES = [
	{ id: "cat_salary", name: "Salary", direction: "income" },
	{ id: "cat_food", name: "Food", direction: "expense" },
	{ id: "cat_transport", name: "Transport", direction: "expense" },
	{ id: "cat_household", name: "Household", direction: "expense" },
	{ id: "cat_other", name: "Other", direction: "expense" },
] as const;
