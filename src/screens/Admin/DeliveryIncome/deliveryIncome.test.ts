import { describe, it, expect } from "vitest";
import { settlementStatus, parcelIncome } from "./deliveryIncome";

describe("settlementStatus", () => {
    it("is settled with nothing outstanding, partial when some is, unsettled when all is", () => {
        expect(settlementStatus(100, 0)).toBe("settled");
        expect(settlementStatus(100, 40)).toBe("partial");
        expect(settlementStatus(100, 100)).toBe("unsettled");
        expect(settlementStatus(0, 0)).toBe("settled");
    });
});

describe("parcelIncome", () => {
    it("adds up the charges and only shows item value on POD parcels", () => {
        const row = parcelIncome({ parcelId: "P1", receiverName: "Ama", deliveryCost: 20, inboundCost: 10, storageCost: 5, pod: true, itemCost: 250, riderInfo: { riderName: "Kofi" } });
        expect(row).toMatchObject({ deliveryFee: 20, total: 35, codAmount: 250, riderName: "Kofi", status: "Delivered" });
        expect(parcelIncome({ parcelId: "P2", pickedUp: true, itemCost: 99 })).toMatchObject({ codAmount: null, total: 0, recipient: "-", status: "Picked up" });
    });
});
