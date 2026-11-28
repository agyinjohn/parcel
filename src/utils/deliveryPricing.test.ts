import { describe, it, expect } from "vitest";
import { DEFAULT_PRICE_TABLE as T, estimateRoadKm, quoteFromTable, validateTable, weightSurcharge, zoneFor } from "./deliveryPricing";

describe("quoteFromTable (bands)", () => {
    it("prices by the band the distance falls in", () => {
        expect(quoteFromTable(T, 2).price).toBe(15);
        expect(quoteFromTable(T, 3).price).toBe(15);
        expect(quoteFromTable(T, 3.1).price).toBe(20);
        expect(quoteFromTable(T, 14.9).price).toBe(35);
    });
    it("adds per-km beyond the last band, by whole km", () => {
        expect(quoteFromTable(T, 17.2).price).toBe(35 + 3 * 2);
    });
    it("adds the heaviest matching weight surcharge only", () => {
        const q = quoteFromTable(T, 4, { weightKg: 12 });
        expect(q.lines.map((l) => l.amount)).toEqual([20, 10]);
        expect(q.price).toBe(30);
        expect(weightSurcharge(T, 5)).toBe(0);
        expect(weightSurcharge(T, 5.1)).toBe(5);
    });
    it("adds the fragile fee and rounds up", () => {
        const q = quoteFromTable({ ...T, fragileFee: 2.5, roundTo: 5 }, 1, { fragile: true });
        expect(q.price).toBe(20);
        expect(q.lines[q.lines.length - 1]).toEqual({ label: "Rounding", amount: 2.5 });
    });
});

describe("quoteFromTable (per km)", () => {
    it("uses base + per km with a minimum", () => {
        const t = { ...T, mode: "PER_KM" as const, baseFee: 10, perKm: 2, minFee: 15 };
        expect(quoteFromTable(t, 1).price).toBe(15);
        expect(quoteFromTable(t, 8).price).toBe(26);
    });
});

describe("estimateRoadKm / validateTable", () => {
    it("estimates road distance from the straight line", () => {
        // Accra Central → East Legon is about 9.5 km in a straight line.
        const km = estimateRoadKm({ lat: 5.5571, lng: -0.2058 }, { lat: 5.6370, lng: -0.1650 });
        expect(km).toBeGreaterThan(11);
        expect(km).toBeLessThan(14);
    });
    it("flags broken tables", () => {
        expect(validateTable(T)).toEqual([]);
        expect(validateTable({ ...T, bands: [{ upToKm: 3, price: 20 }, { upToKm: 6, price: 15 }] })).toContain("The 6 km band is cheaper than a shorter one.");
        expect(validateTable({ ...T, bands: [] })).toContain("Add at least one distance band.");
    });
});

describe("zones", () => {
    const Z = {
        ...T,
        zones: [
            { name: "East Legon", lat: 5.637, lng: -0.165, radiusKm: 3, price: 20 },
            { name: "A&C Mall", lat: 5.637, lng: -0.165, radiusKm: 0.5, price: 18 },
        ],
    };
    it("uses the smallest zone containing the pin, plus weight", () => {
        const q = quoteFromTable(Z, 13.5, { pin: { lat: 5.6372, lng: -0.1651 }, weightKg: 6 });
        expect(q.zone).toBe("A&C Mall");
        expect(q.lines.map((l) => l.amount)).toEqual([18, 5]);
        expect(zoneFor(Z, { lat: 5.65, lng: -0.165 })?.name).toBe("East Legon");
    });
    it("falls back to distance outside every zone", () => {
        const q = quoteFromTable(Z, 13.5, { pin: { lat: 5.55, lng: -0.25 } });
        expect(q.zone).toBeUndefined();
        expect(q.price).toBe(35);
    });
    it("validates zones", () => {
        expect(validateTable({ ...Z, zones: [{ name: "", lat: 5, lng: 0, radiusKm: 0, price: 0 }] })).toEqual(
            expect.arrayContaining(["Each zone needs a name.", "Zone needs a radius above 0 km.", "Zone needs a price above 0."]),
        );
    });
});
