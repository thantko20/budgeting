import { describe, expect, it } from "vitest";
import {
	formatMinor,
	MoneyParseError,
	minorToDecimalInput,
	minorUnitExponent,
	parseDecimalToMinor,
} from "./money";

describe("parseDecimalToMinor", () => {
	it("uses each currency's minor-unit exponent", () => {
		expect(minorUnitExponent("MMK")).toBe(0);
		expect(minorUnitExponent("USD")).toBe(2);
		expect(minorUnitExponent("JPY")).toBe(0);
		expect(minorUnitExponent("BHD")).toBe(3);

		expect(parseDecimalToMinor("1500", "MMK")).toBe(1500);
		expect(parseDecimalToMinor("10.50", "USD")).toBe(1050);
		expect(parseDecimalToMinor("10.5", "USD")).toBe(1050);
		expect(parseDecimalToMinor("10", "USD")).toBe(1000);
		expect(parseDecimalToMinor(".5", "USD")).toBe(50);
		expect(parseDecimalToMinor("1500", "JPY")).toBe(1500);
		expect(parseDecimalToMinor("1.234", "BHD")).toBe(1234);
	});

	it("rejects more fractional digits than the currency allows", () => {
		expect(() => parseDecimalToMinor("1500.5", "MMK")).toThrow(MoneyParseError);
		expect(() => parseDecimalToMinor("1500.5", "MMK")).toThrow(/fractional/);
		expect(() => parseDecimalToMinor("10.505", "USD")).toThrow(MoneyParseError);
		expect(() => parseDecimalToMinor("1.2345", "BHD")).toThrow(MoneyParseError);
	});

	it("stores refunds as negative minor units", () => {
		expect(parseDecimalToMinor("-500", "MMK")).toBe(-500);
		expect(parseDecimalToMinor("-12.34", "USD")).toBe(-1234);
		expect(parseDecimalToMinor("-0.50", "USD")).toBe(-50);
		expect(parseDecimalToMinor("-0", "MMK")).toBe(0);
	});

	it("rejects blank and non-decimal input", () => {
		expect(() => parseDecimalToMinor("", "MMK")).toThrow(MoneyParseError);
		expect(() => parseDecimalToMinor("1,500", "MMK")).toThrow(MoneyParseError);
		expect(() => parseDecimalToMinor("10.50.1", "USD")).toThrow(
			MoneyParseError,
		);
		expect(() => parseDecimalToMinor("1e2", "USD")).toThrow(MoneyParseError);
	});
});

describe("formatMinor", () => {
	it("formats MMK as whole kyat and USD with cents", () => {
		expect(normalize(formatMinor(1500, "MMK"))).toBe("MMK 1,500");
		expect(normalize(formatMinor(1050, "USD"))).toBe("$10.50");
		expect(normalize(formatMinor(1234, "BHD"))).toBe("BHD 1.234");
	});

	it("keeps the sign on refunds", () => {
		expect(normalize(formatMinor(-500, "MMK"))).toBe("-MMK 500");
		expect(normalize(formatMinor(-1050, "USD"))).toBe("-$10.50");
	});
});

describe("minorToDecimalInput", () => {
	it("round-trips through parseDecimalToMinor", () => {
		for (const [currency, amount] of [
			["MMK", 1500],
			["MMK", 0],
			["USD", 1050],
			["USD", 50],
			["BHD", 1234],
			["MMK", -500],
		] as const) {
			expect(
				parseDecimalToMinor(minorToDecimalInput(amount, currency), currency),
			).toBe(amount);
		}
	});
});

function normalize(value: string): string {
	return value.replace(/\u00a0/g, " ").replace(/\u2212/g, "-");
}
