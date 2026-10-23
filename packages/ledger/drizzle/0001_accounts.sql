-- Account types, opening balances, archive flag, and same-currency transfers.
-- Existing rows (including the seeded Cash account) become type cash with a
-- zero opening balance and archived = false. Widen accounts_type_check in a
-- later migration when adding a type.

ALTER TABLE accounts
	ADD COLUMN type text NOT NULL DEFAULT 'cash';

ALTER TABLE accounts
	ADD COLUMN opening_balance_minor bigint NOT NULL DEFAULT 0;

ALTER TABLE accounts
	ADD COLUMN archived boolean NOT NULL DEFAULT false;

ALTER TABLE accounts
	ADD CONSTRAINT accounts_type_check
	CHECK (type IN ('cash', 'bank', 'digital_wallet', 'credit_card', 'other'));

ALTER TABLE accounts
	ADD CONSTRAINT accounts_name_length
	CHECK (char_length(name) BETWEEN 1 AND 80);

CREATE TABLE transfers (
	id text PRIMARY KEY,
	owner_id text NOT NULL,
	from_account_id text NOT NULL REFERENCES accounts (id),
	to_account_id text NOT NULL REFERENCES accounts (id),
	amount_minor bigint NOT NULL CHECK (amount_minor > 0),
	occurred_on text NOT NULL CHECK (occurred_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	memo text NOT NULL CHECK (char_length(memo) BETWEEN 1 AND 120),
	created_at timestamptz NOT NULL,
	CHECK (from_account_id <> to_account_id)
);

CREATE INDEX transfers_owner_date_idx ON transfers (owner_id, occurred_on);
