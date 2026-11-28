/**
 * What a rider (or the counter) should collect for one parcel: its fees, plus the item value on
 * pay-on-delivery parcels, minus anything the customer already paid online when booking delivery.
 * One rule for the rider app, Active Deliveries and reconciliation, so they can't disagree.
 */
export interface CollectableParcel {
    deliveryCost?: number | null;
    pickUpCost?: number | null;
    inboundCost?: number | null;
    storageCost?: number | null;
    pod?: boolean | null;
    POD?: boolean | null;
    itemCost?: number | null;
    ItemCost?: number | null;
    /** Paid online with the customer's delivery booking (ParcelInfo.prepaidAmount / Parcel.deliveryPrepaidAmount). */
    prepaidAmount?: number | null;
    deliveryPrepaidAmount?: number | null;
    parcelAmount?: number | null;
}

const pos = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export const prepaidOf = (p: CollectableParcel) => pos(p.prepaidAmount ?? p.deliveryPrepaidAmount);
export const podValueOf = (p: CollectableParcel) => ((p.pod ?? p.POD) ? pos(p.itemCost ?? p.ItemCost) : 0);

export const collectBreakdown = (p: CollectableParcel) => {
    const fees = pos(p.deliveryCost) + pos(p.pickUpCost) + pos(p.inboundCost) + pos(p.storageCost);
    // Some responses only carry the total.
    const base = fees || pos(p.parcelAmount);
    const pod = podValueOf(p);
    const prepaid = Math.min(prepaidOf(p), base + pod);
    return { fees: r2(base), pod: r2(pod), prepaid: r2(prepaid), toCollect: r2(Math.max(0, base + pod - prepaid)) };
};

export const amountToCollect = (p: CollectableParcel) => collectBreakdown(p).toCollect;
