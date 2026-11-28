import { describe, it, expect } from "vitest";
import { cashupSummary, sumPayouts, toCsv, localDate } from "./reportsMath";

describe("cashupSummary", () => {
    it("counts open and closed days and nets differences with corrections", () => {
        const s = cashupSummary([
            { officeId: "a", date: "2026-11-27", closed: true, expectedCash: 800, countedCash: 795, difference: -5, adjustmentTotal: 5, expectedMomo: 40 },
            { officeId: "a", date: "2026-11-26", closed: true, expectedCash: 300, countedCash: 290, difference: -10 },
            { officeId: "b", date: "2026-11-27", closed: false, expectedCash: 120 },
        ]);
        expect(s).toEqual({ days: 3, closed: 2, open: 1, shortDays: 2, difference: -10, expectedCash: 1220, momo: 40 });
    });
});

describe("sumPayouts", () => {
    it("adds station rows", () => {
        expect(sumPayouts([
            { payouts: 2, gross: 100, deductions: 10, bonuses: 0, net: 90, cash: 90, momo: 0, unconfirmed: 1 },
            { payouts: 1, gross: 50.5, deductions: 0, bonuses: 5, net: 55.5, cash: 0, momo: 55.5, unconfirmed: 0 },
        ])).toEqual({ payouts: 3, gross: 150.5, deductions: 10, bonuses: 5, net: 145.5, cash: 90, momo: 55.5, unconfirmed: 1 });
    });
});

describe("toCsv / localDate", () => {
    it("quotes cells and escapes quotes", () => {
        expect(toCsv(["A", "B"], [["x", 'say "hi"'], [1, null]])).toBe('"A","B"\n"x","say ""hi"""\n"1",""');
    });
    it("formats a local calendar day", () => {
        expect(localDate(new Date(2026, 10, 5, 23, 0).getTime())).toBe("2026-11-05");
    });
});
