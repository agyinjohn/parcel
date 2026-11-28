import { describe, it, expect } from "vitest";
import { activeHolders, isAlreadyOut, splitFreeAndTaken, uniqueByParcel } from "./assignmentGuard";

const asg = (id: string, status: string, rider: string, at: number, parcels: any[]) => ({ assignmentId: id, status, assignedAt: at, riderInfo: { riderId: rider, riderName: rider.toUpperCase() }, parcels });

describe("activeHolders", () => {
    it("lists every active assignment holding a parcel, newest first, ignoring finished ones", () => {
        const m = activeHolders([
            asg("a1", "ASSIGNED", "r1", 1, [{ parcelId: "P1" }, { parcelId: "P2", delivered: true }]),
            asg("a2", "PICKED_UP", "r2", 5, [{ parcelId: "P1" }]),
            asg("a3", "DELIVERED", "r3", 9, [{ parcelId: "P1" }]),
            asg("a2", "PICKED_UP", "r2", 5, [{ parcelId: "P1" }]),
        ]);
        expect(m.get("P1")!.map((h) => h.assignmentId)).toEqual(["a2", "a1"]);
        expect(m.has("P2")).toBe(false);
    });
});

describe("splitFreeAndTaken", () => {
    it("keeps only parcels nobody has, and reports the rest", () => {
        const holders = activeHolders([asg("a1", "ASSIGNED", "r1", 1, [{ parcelId: "P1" }])]);
        const fresh = [{ parcelId: "P1" }, { parcelId: "P2" }, { parcelId: "P3", parcelAssigned: true }];
        expect(splitFreeAndTaken(["P1", "P2", "P2", "P3", "P4"], fresh, holders)).toEqual({
            free: ["P2"],
            taken: [{ parcelId: "P1", riderName: "R1" }, { parcelId: "P3", riderName: undefined }],
            gone: ["P4"],
        });
    });
});

describe("isAlreadyOut / uniqueByParcel", () => {
    it("treats flags or an active assignment as out", () => {
        const holders = activeHolders([asg("a1", "ACCEPTED", "r1", 1, [{ parcelId: "P1" }])]);
        expect(isAlreadyOut({ parcelId: "P1" }, holders)).toBe(true);
        expect(isAlreadyOut({ parcelId: "P2", riderInfo: {} }, holders)).toBe(true);
        expect(isAlreadyOut({ parcelId: "P3" }, holders)).toBe(false);
    });
    it("drops repeated parcel rows", () => {
        expect(uniqueByParcel([{ parcelId: "A" }, { parcelId: "B" }, { parcelId: "A" }])).toHaveLength(2);
    });
});
