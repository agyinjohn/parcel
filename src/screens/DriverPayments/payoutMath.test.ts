import { describe, it, expect } from "vitest";
import { payoutTotals, payoutProblem, readyLines, prettyPhone } from "./payoutMath";
import type { FeeLine } from "../../services/driverPaymentsService";

const line = (id: string, amount: number, state: FeeLine["state"] = "READY"): FeeLine => ({ id, parcelId: `P${id}`, amount, state });

describe("payoutTotals", () => {
    it("takes deductions and advance repayments off, adds bonuses", () => {
        expect(payoutTotals([line("1", 300), line("2", 165)], [
            { type: "DEDUCTION", amount: 25 },
            { type: "ADVANCE_REPAID", amount: 50 },
            { type: "BONUS", amount: 10 },
        ])).toEqual({ gross: 465, deductions: 75, bonuses: 10, net: 400 });
    });
});

describe("payoutProblem", () => {
    const ok = [line("1", 100)];
    it("needs ready lines", () => {
        expect(payoutProblem([], [], "CASH", "", "")).toMatch(/at least one/);
        expect(payoutProblem([line("1", 10, "WAITING")], [], "CASH", "", "")).toMatch(/Only ready/);
    });
    it("blocks a negative payout and incomplete adjustments", () => {
        expect(payoutProblem(ok, [{ type: "DEDUCTION", amount: 150, reason: "Damage" }], "CASH", "", "")).toMatch(/more than/);
        expect(payoutProblem(ok, [{ type: "DEDUCTION", amount: 5, reason: " " }], "CASH", "", "")).toMatch(/reason/);
    });
    it("needs number and transaction ID for MoMo", () => {
        expect(payoutProblem(ok, [], "", "", "")).toMatch(/cash or mobile/);
        expect(payoutProblem(ok, [], "MOMO", "", "")).toMatch(/MoMo number/);
        expect(payoutProblem(ok, [], "MOMO", "0244118902", "")).toMatch(/transaction ID/);
        expect(payoutProblem(ok, [], "MOMO", "0244118902", "771")).toBeNull();
        expect(payoutProblem(ok, [], "CASH", "", "")).toBeNull();
    });
});

describe("helpers", () => {
    it("collects ready lines across trips", () => {
        expect(readyLines([{ tripId: "t", lines: [line("1", 5), line("2", 5, "PAID")] }, { tripId: "u" }]).map((l) => l.id)).toEqual(["1"]);
    });
    it("formats Ghana numbers", () => {
        expect(prettyPhone("+233244118902")).toBe("0244 118 902");
        expect(prettyPhone("abc")).toBe("abc");
    });
});
