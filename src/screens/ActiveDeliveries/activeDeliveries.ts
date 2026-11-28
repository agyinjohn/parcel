import { collectBreakdown } from "../../utils/collectAmount";
/**
 * Active Deliveries: turn rider assignments (GET /api-frontdesk/parcel-assignment) into
 * riders with the parcels they still have out. Only parcels not yet delivered or returned count.
 * Riders don't accept assignments: once assigned, a parcel is out for delivery, so ASSIGNED,
 * ACCEPTED and PICKED_UP are all treated the same.
 */

export const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "PICKED_UP"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];


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
    /** Other active assignments that also hold this parcel (a duplicate assignment). */
    alsoWith?: { assignmentId: string; riderName: string }[];
}

export interface ActiveRider {
    riderId: string;
    name: string;
    phone?: string;
    parcels: ActiveParcel[];
    /** Parcels out for a day or more. */
    overdue: number;
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
    const { pod: podAmount, prepaid, toCollect } = collectBreakdown(p);
    if (prepaid > 0) charges.push({ label: "Paid online", amount: -prepaid });
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
        toCollect,
    };
};

/**
 * Group active parcels by rider; riders with the most parcels first.
 * A parcel on more than one active assignment (a duplicate) is listed once, under its newest
 * assignment, with the others in `alsoWith`, so it isn't counted or collected twice.
 */
export const groupActive = (assignments: any[], now = Date.now()): ActiveRider[] => {
    type Entry = { a: any; item: ActiveParcel; riderId: string; riderName: string; phone?: string };
    const byParcel = new Map<string, Entry[]>();
    assignments.forEach((a) => {
        if (!ACTIVE_STATUSES.includes(a?.status)) return;
        const riderId = a.riderInfo?.riderId ?? a.riderId ?? "unknown";
        const riderName = a.riderInfo?.riderName ?? a.riderName ?? "Unknown rider";
        (a.parcels ?? []).forEach((p: any) => {
            if (!p?.parcelId || p.delivered === true || p.returned === true || p.pickedUp === true) return;
            const list = byParcel.get(p.parcelId) ?? [];
            if (list.some((e) => e.a.assignmentId === a.assignmentId)) return;
            list.push({ a, item: toActiveParcel(a, p), riderId, riderName, phone: a.riderInfo?.riderPhoneNumber ?? a.riderPhoneNumber });
            byParcel.set(p.parcelId, list);
        });
    });

    const byRider = new Map<string, ActiveRider>();
    byParcel.forEach((entries) => {
        entries.sort((x, y) => (y.a.assignedAt ?? 0) - (x.a.assignedAt ?? 0));
        const [main, ...others] = entries;
        const item = others.length
            ? { ...main.item, alsoWith: others.map((o) => ({ assignmentId: o.a.assignmentId, riderName: o.riderName })) }
            : main.item;
        let r = byRider.get(main.riderId);
        if (!r) {
            r = { riderId: main.riderId, name: main.riderName, phone: main.phone, parcels: [], overdue: 0, toCollect: 0 };
            byRider.set(main.riderId, r);
        }
        r.parcels.push(item);
        if (sinceAssigned(item.assignedAt, now).stale) r.overdue++;
        r.toCollect = round2(r.toCollect + item.toCollect);
        if (item.assignedAt && (!r.oldestAssignedAt || item.assignedAt < r.oldestAssignedAt)) r.oldestAssignedAt = item.assignedAt;
    });
    const riders = Array.from(byRider.values());
    riders.forEach((r) => r.parcels.sort((x, y) => (x.assignedAt ?? 0) - (y.assignedAt ?? 0)));
    return riders.sort((a, b) => b.parcels.length - a.parcels.length || a.name.localeCompare(b.name));
};

/** How many parcels are on more than one active assignment. */
export const duplicateCount = (riders: ActiveRider[]) => riders.reduce((n, r) => n + r.parcels.filter((p) => p.alsoWith?.length).length, 0);

/** "3 h ago", "2 days ago" — and whether it's been out long enough to chase. */
export const sinceAssigned = (t?: number, now = Date.now()) => {
    if (!t) return { text: "", stale: false };
    const h = (now - t) / 3_600_000;
    const text = h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 24 ? `${Math.round(h)} h ago` : `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? "" : "s"} ago`;
    return { text, stale: h >= 24 };
};
