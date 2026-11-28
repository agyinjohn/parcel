import { describe, it, expect } from "vitest";
import { payoutTotals, payoutProblem, readyLines, prettyPhone } from "./payoutMath";
import { statementMismatches, payoutCovering } from "./payoutMath";
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

describe("money checks", () => {
    const line = (id: string, amount: number, state: any) => ({ id, parcelId: id, amount, state });
    const trips = [{ tripId: "t1", lines: [line("a", 10, "READY"), line("b", 15.5, "READY"), line("c", 8, "WAITING"), line("d", 12, "PAID")] }] as any;
    it("passes when balances match the listed fees", () => {
        expect(statementMismatches({ readyAmount: 25.5, readyCount: 2, waitingAmount: 8, waitingCount: 1, onHoldAmount: 0, onHoldCount: 0, paidLast30Days: 12 }, trips)).toEqual([]);
    });
    it("reports money the list doesn't account for", () => {
        const m = statementMismatches({ readyAmount: 40, readyCount: 3, waitingAmount: 8, waitingCount: 1, onHoldAmount: 0, onHoldCount: 0, paidLast30Days: 0 }, trips);
        expect(m).toEqual(["Ready to pay: balance says GHC 40.00, parcels listed add up to GHC 25.50"]);
    });
    it("rejects amounts with more than 2 decimals and duplicate parcels", () => {
        expect(payoutProblem([line("a", 10, "READY")] as any, [{ type: "DEDUCTION", amount: 1.005, reason: "x" }], "CASH", "", "")).toBe("Amounts can't have more than 2 decimal places");
        expect(payoutProblem([line("a", 10, "READY"), line("a", 10, "READY")] as any, [], "CASH", "", "")).toBe("A parcel is selected twice");
    });
    it("finds a payout that already covers the lines", () => {
        const ps = [{ id: "p1", lineIds: ["x"], reversed: false }, { id: "p2", lineIds: ["a", "b"], reversed: true }, { id: "p3", lineIds: ["b"], reversed: false }] as any;
        expect(payoutCovering(ps, ["a", "b"])?.id).toBe("p3");
    });
});
