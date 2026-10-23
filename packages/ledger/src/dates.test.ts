import { describe, expect, it } from "vitest";
import {
	civilDateInMonth,
	civilDateInTimeZone,
	currentMonth,
	DEFAULT_TIME_ZONE,
	monthBounds,
	shiftMonth,
} from "./dates";

describe("month boundaries in Asia/Yangon", () => {
	it("rolls the civil date at Yangon midnight, not UTC midnight", () => {
		const beforeMidnight = new Date("2026-02-28T17:29:59.000Z");
		const atMidnight = new Date("2026-02-28T17:30:00.000Z");

		expect(civilDateInTimeZone(beforeMidnight, DEFAULT_TIME_ZONE)).toBe(
			"2026-02-28",
		);
		expect(civilDateInTimeZone(atMidnight, DEFAULT_TIME_ZONE)).toBe(
			"2026-03-01",
		);
		expect(currentMonth(DEFAULT_TIME_ZONE, beforeMidnight)).toBe("2026-02");
		expect(currentMonth(DEFAULT_TIME_ZONE, atMidnight)).toBe("2026-03");
	});

	it("keeps October inclusive of the first and last civil dates", () => {
		expect(monthBounds("2026-10")).toEqual({
			start: "2026-10-01",
			end: "2026-10-31",
		});
		expect(civilDateInMonth("2026-10-01", "2026-10")).toBe(true);
		expect(civilDateInMonth("2026-10-31", "2026-10")).toBe(true);
		expect(civilDateInMonth("2026-09-30", "2026-10")).toBe(false);
		expect(civilDateInMonth("2026-11-01", "2026-10")).toBe(false);
	});

	it("handles February in leap and common years", () => {
		expect(monthBounds("2024-02")).toEqual({
			start: "2024-02-01",
			end: "2024-02-29",
		});
		expect(monthBounds("2026-02")).toEqual({
			start: "2026-02-01",
			end: "2026-02-28",
		});
		expect(civilDateInMonth("2024-02-29", "2024-02")).toBe(true);
		expect(civilDateInMonth("2026-02-29", "2026-02")).toBe(false);
	});

	it("shifts across year boundaries", () => {
		expect(shiftMonth("2026-01", -1)).toBe("2025-12");
		expect(shiftMonth("2026-12", 1)).toBe("2027-01");
	});
});
