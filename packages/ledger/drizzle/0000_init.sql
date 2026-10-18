CREATE TABLE accounts (
	id text PRIMARY KEY,
	owner_id text NOT NULL,
	name text NOT NULL,
	currency text NOT NULL,
	created_at timestamptz NOT NULL
);

CREATE TABLE categories (
	id text PRIMARY KEY,
	owner_id text NOT NULL,
	name text NOT NULL,
	direction text NOT NULL CHECK (direction IN ('income', 'expense')),
	created_at timestamptz NOT NULL
);

CREATE TABLE transactions (
	id text PRIMARY KEY,
	owner_id text NOT NULL,
	account_id text NOT NULL REFERENCES accounts (id),
	category_id text NOT NULL REFERENCES categories (id),
	direction text NOT NULL CHECK (direction IN ('income', 'expense')),
	amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
	occurred_on text NOT NULL CHECK (occurred_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	payee text NOT NULL CHECK (char_length(payee) BETWEEN 1 AND 120),
	created_at timestamptz NOT NULL
);

CREATE INDEX transactions_owner_date_idx ON transactions (owner_id, occurred_on);
