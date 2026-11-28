import { describe, it, expect } from "vitest";
import { duplicateCount, groupActive, sinceAssigned, toActiveParcel } from "./activeDeliveries";

const parcel = (id: string, extra: Record<string, unknown> = {}) => ({ parcelId: id, receiverName: `R ${id}`, delivered: false, returned: false, deliveryCost: 20, inboundCost: 10, ...extra });

describe("groupActive", () => {
    it("keeps only undelivered, unreturned parcels on active assignments (any of ASSIGNED, ACCEPTED, PICKED_UP)", () => {
        const riders = groupActive([
            { assignmentId: "a1", status: "PICKED_UP", riderInfo: { riderId: "r1", riderName: "Kwame" }, parcels: [parcel("P1"), parcel("P2", { delivered: true })] },
            { assignmentId: "a2", status: "ASSIGNED", riderInfo: { riderId: "r1", riderName: "Kwame" }, parcels: [parcel("P3")] },
            { assignmentId: "a3", status: "DELIVERED", riderInfo: { riderId: "r2", riderName: "Ama" }, parcels: [parcel("P4")] },
            { assignmentId: "a4", status: "ACCEPTED", riderInfo: { riderId: "r2", riderName: "Ama" }, parcels: [parcel("P5", { returned: true })] },
        ]);
        expect(riders).toHaveLength(1);
        expect(riders[0].parcels.map((p) => p.parcelId)).toEqual(["P1", "P3"]);
        expect(riders[0].toCollect).toBe(60);
    });

    it("counts parcels out for a day or more", () => {
        const now = 200 * 3_600_000;
        const r = groupActive([{ assignmentId: "a", status: "ASSIGNED", riderInfo: { riderId: "r" }, assignedAt: now - 30 * 3_600_000, parcels: [parcel("P1"), parcel("P2")] }], now);
        expect(r[0].overdue).toBe(2);
    });

    it("lists a parcel on two active assignments once, under the newest, and flags the other", () => {
        const riders = groupActive([
            { assignmentId: "old", status: "ASSIGNED", assignedAt: 1, riderInfo: { riderId: "r1", riderName: "Kwame" }, parcels: [parcel("P1"), parcel("P2")] },
            { assignmentId: "new", status: "ASSIGNED", assignedAt: 2, riderInfo: { riderId: "r2", riderName: "Ama" }, parcels: [parcel("P1")] },
        ]);
        const ama = riders.find((r) => r.riderId === "r2")!;
        const kwame = riders.find((r) => r.riderId === "r1")!;
        expect(ama.parcels.map((p) => p.parcelId)).toEqual(["P1"]);
        expect(ama.parcels[0].alsoWith).toEqual([{ assignmentId: "old", riderName: "Kwame" }]);
        expect(kwame.parcels.map((p) => p.parcelId)).toEqual(["P2"]);
        expect(duplicateCount(riders)).toBe(1);
    });

    it("treats a missing delivered flag as not delivered and ignores duplicates", () => {
        const a = { assignmentId: "a1", status: "ACCEPTED", riderInfo: { riderId: "r1" }, parcels: [{ parcelId: "P1" }] };
        expect(groupActive([a, a])[0].parcels).toHaveLength(1);
    });
});

describe("toActiveParcel", () => {
    it("lists real charges and adds the POD item value", () => {
        const p = toActiveParcel({ assignmentId: "a", status: "ACCEPTED" }, { parcelId: "P", deliveryCost: 25, storageCost: 5, pod: true, itemCost: 300 });
        expect(p.charges).toEqual([{ label: "Delivery fee", amount: 25 }, { label: "Storage", amount: 5 }]);
        expect(p.podAmount).toBe(300);
        expect(p.toCollect).toBe(330);
    });
    it("falls back to parcelAmount when costs are missing", () => {
        expect(toActiveParcel({ assignmentId: "a", status: "ASSIGNED" }, { parcelId: "P", parcelAmount: 45 }).toCollect).toBe(45);
    });
});

describe("sinceAssigned", () => {
    it("flags parcels out for a day or more", () => {
        const now = 100 * 3_600_000;
        expect(sinceAssigned(now - 2 * 3_600_000, now)).toEqual({ text: "2 h ago", stale: false });
        expect(sinceAssigned(now - 50 * 3_600_000, now)).toEqual({ text: "2 days ago", stale: true });
    });
});
