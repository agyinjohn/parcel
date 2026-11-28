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

/** Split the parcels a manager picked into those still free to assign and those a rider already has. */
export const splitFreeAndTaken = (ids: string[], freshParcels: { parcelId: string; parcelAssigned?: boolean; riderInfo?: any }[], holders: Map<string, ActiveHolder[]>) => {
    const byId = new Map(freshParcels.map((p) => [p.parcelId, p]));
    const free: string[] = [];
    const taken: { parcelId: string; riderName?: string }[] = [];
    const gone: string[] = [];
    Array.from(new Set(ids)).forEach((id) => {
        const p = byId.get(id);
        const h = holders.get(id)?.[0];
        if (h || p?.parcelAssigned || p?.riderInfo) taken.push({ parcelId: id, riderName: h?.riderName ?? p?.riderInfo?.riderName });
        else if (!p) gone.push(id);
        else free.push(id);
    });
    return { free, taken, gone };
};
