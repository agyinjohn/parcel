import { describe, it, expect } from "vitest";
import { DEFAULT_COST_SETTINGS as C, applyProposals, deliveryCost, proposeAll, proposeBand, staffToCheck, type BandStats, type PricingReview } from "./pricingReview";
import { DEFAULT_PRICE_TABLE } from "./deliveryPricing";

const band = (over: Partial<BandStats>): BandStats => ({
    key: "band:3", label: "0–3 km", kind: "BAND", upToKm: 3, deliveries: 100, suggestedMedian: 15, chargedMedian: 15,
    overrides: 5, overrideReasons: {}, avgKmDriven: 2.4, avgMinutes: 18, quotesShown: 50, quotesBooked: 40, ...over,
});

describe("proposeBand", () => {
    it("costs a delivery from km driven and rider time", () => {
        expect(deliveryCost(band({}), C)).toBe(5.76); // 2.4×0.9 + 0.3h×12
    });
    it("keeps a price that covers cost and that customers accept", () => {
        expect(proposeBand(band({}), 15, C)).toMatchObject({ proposed: 15, reason: "KEEP" });
    });
    it("raises a price below cost + margin", () => {
        const p = proposeBand(band({ avgKmDriven: 16.5, avgMinutes: 70 }), 35, C); // cost 28.85, floor 36.06
        expect(p).toMatchObject({ reason: "BELOW_COST", proposed: 37 });
    });
    it("lowers towards cost + margin when few customers book, never below it", () => {
        const p = proposeBand(band({ avgKmDriven: 9.4, avgMinutes: 38, quotesShown: 30, quotesBooked: 12 }), 25, C); // floor ≈20.08
        expect(p).toMatchObject({ reason: "LOW_ACCEPTANCE", proposed: 23 });
    });
    it("doesn't judge acceptance on a handful of quotes, or change bands with little data", () => {
        expect(proposeBand(band({ quotesShown: 5, quotesBooked: 0 }), 15, C).reason).toBe("KEEP");
        expect(proposeBand(band({ deliveries: 12, avgKmDriven: 30 }), 15, C)).toMatchObject({ reason: "NOT_ENOUGH_DATA", proposed: 15 });
    });
    it("flags frequent overrides for a check without acting on them", () => {
        const p = proposeBand(band({ overrides: 40, overrideReasons: { HARD_TO_REACH: 30, BULKY: 10 } }), 15, C);
        expect(p).toMatchObject({ checkStaff: true, topOverrideReason: "HARD_TO_REACH", proposed: 15 });
    });
});

describe("proposeAll / applyProposals / staffToCheck", () => {
    it("keeps band prices rising with distance and writes them into the table", () => {
        const review: PricingReview = {
            officeId: "o", officeName: "O", from: "", to: "", table: DEFAULT_PRICE_TABLE, staff: [],
            bands: [band({ avgKmDriven: 6, avgMinutes: 60 }), band({ key: "band:6", upToKm: 6, label: "3–6 km" })],
        };
        const props = proposeAll(review, C); // band 3 → raised above 20; band 6 (20) must not be cheaper
        expect(props[0].proposed).toBe(22);
        expect(props[1].proposed).toBe(22);
        const t = applyProposals(DEFAULT_PRICE_TABLE, props);
        expect(t.bands.slice(0, 2).map((b) => b.price)).toEqual([22, 22]);
    });
    it("picks staff overriding at twice the station rate", () => {
        expect(staffToCheck([
            { userId: "a", name: "A", parcels: 100, overrides: 5, avgDifference: 2 },
            { userId: "b", name: "B", parcels: 50, overrides: 20, avgDifference: -6 },
            { userId: "c", name: "C", parcels: 5, overrides: 5, avgDifference: 3 },
        ])).toEqual(["b"]);
    });
});
