import { describe, it, expect } from "vitest";
import { counterCharges, sumCharges, buildCounterPayment, cashUpTotals, initialPickupFee, type CounterPaymentInput } from "./counterPickup";

const base: CounterPaymentInput = { received: "", method: "", momoReference: "", reason: "", note: "" };

describe("counterCharges", () => {
    it("charges inbound, storage, pickup fee and POD item value, but not delivery", () => {
        const lines = counterCharges({ inboundCost: 20, storageCost: 5, pickUpCost: 10, itemCost: 250, pod: true, ...{ deliveryCost: 30 } } as any);
        expect(lines.map((l) => l.key)).toEqual(["inbound", "storage", "pickup", "pod"]);
        expect(sumCharges(lines)).toBe(285);
    });
    it("skips zero and non-POD item value", () => {
        expect(counterCharges({ inboundCost: 15, storageCost: 0, itemCost: 300, pod: false })).toEqual([{ key: "inbound", label: "Inbound", amount: 15 }]);
    });
});

describe("initialPickupFee", () => {
    it("prefers the parcel's own fee, then the station charge, else none", () => {
        expect(initialPickupFee({ pickUpCost: 12 }, { pickupChargeEnabled: true, pickupChargeAmount: 10 })).toEqual({ fee: 12, source: "parcel" });
        expect(initialPickupFee({ pickUpCost: 0 }, { pickupChargeEnabled: true, pickupChargeAmount: 10 })).toEqual({ fee: 10, source: "station" });
        expect(initialPickupFee({}, { pickupChargeEnabled: false, pickupChargeAmount: 10 })).toBeNull();
        expect(initialPickupFee({}, null)).toBeNull();
    });
});

describe("buildCounterPayment", () => {
    const charges = counterCharges({ inboundCost: 20, pickUpCost: 10 });
    it("needs a payment method when money is taken", () => {
        expect(buildCounterPayment(charges, base).problem).toMatch(/how the customer paid/);
        expect(buildCounterPayment(charges, { ...base, method: "CASH" }).payment).toMatchObject({ amountDue: 30, amountPaid: 30, varianceAmount: 0, paymentMethod: "CASH" });
    });
    it("needs the MoMo transaction ID", () => {
        expect(buildCounterPayment(charges, { ...base, method: "MOMO" }).problem).toMatch(/transaction ID/);
        expect(buildCounterPayment(charges, { ...base, method: "MOMO", momoReference: " 4471 " }).payment).toMatchObject({ momoReference: "4471" });
    });
    it("needs a reason for a difference, and a note for Other", () => {
        expect(buildCounterPayment(charges, { ...base, method: "CASH", received: "25" }).problem).toMatch(/reason/);
        expect(buildCounterPayment(charges, { ...base, method: "CASH", received: "25", reason: "Other" }).problem).toMatch(/note/);
        expect(buildCounterPayment(charges, { ...base, method: "CASH", received: "25", reason: "Customer paid less" }).payment).toMatchObject({ amountPaid: 25, varianceAmount: -5, varianceReason: "Customer paid less" });
    });
    it("allows a fully waived charge with no method", () => {
        const r = buildCounterPayment(charges, { ...base, received: "0", reason: "Charge waived by manager" });
        expect(r.payment).toMatchObject({ amountPaid: 0, varianceAmount: -30 });
        expect(r.payment?.paymentMethod).toBeUndefined();
    });
    it("needs nothing when nothing is owed", () => {
        expect(buildCounterPayment([], base).payment).toMatchObject({ amountDue: 0, amountPaid: 0, varianceAmount: 0 });
    });
    it("rejects junk", () => {
        expect(buildCounterPayment(charges, { ...base, received: "abc" }).problem).toMatch(/valid amount/);
    });
});

describe("cashUpTotals", () => {
    it("splits cash and MoMo and counts shortfalls", () => {
        const t = cashUpTotals([
            { parcelId: "A", pickedUpAt: 1, amountDue: 30, amountPaid: 30, varianceAmount: 0, paymentMethod: "CASH" },
            { parcelId: "B", pickedUpAt: 2, amountDue: 40, amountPaid: 35, varianceAmount: -5, paymentMethod: "MOMO" },
            { parcelId: "C", pickedUpAt: 3, amountDue: 10, amountPaid: 0, varianceAmount: -10 },
        ]);
        expect(t).toEqual({ count: 3, due: 80, paid: 65, cash: 30, momo: 35, variance: -15, short: 2 });
    });
});
