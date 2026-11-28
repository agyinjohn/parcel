import { describe, it, expect } from "vitest";
import { activeHolders, isAlreadyOut, ridersHolding, splitFreeAndTaken, uniqueByParcel } from "./assignmentGuard";

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
    const holders = activeHolders([asg("a1", "ASSIGNED", "r1", 1, [{ parcelId: "P1" }])]);
    const fresh = [{ parcelId: "P1" }, { parcelId: "P2" }, { parcelId: "P3", parcelAssigned: true, riderInfo: { riderId: "r2", riderName: "R2" } }];

    it("from the Ready tab, keeps only parcels nobody has", () => {
        expect(splitFreeAndTaken(["P1", "P2", "P2", "P3", "P4"], fresh, holders, { riderId: "r9" })).toEqual({
            free: ["P2"],
            taken: [{ parcelId: "P1", riderName: "R1" }, { parcelId: "P3", riderName: "R2" }],
            sameRider: [],
            gone: ["P4"],
        });
    });
    it("never gives a rider a parcel they already have, even when reassigning", () => {
        expect(splitFreeAndTaken(["P1", "P3"], fresh, holders, { riderId: "r1", reassign: true })).toMatchObject({ free: ["P3"], sameRider: ["P1"] });
        expect(splitFreeAndTaken(["P3"], fresh, holders, { riderId: "r2", reassign: true })).toMatchObject({ free: [], sameRider: ["P3"] });
    });
    it("lists the riders already holding the picked parcels", () => {
        expect([...ridersHolding(["P1", "P3"], fresh, holders)].sort()).toEqual(["r1", "r2"]);
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
