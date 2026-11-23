import { describe, it, expect } from "vitest";
import { parseCollected, makeLine, lineProblems, sumVariance, buildReconciliationItem } from "./reconciliation";

describe("parseCollected", () => {
    it("treats an empty box as the system amount", () => {
        expect(parseCollected("", 45)).toBe(45);
        expect(parseCollected(undefined, 45)).toBe(45);
    });
    it("rejects negatives and junk, rounds to pesewas", () => {
        expect(parseCollected("-5", 45)).toBeNull();
        expect(parseCollected("abc", 45)).toBeNull();
        expect(parseCollected("40.456", 45)).toBe(40.46);
    });
});

describe("makeLine / lineProblems", () => {
    it("has no variance and needs no reason when the amounts match", () => {
        const l = makeLine("P1", 45, "45")!;
        expect(l.variance).toBe(0);
        expect(lineProblems(l, "P1")).toBeNull();
    });
    it("needs a reason when collected differs", () => {
        const l = makeLine("P1", 45, "40")!;
        expect(l.variance).toBe(-5);
        expect(lineProblems(l, "P1")).toMatch(/reason/);
        expect(lineProblems(makeLine("P1", 45, "40", { reason: "Customer paid less" }), "P1")).toBeNull();
    });
    it("needs a note when the reason is Other", () => {
        expect(lineProblems(makeLine("P1", 45, "50", { reason: "Other" }), "P1")).toMatch(/note/);
        expect(lineProblems(makeLine("P1", 45, "50", { reason: "Other", note: "Customer added a tip for the rider" }), "P1")).toBeNull();
    });
    it("drops a stale reason once the amounts match again", () => {
        expect(makeLine("P1", 45, "45", { reason: "Customer paid less" })!.varianceReason).toBeUndefined();
    });
    it("flags an invalid amount", () => {
        expect(lineProblems(makeLine("P1", 45, "x"), "P1")).toMatch(/valid amount/);
    });
});

describe("buildReconciliationItem", () => {
    it("adjusts the paid amount by the total variance", () => {
        const lines = [makeLine("P1", 45, "40", { reason: "Customer paid less" })!, makeLine("P2", 60, "")!, makeLine("P3", 35, "36", { reason: "Overpaid / tip" })!];
        expect(sumVariance(lines)).toBe(-4);
        const item = buildReconciliationItem("asg-1", 170, lines, 1000);
        expect(item).toMatchObject({ assignmentId: "asg-1", expectedAmount: 170, payedAmount: 166, varianceAmount: -4, reconciledAt: 1000 });
        expect(item.lines).toHaveLength(3);
    });
});
