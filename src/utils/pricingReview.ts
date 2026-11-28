/**
 * Delivery pricing review (stage 2): propose a station's prices from what deliveries really cost
 * (rider GPS: km driven and time) plus a target margin, checked against whether customers accept
 * the price. Staff overrides are reported as a check, not used to set prices.
 */
import type { DeliveryPriceTable } from "./deliveryPricing";

export interface BandStats {
    /** "band:3" for the band ending at 3 km, "zone:East Legon" for a zone. */
    key: string;
    label: string;
    kind: "BAND" | "ZONE";
    /** Band upper km, or zone name, to write the price back to the table. */
    upToKm?: number;
    zoneName?: string;
    deliveries: number;
    /** Median price the table suggested, and median actually charged. */
    suggestedMedian: number;
    chargedMedian: number;
    overrides: number;
    overrideReasons: Record<string, number>;
    /** Per delivery, from rider GPS: km driven (the delivery's share of its trip) and minutes. */
    avgKmDriven: number;
    avgMinutes: number;
    /** Customer delivery bookings: quotes shown and quotes booked. */
    quotesShown: number;
    quotesBooked: number;
}

export interface StaffStats {
    userId: string;
    name: string;
    parcels: number;
    overrides: number;
    /** Average (charged − suggested) on their overrides. */
    avgDifference: number;
}

export interface PricingReview {
    officeId: string;
    officeName: string;
    from: string;
    to: string;
    table: DeliveryPriceTable | null;
    /** Prices, overrides and bookings count only deliveries priced with this table version. */
    statsTableVersion?: number;
    /** When that version took effect (ms), so a new version shows how much data it has so far. */
    statsSince?: number;
    bands: BandStats[];
    staff: StaffStats[];
}

export interface CostSettings {
    /** Fuel + maintenance per km driven (GHC). */
    costPerKm: number;
    /** Rider pay per hour on the road (GHC). */
    riderCostPerHour: number;
    /** e.g. 0.25 for 25%. */
    targetMargin: number;
    /** Bands with fewer deliveries keep their price. */
    minDeliveries: number;
    /** Acceptance is only judged with at least this many quotes. */
    minQuotes: number;
    roundTo: number;
}

export const DEFAULT_COST_SETTINGS: CostSettings = { costPerKm: 0.9, riderCostPerHour: 12, targetMargin: 0.25, minDeliveries: 30, minQuotes: 10, roundTo: 1 };

export type ProposalReason = "NOT_ENOUGH_DATA" | "BELOW_COST" | "LOW_ACCEPTANCE" | "KEEP";

export interface BandProposal {
    stats: BandStats;
    current: number;
    cost: number;
    floor: number;
    /** Margin at the current price, e.g. 0.4 = 40% over cost. */
    currentMargin: number;
    acceptance?: number;
    overrideRate: number;
    topOverrideReason?: string;
    proposed: number;
    reason: ProposalReason;
    explanation: string;
    /** Staff often charge differently: worth a look, not applied automatically. */
    checkStaff: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const up = (n: number, step: number) => (step > 0 ? Math.ceil(n / step - 1e-9) * step : r2(n));
const pct = (n: number) => `${Math.round(n * 100)}%`;
const money = (n: number) => `GHC ${n.toFixed(2)}`;

export const deliveryCost = (s: BandStats, c: CostSettings) => r2(s.avgKmDriven * c.costPerKm + (s.avgMinutes / 60) * c.riderCostPerHour);

/** The current price for a band or zone in the table. */
export const currentPrice = (t: DeliveryPriceTable | null, s: BandStats) => {
    if (!t) return s.suggestedMedian;
    if (s.kind === "ZONE") return t.zones?.find((z) => z.name === s.zoneName)?.price ?? s.suggestedMedian;
    return t.bands.find((b) => b.upToKm === s.upToKm)?.price ?? s.suggestedMedian;
};

export const proposeBand = (s: BandStats, current: number, c: CostSettings): BandProposal => {
    const cost = deliveryCost(s, c);
    const floor = r2(cost * (1 + c.targetMargin));
    const acceptance = s.quotesShown >= c.minQuotes ? s.quotesBooked / s.quotesShown : undefined;
    const overrideRate = s.deliveries ? s.overrides / s.deliveries : 0;
    const topOverrideReason = Object.entries(s.overrideReasons).sort((a, b) => b[1] - a[1])[0]?.[0];
    const checkStaff = s.deliveries >= c.minDeliveries && overrideRate >= 0.3;
    const base = { stats: s, current, cost, floor, currentMargin: cost > 0 ? r2(current / cost - 1) : 0, acceptance, overrideRate, topOverrideReason, checkStaff };

    if (s.deliveries < c.minDeliveries) {
        return { ...base, proposed: current, reason: "NOT_ENOUGH_DATA", explanation: `Only ${s.deliveries} deliveries; waiting for ${c.minDeliveries} before changing it.` };
    }
    if (current < floor) {
        const proposed = up(floor, c.roundTo);
        return { ...base, proposed, reason: "BELOW_COST", explanation: `Costs about ${money(cost)} per delivery; ${money(current)} is under cost + ${pct(c.targetMargin)} margin.` };
    }
    if (acceptance !== undefined && acceptance < 0.5) {
        const proposed = Math.max(up(floor, c.roundTo), up((current + floor) / 2, c.roundTo));
        if (proposed < current) {
            return { ...base, proposed, reason: "LOW_ACCEPTANCE", explanation: `Only ${pct(acceptance)} of customers who saw the price booked; lowering towards cost + margin (${money(floor)}).` };
        }
    }
    return {
        ...base,
        proposed: current,
        reason: "KEEP",
        explanation: `Covers cost + margin${acceptance !== undefined ? ` and ${pct(acceptance)} of customers book` : ""}.`,
    };
};

/** Proposals for every band and zone; band prices never drop as distance grows. */
export const proposeAll = (review: PricingReview, c: CostSettings): BandProposal[] => {
    const props = review.bands.map((s) => proposeBand(s, currentPrice(review.table, s), c));
    const bands = props.filter((p) => p.stats.kind === "BAND").sort((a, b) => (a.stats.upToKm ?? 0) - (b.stats.upToKm ?? 0));
    for (let i = 1; i < bands.length; i++) {
        if (bands[i].proposed < bands[i - 1].proposed) {
            bands[i].proposed = bands[i - 1].proposed;
            bands[i].explanation += ` Raised to ${money(bands[i].proposed)} so it isn't cheaper than a shorter band.`;
        }
    }
    return props;
};

/** The table with the proposed prices written in (a new version once saved). */
export const applyProposals = (t: DeliveryPriceTable, props: BandProposal[]): DeliveryPriceTable => ({
    ...t,
    bands: t.bands.map((b) => {
        const p = props.find((x) => x.stats.kind === "BAND" && x.stats.upToKm === b.upToKm);
        return p ? { ...b, price: p.proposed } : b;
    }),
    zones: (t.zones ?? []).map((z) => {
        const p = props.find((x) => x.stats.kind === "ZONE" && x.stats.zoneName === z.name);
        return p ? { ...z, price: p.proposed } : z;
    }),
});

/** Staff whose override rate is at least twice the station's, with enough parcels to judge. */
export const staffToCheck = (staff: StaffStats[], minParcels = 20) => {
    const total = staff.reduce((s, x) => s + x.parcels, 0);
    const rate = total ? staff.reduce((s, x) => s + x.overrides, 0) / total : 0;
    return staff.filter((x) => x.parcels >= minParcels && rate > 0 && x.overrides / x.parcels >= 2 * rate).map((x) => x.userId);
};
