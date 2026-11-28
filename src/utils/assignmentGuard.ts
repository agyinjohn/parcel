/**
 * Guards against assigning a parcel to a rider twice.
 * A parcel counts as "out" when it sits on an active assignment (ASSIGNED, ACCEPTED, PICKED_UP)
 * and isn't delivered, returned or picked up at the counter.
 */
const ACTIVE = new Set(["ASSIGNED", "ACCEPTED", "PICKED_UP"]);

export interface ActiveHolder {
    assignmentId: string;
    riderId?: string;
    riderName?: string;
    assignedAt?: number;
}

/** parcelId → every active assignment holding it (newest first). */
export const activeHolders = (assignments: any[]): Map<string, ActiveHolder[]> => {
    const map = new Map<string, ActiveHolder[]>();
    (assignments ?? []).forEach((a) => {
        if (!ACTIVE.has(a?.status)) return;
        const parcels = Array.isArray(a.parcels) ? a.parcels : a.parcel ? [a.parcel] : [];
        parcels.forEach((p: any) => {
            if (!p?.parcelId || p.delivered === true || p.returned === true || p.pickedUp === true) return;
            const list = map.get(p.parcelId) ?? [];
            if (list.some((h) => h.assignmentId === a.assignmentId)) return;
            list.push({
                assignmentId: a.assignmentId,
                riderId: a.riderInfo?.riderId ?? a.riderId,
                riderName: a.riderInfo?.riderName ?? a.riderName,
                assignedAt: a.assignedAt,
            });
            map.set(p.parcelId, list);
        });
    });
    map.forEach((l) => l.sort((x, y) => (y.assignedAt ?? 0) - (x.assignedAt ?? 0)));
    return map;
};

/** A parcel is already out if its own flags say so or an active assignment holds it. */
export const isAlreadyOut = (p: { parcelId: string; parcelAssigned?: boolean; riderInfo?: unknown }, holders: Map<string, ActiveHolder[]>) =>
    !!p.parcelAssigned || !!p.riderInfo || (holders.get(p.parcelId)?.length ?? 0) > 0;

/** Keep the first row for each parcelId. */
export const uniqueByParcel = <T extends { parcelId?: string }>(rows: T[]): T[] => {
    const seen = new Set<string>();
    return rows.filter((r) => {
        if (!r?.parcelId || seen.has(r.parcelId)) return false;
        seen.add(r.parcelId);
        return true;
    });
};

/**
 * Split the parcels a manager picked, just before assigning them to `riderId`:
 * - `sameRider`: that rider already has the parcel. Never allowed (the duplicate we stop).
 * - `taken`: another rider has it. Allowed only when the manager is reassigning on purpose
 *   (from the Assigned tab); from the Ready tab it means someone else got there first.
 * - `gone`: no longer waiting for delivery (delivered, returned, removed).
 * - `free`: fine to assign.
 */
export const splitFreeAndTaken = (
    ids: string[],
    freshParcels: { parcelId: string; parcelAssigned?: boolean; riderInfo?: any }[],
    holders: Map<string, ActiveHolder[]>,
    opts: { riderId?: string; reassign?: boolean } = {},
) => {
    const byId = new Map(freshParcels.map((p) => [p.parcelId, p]));
    const free: string[] = [];
    const taken: { parcelId: string; riderName?: string }[] = [];
    const sameRider: string[] = [];
    const gone: string[] = [];
    Array.from(new Set(ids)).forEach((id) => {
        const p = byId.get(id);
        const hs = holders.get(id) ?? [];
        const riderIds = new Set([...hs.map((h) => h.riderId), p?.riderInfo?.riderId].filter(Boolean));
        const held = hs.length > 0 || !!p?.parcelAssigned || !!p?.riderInfo;
        if (opts.riderId && riderIds.has(opts.riderId)) sameRider.push(id);
        else if (held && !opts.reassign) taken.push({ parcelId: id, riderName: hs[0]?.riderName ?? p?.riderInfo?.riderName });
        else if (!held && !p) gone.push(id);
        else free.push(id);
    });
    return { free, taken, sameRider, gone };
};

/** Riders who already hold any of these parcels (they can't be picked for them again). */
export const ridersHolding = (ids: Iterable<string>, parcels: { parcelId: string; riderInfo?: any }[], holders: Map<string, ActiveHolder[]>) => {
    const out = new Set<string>();
    const byId = new Map(parcels.map((p) => [p.parcelId, p]));
    for (const id of ids) {
        holders.get(id)?.forEach((h) => h.riderId && out.add(h.riderId));
        const r = byId.get(id)?.riderInfo?.riderId;
        if (r) out.add(r);
    }
    return out;
};
