/**
 * Active Deliveries: turn rider assignments (GET /api-frontdesk/parcel-assignment) into
 * riders with the parcels they still have out. Only parcels not yet delivered or returned
 * count, and the assignment's real status (ASSIGNED / ACCEPTED / PICKED_UP) is kept.
 */

export const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "PICKED_UP"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

export const STATUS_LABEL: Record<ActiveStatus, string> = {
    ASSIGNED: "Waiting for rider",
    ACCEPTED: "Accepted by rider",
    PICKED_UP: "Out for delivery",
};

export interface ActiveParcel {
    key: string;
    assignmentId: string;
    parcelId: string;
    status: ActiveStatus;
    assignedAt?: number;
    acceptedAt?: number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    locationName?: string;
    lat?: number;
    lng?: number;
    description?: string;
    homeDelivery?: boolean;
    shelfName?: string;
    charges: { label: string; amount: number }[];
    /** Item value collected for the sender on cash-on-delivery parcels. */
    podAmount: number;
    /** Everything the rider should hand in for this parcel. */
    toCollect: number;
}

export interface ActiveRider {
    riderId: string;
    name: string;
    phone?: string;
    parcels: ActiveParcel[];
    counts: Record<ActiveStatus, number>;
    toCollect: number;
    oldestAssignedAt?: number;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export const toActiveParcel = (a: any, p: any): ActiveParcel => {
    const charges = [
        { label: "Delivery fee", amount: num(p.deliveryCost) },
        { label: "Inbound", amount: num(p.inboundCost) },
        { label: "Storage", amount: num(p.storageCost) },
        { label: "Pickup fee", amount: num(p.pickUpCost) },
    ].filter((c) => c.amount > 0);
    const podAmount = p.pod ? num(p.itemCost) : 0;
    const costs = charges.reduce((s, c) => s + c.amount, 0);
    return {
        key: `${a.assignmentId}:${p.parcelId}`,
        assignmentId: a.assignmentId,
        parcelId: p.parcelId,
        status: a.status,
        assignedAt: a.assignedAt,
        acceptedAt: a.acceptedAt,
        receiverName: p.receiverName,
        receiverPhone: p.receiverPhoneNumber ?? p.recieverPhoneNumber,
        receiverAddress: p.receiverAddress ?? p.deliveryAddress,
        locationName: p.receiverLocationName,
        lat: p.receiverLatitude ?? undefined,
        lng: p.receiverLongitude ?? undefined,
        description: p.parcelDescription,
        homeDelivery: p.homeDelivery,
        shelfName: p.shelfName,
        charges,
        podAmount,
        // Some responses only carry the total.
        toCollect: round2((costs || num(p.parcelAmount)) + podAmount),
    };
};

/** Group active parcels by rider; riders with the most parcels first. */
export const groupActive = (assignments: any[]): ActiveRider[] => {
    const byRider = new Map<string, ActiveRider>();
    const seen = new Set<string>();
    assignments.forEach((a) => {
        if (!ACTIVE_STATUSES.includes(a?.status)) return;
        const riderId = a.riderInfo?.riderId ?? a.riderId ?? "unknown";
        (a.parcels ?? []).forEach((p: any) => {
            if (!p?.parcelId || p.delivered === true || p.returned === true || p.pickedUp === true) return;
            const item = toActiveParcel(a, p);
            if (seen.has(item.key)) return;
            seen.add(item.key);
            let r = byRider.get(riderId);
            if (!r) {
                r = { riderId, name: a.riderInfo?.riderName ?? a.riderName ?? "Unknown rider", phone: a.riderInfo?.riderPhoneNumber ?? a.riderPhoneNumber, parcels: [], counts: { ASSIGNED: 0, ACCEPTED: 0, PICKED_UP: 0 }, toCollect: 0 };
                byRider.set(riderId, r);
            }
            r.parcels.push(item);
            r.counts[item.status]++;
            r.toCollect = round2(r.toCollect + item.toCollect);
            if (item.assignedAt && (!r.oldestAssignedAt || item.assignedAt < r.oldestAssignedAt)) r.oldestAssignedAt = item.assignedAt;
        });
    });
    const riders = Array.from(byRider.values());
    riders.forEach((r) => r.parcels.sort((x, y) => (x.assignedAt ?? 0) - (y.assignedAt ?? 0)));
    return riders.sort((a, b) => b.parcels.length - a.parcels.length || a.name.localeCompare(b.name));
};

/** "3 h ago", "2 days ago" — and whether it's been out long enough to chase. */
export const sinceAssigned = (t?: number, now = Date.now()) => {
    if (!t) return { text: "", stale: false };
    const h = (now - t) / 3_600_000;
    const text = h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 24 ? `${Math.round(h)} h ago` : `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
    return { text, stale: h >= 24 };
};
