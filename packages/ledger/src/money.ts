/**
 * Stored amounts are integers in each currency's minor unit.
 *
 * Exponents follow ISO 4217 where the subunit is still the unit people use
 * (USD cents, BHD fils, JPY with exponent 0). MMK is the exception the owner
 * actually spends: ISO 4217 still prints exponent 2 for the pya, which has
 * not circulated for years. CLDR sets MMK digits to 0, and Node's Intl
 * formats it with zero fraction digits. Storing pya would not round-trip
 * (1,500.4 kyat formats as MMK 1,501). One stored unit is one kyat.
 */
export const CURRENCY_EXPONENTS = {
	MMK: 0,
	USD: 2,
	EUR: 2,
	JPY: 0,
	BHD: 3,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_EXPONENTS;

export const CURRENCY_CODES = [
	"MMK",
	"USD",
	"EUR",
	"JPY",
	"BHD",
] as const satisfies readonly CurrencyCode[];

export const DEFAULT_CURRENCY: CurrencyCode = "MMK";

export class MoneyParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MoneyParseError";
	}
}

export function isCurrencyCode(value: string): value is CurrencyCode {
	return Object.hasOwn(CURRENCY_EXPONENTS, value);
}

export function minorUnitExponent(currency: CurrencyCode): number {
	return CURRENCY_EXPONENTS[currency];
}

export function parseDecimalToMinor(
	input: string,
	currency: CurrencyCode,
): number {
	const trimmed = input.trim();
	const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(trimmed);
	if (!match) {
		throw new MoneyParseError(
			`Enter a decimal amount for ${currency}, such as 1500 or 10.50.`,
		);
	}

	const sign = match[1] ?? "";
	const whole = match[2] ?? "";
	const fraction = match[3] ?? "";
	if (whole === "" && fraction === "") {
		throw new MoneyParseError("Enter an amount.");
	}

	const exponent = CURRENCY_EXPONENTS[currency];
	if (fraction.length > exponent) {
		throw new MoneyParseError(
			exponent === 0
				? `${currency} does not use a fractional unit.`
				: `${currency} allows at most ${exponent} decimal places.`,
		);
	}

	const paddedFraction = `${fraction}${"0".repeat(exponent)}`.slice(
		0,
		exponent,
	);
	const digits = `${whole === "" ? "0" : whole}${paddedFraction}`;
	let minor: bigint;
	try {
		minor = BigInt(digits);
	} catch {
		throw new MoneyParseError("Enter an amount.");
	}

	if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new MoneyParseError("That amount is too large to store exactly.");
	}

	const signed = sign === "-" ? -minor : minor;
	return Number(signed);
}

export function minorToDecimalInput(
	amountMinor: number,
	currency: CurrencyCode,
): string {
	if (!Number.isSafeInteger(amountMinor)) {
		throw new MoneyParseError("Amount is not a safe integer minor unit.");
	}
	const exponent = CURRENCY_EXPONENTS[currency];
	const negative = amountMinor < 0;
	const abs = Math.abs(amountMinor);
	if (exponent === 0) {
		return `${negative ? "-" : ""}${abs}`;
	}
	const digits = String(abs).padStart(exponent + 1, "0");
	const whole = digits.slice(0, -exponent);
	const fraction = digits.slice(-exponent);
	return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function formatMinor(
	amountMinor: number,
	currency: CurrencyCode,
	locale = "en",
): string {
	if (!Number.isSafeInteger(amountMinor)) {
		throw new MoneyParseError("Amount is not a safe integer minor unit.");
	}
	const exponent = CURRENCY_EXPONENTS[currency];
	const major = amountMinor / 10 ** exponent;
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		minimumFractionDigits: exponent,
		maximumFractionDigits: exponent,
	}).format(major);
}
