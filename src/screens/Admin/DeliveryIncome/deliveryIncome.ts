/** Helpers for the Delivery Income page (figures from the admin dashboard and parcels APIs). */

export type Settlement = "settled" | "partial" | "unsettled";

/** How much of a rider's delivery revenue has been handed in at reconciliation. */
export const settlementStatus = (revenue: number, outstanding: number): Settlement => {
    if (!(outstanding > 0)) return "settled";
    return outstanding < revenue ? "partial" : "unsettled";
};

export const SETTLEMENT_LABEL: Record<Settlement, string> = {
    settled: "Settled",
    partial: "Partly settled",
    unsettled: "Not settled",
};

export interface DeliveredParcelRow {
    parcelId: string;
    recipient: string;
    officeId?: string;
    stationName?: string;
    riderName?: string;
    deliveryFee: number;
    /** Item value collected for the sender on cash-on-delivery parcels; null when not POD. */
    codAmount: number | null;
    total: number;
    status: "Delivered" | "Picked up";
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Maps a Parcel from GET /api-admin/parcels to a row of the delivered-parcels table. */
export const parcelIncome = (p: Record<string, any>): DeliveredParcelRow => {
    const deliveryFee = num(p.deliveryCost);
    return {
        parcelId: String(p.parcelId ?? ""),
        recipient: p.receiverName || "-",
        officeId: p.officeId,
        stationName: p.riderInfo?.stationName,
        riderName: p.riderInfo?.riderName,
        deliveryFee,
        codAmount: p.pod ? num(p.itemCost) : null,
        total: num(p.inboundCost) + deliveryFee + num(p.storageCost) + num(p.pickUpCost),
        status: p.pickedUp ? "Picked up" : "Delivered",
    };
};
