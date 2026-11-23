import type { ServerDeliveryCheck } from "../../services/adminService";
/**
 * Helpers for rider GPS history: API time formats, range limits, route summary,
 * stop detection and the interpolated position used by playback.
 */

export interface TrackPointLike {
    lat: number;
    lng: number;
    speed?: number;
    direction?: number;
    gpsTime: string;
}

export interface TimedPoint {
    lat: number;
    lng: number;
    speed: number;
    direction?: number;
    t: number; // epoch ms
}

export interface Stop {
    lat: number;
    lng: number;
    start: number;
    end: number;
}

export interface TrackSummary {
    distanceKm: number;
    movingMs: number;
    stoppedMs: number;
    maxSpeed: number;
    stops: Stop[];
}

const MINUTE = 60_000;
export const MAX_RANGE_MS = 2 * 24 * 60 * MINUTE; // API limit: 2 days per request
export const MAX_AGE_MS = 90 * 24 * 60 * MINUTE; // API limit: last 3 months

/** Below this speed (km/h) a rider counts as standing still. */
export const STOP_SPEED_KMH = 3;
/** A standstill shorter than this isn't reported as a stop. */
export const MIN_STOP_MS = 5 * MINUTE;
/** Gaps between points longer than this aren't counted as moving or stopped time. */
const MAX_GAP_MS = 15 * MINUTE;

const pad = (n: number) => String(n).padStart(2, "0");

/** The tracking API takes and returns UTC "yyyy-MM-dd HH:mm:ss". */
export const toApiTime = (ms: number) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

/** Parses the API's UTC "yyyy-MM-dd HH:mm:ss"; falls back to Date parsing for other formats. */
export const parseGpsTime = (t?: string): number | null => {
    if (!t) return null;
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    const ms = Date.parse(t);
    return Number.isNaN(ms) ? null : ms;
};

/** Returns a reason the range can't be requested, or null if it's fine. */
export const validateRange = (start: number, end: number, now = Date.now()): string | null => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "Choose a start and end time.";
    if (end <= start) return "The end must be after the start.";
    if (start > now) return "The start is in the future.";
    if (end - start > MAX_RANGE_MS) return "Pick at most 2 days at a time.";
    if (start < now - MAX_AGE_MS) return "History only goes back 3 months.";
    return null;
};

/** Great-circle distance in kilometres. */
export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Drops points without a usable position or time, and sorts by time. */
export const normalizePoints = (points: TrackPointLike[] | undefined): TimedPoint[] =>
    (points ?? [])
        .map((p) => ({ lat: p.lat, lng: p.lng, speed: p.speed ?? 0, direction: p.direction, t: parseGpsTime(p.gpsTime) ?? NaN }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.t) && !(p.lat === 0 && p.lng === 0))
        .sort((a, b) => a.t - b.t);

export const summarize = (points: TimedPoint[]): TrackSummary => {
    let distance = 0, moving = 0, stopped = 0, maxSpeed = 0;
    const stops: Stop[] = [];
    let runStart: number | null = null; // index where the current standstill began

    const closeRun = (endIdx: number) => {
        if (runStart === null) return;
        const s = points[runStart];
        const e = points[endIdx];
        if (e.t - s.t >= MIN_STOP_MS) stops.push({ lat: s.lat, lng: s.lng, start: s.t, end: e.t });
        runStart = null;
    };

    points.forEach((p, i) => {
        maxSpeed = Math.max(maxSpeed, p.speed);
        const still = p.speed < STOP_SPEED_KMH;
        if (still && runStart === null) runStart = i;
        if (!still) closeRun(i);
        if (i === 0) return;
        const prev = points[i - 1];
        const dt = p.t - prev.t;
        distance += distanceKm(prev, p);
        if (dt > MAX_GAP_MS) { closeRun(i - 1); if (still) runStart = i; return; }
        if (still && prev.speed < STOP_SPEED_KMH) stopped += dt;
        else moving += dt;
    });
    if (points.length) closeRun(points.length - 1);

    return { distanceKm: distance, movingMs: moving, stoppedMs: stopped, maxSpeed, stops };
};

/** Position at time t, interpolated between the two surrounding points. */
export const positionAt = (points: TimedPoint[], t: number): TimedPoint | null => {
    if (points.length === 0) return null;
    if (t <= points[0].t) return points[0];
    const last = points[points.length - 1];
    if (t >= last.t) return last;
    // binary search for the last point at or before t
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (points[mid].t <= t) lo = mid; else hi = mid;
    }
    const a = points[lo], b = points[hi];
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    return {
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
        speed: a.speed + (b.speed - a.speed) * f,
        direction: b.direction ?? a.direction,
        t,
    };
};

/** Index of the last point at or before t (for drawing the travelled part of the route). */
export const indexAt = (points: TimedPoint[], t: number) => {
    let lo = 0, hi = points.length - 1;
    if (hi < 0 || t < points[0].t) return -1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (points[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
};

export const formatDuration = (ms: number) => {
    const m = Math.round(ms / MINUTE);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
};

// ── Delivery check: did the rider's GPS reach each drop-off? ─────────────

export interface DeliveryStop {
    id: string;
    parcelId: string;
    receiverName?: string;
    locationName?: string;
    lat?: number;
    lng?: number;
    assignedAt?: number;
    /** When the delivery was marked done (or returned). */
    completedAt?: number;
    status: string;
}

export type DeliveryCheck =
    | { kind: "visited"; stop: DeliveryStop; arrivedAt: number; leftAt: number; closestM: number; markedAwayM?: number }
    | { kind: "not-visited"; stop: DeliveryStop; closestM: number; closestAt: number; markedAwayM?: number }
    | { kind: "pending"; stop: DeliveryStop; closestM?: number }
    | { kind: "no-location"; stop: DeliveryStop }
    | { kind: "no-data"; stop: DeliveryStop };

/** Within this distance of the drop-off counts as "at the customer". */
export const VISIT_RADIUS_M = 150;
/** Marking a delivery done further than this from the drop-off is flagged. */
export const MARKED_AWAY_M = 300;
/** Look this long past the "delivered" time for an arrival (GPS can lag). */
const GRACE_MS = 30 * MINUTE;

export const checkDeliveries = (
    points: TimedPoint[],
    stops: DeliveryStop[],
    range: { start: number; end: number },
    radiusM = VISIT_RADIUS_M,
): DeliveryCheck[] =>
    stops.map((stop): DeliveryCheck => {
        if (stop.lat == null || stop.lng == null || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) return { kind: "no-location", stop };
        const from = Math.max(range.start, stop.assignedAt ?? range.start);
        const to = Math.min(range.end, (stop.completedAt ?? range.end) + GRACE_MS);
        const inWindow = points.filter((p) => p.t >= from && p.t <= to);
        const finished = stop.completedAt != null;
        if (inWindow.length === 0) return finished ? { kind: "no-data", stop } : { kind: "pending", stop };

        const target = { lat: stop.lat, lng: stop.lng };
        let closestM = Infinity, closestAt = inWindow[0].t, arrivedAt: number | null = null, leftAt = 0;
        inWindow.forEach((p) => {
            const d = distanceKm(p, target) * 1000;
            if (d < closestM) { closestM = d; closestAt = p.t; }
            if (d <= radiusM) {
                if (arrivedAt === null) arrivedAt = p.t;
                leftAt = p.t;
            }
        });

        // Where was the rider when they marked it done?
        let markedAwayM: number | undefined;
        if (stop.completedAt && stop.completedAt >= points[0].t && stop.completedAt <= points[points.length - 1].t) {
            const at = positionAt(points, stop.completedAt);
            const d = at ? distanceKm(at, target) * 1000 : 0;
            if (d > MARKED_AWAY_M) markedAwayM = d;
        }

        if (arrivedAt !== null) return { kind: "visited", stop, arrivedAt, leftAt, closestM, markedAwayM };
        // Not marked done yet and not reached yet: still in progress, not a failure.
        if (!finished) return { kind: "pending", stop, closestM };
        return { kind: "not-visited", stop, closestM, closestAt, markedAwayM };
    });

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

// ── Off-task check: detours between deliveries and unexplained stops ─────

/** A point the rider was supposed to be at: start, a reached drop-off, or end. */
export interface Anchor {
    lat: number;
    lng: number;
    arrive: number;
    leave: number;
    label: string;
}

export interface Detour {
    start: number;
    end: number;
    /** Furthest distance from the leg's straight line, in metres. */
    maxOffM: number;
    /** Distance ridden while off route, in km. */
    km: number;
    /** e.g. "Akua Badu → Efua Appiah" */
    leg: string;
    /** Indexes into the points array, inclusive, for drawing. */
    from: number;
    to: number;
}

export interface OffTaskReport {
    /** False when there's nothing to compare against (no reached drop-offs). */
    judged: boolean;
    reason?: string;
    anchors: Anchor[];
    detours: Detour[];
    unexplainedStops: Stop[];
    /** Straight-line distance start → reached drop-offs → end. */
    directKm: number;
    offRouteMs: number;
    offRouteKm: number;
}

/** How far from the straight line between two drop-offs still counts as "on the way". */
export const CORRIDOR_M = 1500;
/** Tighter allowance when measuring against a road-following planned route (Google). */
export const PLANNED_ROAD_CORRIDOR_M = 500;
/** Off-route stretches shorter than this are ignored (GPS drift, one-way streets). */
export const MIN_DETOUR_MS = 3 * MINUTE;
/** A stop within this distance of a drop-off, the start or the end is explained. */
export const EXPLAINED_STOP_M = 200;

/** Distance in metres from p to the segment a→b (flat-earth approximation, fine at city scale). */
export const distanceToSegmentM = (p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const kx = Math.cos((a.lat * Math.PI) / 180) * 111_320;
    const ky = 110_540;
    const px = (p.lng - a.lng) * kx, py = (p.lat - a.lat) * ky;
    const bx = (b.lng - a.lng) * kx, by = (b.lat - a.lat) * ky;
    const len2 = bx * bx + by * by;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
    return Math.hypot(px - t * bx, py - t * by);
};

/** Distance in metres from p to the nearest point of a polyline. */
export const distanceToPathM = (p: { lat: number; lng: number }, path: Array<{ lat: number; lng: number }>) => {
    if (path.length === 0) return Infinity;
    if (path.length === 1) return distanceKm(p, path[0]) * 1000;
    let best = Infinity;
    for (let i = 1; i < path.length; i++) best = Math.min(best, distanceToSegmentM(p, path[i - 1], path[i]));
    return best;
};

export const analyzeOffTask = (
    points: TimedPoint[],
    checks: DeliveryCheck[],
    stops: Stop[],
    opts: {
        base?: { lat: number; lng: number };
        corridorM?: number;
        minDetourMs?: number;
        /**
         * The route the manager confirmed. A point is off route only when it's away from this line
         * AND from the straight leg between the drop-offs actually reached. The plan stops bending
         * roads being flagged; the leg check stops a skipped planned stop turning the ride home
         * into a "detour".
         */
        plannedPath?: Array<{ lat: number; lng: number }>;
    } = {},
): OffTaskReport => {
    const planned = opts.plannedPath && opts.plannedPath.length >= 2 ? opts.plannedPath : null;
    const corridorM = opts.corridorM ?? CORRIDOR_M;
    const minDetourMs = opts.minDetourMs ?? MIN_DETOUR_MS;
    const pins = checks.filter((c) => c.stop.lat != null && c.stop.lng != null).map((c) => ({ lat: c.stop.lat!, lng: c.stop.lng! }));

    const empty: OffTaskReport = { judged: false, anchors: [], detours: [], unexplainedStops: [], directKm: 0, offRouteMs: 0, offRouteKm: 0 };
    if (points.length === 0) return { ...empty, reason: "No GPS points in this period." };

    const first = points[0], last = points[points.length - 1];
    const startAt = opts.base ?? first, endAt = opts.base ?? last;
    const explainedAt = [...pins, startAt, endAt, first, last];
    const unexplainedStops = stops.filter((s) => !explainedAt.some((q) => distanceKm(s, q) * 1000 <= EXPLAINED_STOP_M));

    const visited = checks
        .filter((c): c is Extract<DeliveryCheck, { kind: "visited" }> => c.kind === "visited")
        .sort((a, b) => a.arrivedAt - b.arrivedAt);
    if (visited.length === 0) {
        return { ...empty, unexplainedStops, reason: "No reached drop-offs to compare the route against." };
    }

    const anchors: Anchor[] = [
        { lat: startAt.lat, lng: startAt.lng, arrive: first.t, leave: first.t, label: opts.base ? "Station" : "Start" },
        ...visited.map((v) => ({ lat: v.stop.lat!, lng: v.stop.lng!, arrive: v.arrivedAt, leave: v.leftAt, label: v.stop.receiverName ?? v.stop.parcelId })),
        { lat: endAt.lat, lng: endAt.lng, arrive: last.t, leave: last.t, label: opts.base ? "Station" : "End" },
    ];

    const detours: Detour[] = [];
    for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i], b = anchors[i + 1];
        let run: number[] = [];
        let maxOff = 0;
        const close = () => {
            if (run.length) {
                const from = run[0], to = run[run.length - 1];
                if (points[to].t - points[from].t >= minDetourMs) {
                    // Count the ride out and back: from the last on-route point to the next one.
                    const lo = Math.max(0, from - 1), hi = Math.min(points.length - 1, to + 1);
                    let km = 0;
                    for (let k = lo + 1; k <= hi; k++) km += distanceKm(points[k - 1], points[k]);
                    detours.push({ start: points[from].t, end: points[to].t, maxOffM: maxOff, km, leg: `${a.label} → ${b.label}`, from, to });
                }
            }
            run = [];
            maxOff = 0;
        };
        points.forEach((p, idx) => {
            if (p.t <= a.leave || p.t >= b.arrive) return;
            const legOff = distanceToSegmentM(p, a, b);
            const planOff = planned ? distanceToPathM(p, planned) : Infinity;
            const isOff = planned ? planOff > corridorM && legOff > CORRIDOR_M : legOff > corridorM;
            const off = planned ? Math.min(planOff, legOff) : legOff;
            const gap = run.length && p.t - points[run[run.length - 1]].t > 15 * MINUTE;
            if (gap) close();
            if (isOff) { run.push(idx); maxOff = Math.max(maxOff, off); }
            else close();
        });
        close();
    }

    let directKm = 0;
    for (let i = 1; i < anchors.length; i++) directKm += distanceKm(anchors[i - 1], anchors[i]);

    return {
        judged: true,
        anchors,
        detours,
        unexplainedStops,
        directKm,
        offRouteMs: detours.reduce((s, d) => s + (d.end - d.start), 0),
        offRouteKm: detours.reduce((s, d) => s + d.km, 0),
    };
};

// ── Server-side check (updated backend: GET /api-admin/riders/delivery-check) ──


/**
 * Turns the backend's delivery check into the shapes the history panel draws, so the server's
 * verdict is shown when available and the in-browser check is only a fallback.
 * Detours come back as times; their point indexes are found on the loaded track for drawing.
 */
export const fromServerCheck = (
    res: ServerDeliveryCheck,
    points: TimedPoint[],
): { checks: DeliveryCheck[]; offTask: OffTaskReport } => {
    const checks = (res.deliveries ?? []).map((d): DeliveryCheck => {
        const stop: DeliveryStop = {
            id: `${d.assignmentId ?? ""}:${d.parcelId}`,
            parcelId: d.parcelId,
            receiverName: d.receiverName,
            locationName: d.receiverLocationName,
            lat: d.receiverLatitude ?? undefined,
            lng: d.receiverLongitude ?? undefined,
            completedAt: d.completedAt ?? undefined,
            status: d.status ?? "",
        };
        const markedAwayM = d.markedAway ? d.markedDistanceFromDropoffM ?? MARKED_AWAY_M : undefined;
        const closestM = d.closestDistanceM ?? Infinity;
        switch (d.result) {
            case "REACHED":
                return { kind: "visited", stop, arrivedAt: d.arrivedAt ?? 0, leftAt: d.leftAt ?? d.arrivedAt ?? 0, closestM: d.closestDistanceM ?? 0, markedAwayM };
            case "NOT_REACHED":
                return { kind: "not-visited", stop, closestM, closestAt: d.closestAt ?? 0, markedAwayM };
            case "NOT_FINISHED":
                return { kind: "pending", stop, closestM: d.closestDistanceM ?? undefined };
            case "NO_PIN":
                return { kind: "no-location", stop };
            default:
                return { kind: "no-data", stop };
        }
    });
    const o = res.offTask ?? {};
    const offTask: OffTaskReport = {
        judged: !!o.judged,
        reason: o.reason,
        anchors: [],
        detours: (o.detours ?? []).map((d) => ({
            start: d.start,
            end: d.end,
            maxOffM: d.maxOffRouteM ?? 0,
            km: d.kmRidden ?? 0,
            leg: [d.fromLabel, d.toLabel].filter(Boolean).join(" → ") || "Between drop-offs",
            from: Math.max(0, indexAt(points, d.start)),
            to: Math.max(0, indexAt(points, d.end)),
        })),
        unexplainedStops: (o.offTaskStops ?? []).map((s) => ({ lat: s.lat, lng: s.lng, start: s.start, end: s.end })),
        directKm: o.directKm ?? 0,
        offRouteMs: (o.offRouteMinutes ?? 0) * MINUTE,
        offRouteKm: o.offRouteKm ?? 0,
    };
    return { checks, offTask };
};
