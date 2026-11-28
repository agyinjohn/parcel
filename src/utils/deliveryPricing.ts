/**
 * Distance-based delivery pricing (stage 1). Each station has a price table set by its manager:
 * a distance price (bands, or base fee + per km), a weight surcharge and an optional fragile fee.
 * The backend quotes with the road distance from Google; the frontend uses the same maths for
 * previews and as a fallback, with straight-line distance × ROAD_FACTOR.
 */

export interface DistanceBand {
    /** Up to and including this many km. */
    upToKm: number;
    price: number;
}

export interface WeightBand {
    /** Heavier than this many kg… */
    overKg: number;
    /** …adds this much. The highest matching band applies (bands don't add up). */
    surcharge: number;
}

export interface DeliveryPriceTable {
    mode: "BANDS" | "PER_KM";
    /** BANDS: price by distance band. Past the last band, `perKmBeyond` per extra km. */
    bands: DistanceBand[];
    perKmBeyond: number;
    /** PER_KM: baseFee + perKm × km, at least minFee. */
    baseFee: number;
    perKm: number;
    minFee: number;
    weightBands: WeightBand[];
    fragileFee: number;
    /** Round the total up to this step (e.g. 1 or 5 cedis). 0 = no rounding. */
    roundTo: number;
    /** Set by the server on save; parcels record which version priced them. */
    version?: number;
    updatedAt?: number;
    updatedByName?: string;
}

export const DEFAULT_PRICE_TABLE: DeliveryPriceTable = {
    mode: "BANDS",
    bands: [
        { upToKm: 3, price: 15 },
        { upToKm: 6, price: 20 },
        { upToKm: 10, price: 25 },
        { upToKm: 15, price: 35 },
    ],
    perKmBeyond: 2,
    baseFee: 10,
    perKm: 2,
    minFee: 15,
    weightBands: [
        { overKg: 5, surcharge: 5 },
        { overKg: 10, surcharge: 10 },
        { overKg: 20, surcharge: 20 },
    ],
    fragileFee: 0,
    roundTo: 1,
};

/** Roads in Accra are roughly 1.35× the straight line; used only when the road distance isn't known. */
export const ROAD_FACTOR = 1.35;

export const straightLineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

export const estimateRoadKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    Math.round(straightLineKm(a, b) * ROAD_FACTOR * 10) / 10;

export interface PriceLine {
    label: string;
    amount: number;
}

export interface PriceQuote {
    distanceKm: number;
    distanceSource: "ROAD" | "ESTIMATE";
    lines: PriceLine[];
    price: number;
    tableVersion?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const distancePrice = (t: DeliveryPriceTable, km: number): { amount: number; label: string } => {
    if (t.mode === "PER_KM") {
        const raw = t.baseFee + t.perKm * km;
        return { amount: r2(Math.max(t.minFee, raw)), label: `Distance (${km} km)` };
    }
    const bands = [...t.bands].filter((b) => b.upToKm > 0).sort((a, b) => a.upToKm - b.upToKm);
    if (!bands.length) return { amount: 0, label: `Distance (${km} km)` };
    const band = bands.find((b) => km <= b.upToKm);
    if (band) {
        const i = bands.indexOf(band);
        const from = i === 0 ? 0 : bands[i - 1].upToKm;
        return { amount: band.price, label: `Distance ${from}–${band.upToKm} km (${km} km)` };
    }
    const last = bands[bands.length - 1];
    const extra = Math.ceil(km - last.upToKm);
    return { amount: r2(last.price + extra * (t.perKmBeyond || 0)), label: `Distance over ${last.upToKm} km (${km} km)` };
};

export const weightSurcharge = (t: DeliveryPriceTable, kg?: number) => {
    if (!kg || kg <= 0) return 0;
    const hit = [...t.weightBands].filter((w) => kg > w.overKg).sort((a, b) => b.overKg - a.overKg)[0];
    return hit ? hit.surcharge : 0;
};

const roundUp = (n: number, step: number) => (step > 0 ? Math.ceil(n / step - 1e-9) * step : n);

/** Price a delivery from a table. `distanceKm` is road km when known. */
export const quoteFromTable = (
    t: DeliveryPriceTable,
    distanceKm: number,
    opts: { weightKg?: number; fragile?: boolean; distanceSource?: "ROAD" | "ESTIMATE" } = {},
): PriceQuote => {
    const km = Math.round(distanceKm * 10) / 10;
    const d = distancePrice(t, km);
    const lines: PriceLine[] = [{ label: d.label, amount: d.amount }];
    const w = weightSurcharge(t, opts.weightKg);
    if (w > 0) lines.push({ label: `Weight (${opts.weightKg} kg)`, amount: w });
    if (opts.fragile && t.fragileFee > 0) lines.push({ label: "Fragile handling", amount: t.fragileFee });
    const sum = lines.reduce((s, l) => s + l.amount, 0);
    const price = r2(roundUp(sum, t.roundTo));
    if (price > sum + 1e-9) lines.push({ label: "Rounding", amount: r2(price - sum) });
    return { distanceKm: km, distanceSource: opts.distanceSource ?? "ROAD", lines, price, tableVersion: t.version };
};

/** Problems that stop a table being saved. */
export const validateTable = (t: DeliveryPriceTable): string[] => {
    const errs: string[] = [];
    const num = (n: number) => Number.isFinite(n) && n >= 0;
    if (t.mode === "BANDS") {
        if (!t.bands.length) errs.push("Add at least one distance band.");
        const sorted = [...t.bands].sort((a, b) => a.upToKm - b.upToKm);
        sorted.forEach((b, i) => {
            if (!(b.upToKm > 0)) errs.push("Each band needs a distance above 0 km.");
            if (!(b.price > 0)) errs.push("Each band needs a price above 0.");
            if (i > 0 && b.upToKm === sorted[i - 1].upToKm) errs.push(`Two bands end at ${b.upToKm} km.`);
            if (i > 0 && b.price < sorted[i - 1].price) errs.push(`The ${b.upToKm} km band is cheaper than a shorter one.`);
        });
        if (!num(t.perKmBeyond)) errs.push("Price per km beyond the last band can't be negative.");
    } else {
        if (!num(t.baseFee) || !num(t.perKm) || !num(t.minFee)) errs.push("Fees can't be negative.");
        if (!(t.baseFee > 0 || t.perKm > 0 || t.minFee > 0)) errs.push("Set a base fee, a price per km or a minimum.");
    }
    t.weightBands.forEach((w) => {
        if (!(w.overKg > 0) || !(w.surcharge >= 0)) errs.push("Weight bands need a weight above 0 kg and a surcharge of 0 or more.");
    });
    if (!num(t.fragileFee) || !num(t.roundTo)) errs.push("Fragile fee and rounding can't be negative.");
    return Array.from(new Set(errs));
};

/** Why staff charged something other than the suggested price. Stage 2 learns from these. */
export const OVERRIDE_REASONS = [
    { value: "BULKY", label: "Bulky or awkward to carry" },
    { value: "HARD_TO_REACH", label: "Hard-to-reach area" },
    { value: "REGULAR_CUSTOMER", label: "Regular customer or agreed rate" },
    { value: "PROMOTION", label: "Promotion or discount" },
    { value: "WRONG_PIN", label: "Pin is not exactly where we deliver" },
    { value: "OTHER", label: "Other (explain in notes)" },
] as const;
export type OverrideReason = (typeof OVERRIDE_REASONS)[number]["value"];
