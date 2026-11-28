import { describe, it, expect } from "vitest";
import { amountToCollect, collectBreakdown } from "./collectAmount";

describe("amountToCollect", () => {
    it("adds fees and the POD item value", () => {
        expect(amountToCollect({ deliveryCost: 20, inboundCost: 10, storageCost: 5, pod: true, itemCost: 300 })).toBe(335);
    });
    it("takes off what the customer paid online", () => {
        expect(collectBreakdown({ deliveryCost: 20, inboundCost: 10, prepaidAmount: 30 })).toEqual({ fees: 30, pod: 0, prepaid: 30, toCollect: 0 });
        expect(amountToCollect({ deliveryCost: 25, pod: true, itemCost: 150, deliveryPrepaidAmount: 25 })).toBe(150);
    });
    it("never goes below zero and handles the API's other spellings", () => {
        expect(amountToCollect({ deliveryCost: 10, prepaidAmount: 50 })).toBe(0);
        expect(amountToCollect({ deliveryCost: 10, POD: true, ItemCost: 90 })).toBe(100);
        expect(amountToCollect({ parcelAmount: 45 })).toBe(45);
    });
});
