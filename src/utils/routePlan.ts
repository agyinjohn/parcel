/**
 * Route planning for a rider's assigned deliveries.
 *
 * Two ways to order the stops:
 *  - GOOGLE: Google Directions with optimizeWaypoints (road distances and times, max 25 stops).
 *  - ESTIMATE: nearest-neighbour + 2-opt on straight-line distance, in the browser. Free and
 *    instant; used when Google isn't available or there are too many stops.
 */

export interface LatLng {
    lat: number;
    lng: number;
}

export interface PlanStop extends LatLng {
    /** Parcel id. */
    id: string;
    label: string;
}

export interface PlanLeg {
    from: string; // stop id, or "START"
    to: string; // stop id, or "END"
    km: number;
    minutes: number;
}

export interface RoutePlan {
    method: "GOOGLE" | "ESTIMATE";
    /** Stop ids in visiting order. */
    order: string[];
    legs: PlanLeg[];
    totalKm: number;
    totalMinutes: number;
    /** Route line to draw (road geometry from Google, or straight segments). */
    path: LatLng[];
    /** Where the route starts and ends (the station), when known. */
    start?: LatLng;
    end?: LatLng;
    /** True when the order was changed by hand after planning. */
    edited?: boolean;
    computedAt: number;
}

/** Google allows 25 waypoints per Directions request. */
export const GOOGLE_MAX_STOPS = 25;
/** Straight lines understate road distance; this is a typical city detour factor. */
export const ROAD_FACTOR = 1.3;
/** Average riding speed used for estimates, km/h. */
export const EST_SPEED_KMH = 22;

export const haversineKm = (a: LatLng, b: LatLng) => {
    const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const estimateLeg = (a: LatLng, b: LatLng) => {
    const km = haversineKm(a, b) * ROAD_FACTOR;
    return { km, minutes: (km / EST_SPEED_KMH) * 60 };
};

// ── A. In-browser ordering ──────────────────────────────────────

/** Total straight-line length of visiting `seq` (indexes into pts), with optional fixed ends. */
const tourLength = (seq: number[], pts: LatLng[], start?: LatLng, end?: LatLng) => {
    let d = 0;
    if (start && seq.length) d += haversineKm(start, pts[seq[0]]);
    for (let i = 1; i < seq.length; i++) d += haversineKm(pts[seq[i - 1]], pts[seq[i]]);
    if (end && seq.length) d += haversineKm(pts[seq[seq.length - 1]], end);
    return d;
};

const nearestNeighbour = (pts: LatLng[], from: LatLng | number) => {
    const left = new Set(pts.map((_, i) => i));
    const seq: number[] = [];
    let cur: LatLng;
    if (typeof from === "number") { seq.push(from); left.delete(from); cur = pts[from]; } else cur = from;
    while (left.size) {
        let best = -1, bestD = Infinity;
        left.forEach((i) => { const d = haversineKm(cur, pts[i]); if (d < bestD) { bestD = d; best = i; } });
        seq.push(best); left.delete(best); cur = pts[best];
    }
    return seq;
};

/** 2-opt: reverse segments while it shortens the route. */
const twoOpt = (seq: number[], pts: LatLng[], start?: LatLng, end?: LatLng) => {
    let best = seq.slice(), bestLen = tourLength(best, pts, start, end), improved = true, guard = 0;
    while (improved && guard++ < 200) {
        improved = false;
        for (let i = 0; i < best.length - 1; i++) {
            for (let k = i + 1; k < best.length; k++) {
                const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
                const len = tourLength(cand, pts, start, end);
                if (len < bestLen - 1e-9) { best = cand; bestLen = len; improved = true; }
            }
        }
    }
    return best;
};

/** Order stops from `start` (if known) back to `end` (if known). Without a start, picks the best first stop. */
export const orderStops = (stops: PlanStop[], start?: LatLng, end?: LatLng): PlanStop[] => {
    if (stops.length <= 1) return stops.slice();
    if (start) return twoOpt(nearestNeighbour(stops, start), stops, start, end).map((i) => stops[i]);
    let bestSeq: number[] = [], bestLen = Infinity;
    stops.forEach((_, i) => {
        const seq = twoOpt(nearestNeighbour(stops, i), stops, undefined, end);
        const len = tourLength(seq, stops, undefined, end);
        if (len < bestLen) { bestLen = len; bestSeq = seq; }
    });
    return bestSeq.map((i) => stops[i]);
};

/** Distances and times for a given order, from straight-line estimates. */
export const estimatePlan = (ordered: PlanStop[], start?: LatLng, end?: LatLng, edited = false): RoutePlan => {
    const nodes: Array<LatLng & { id: string }> = [
        ...(start ? [{ ...start, id: "START" }] : []),
        ...ordered,
        ...(end ? [{ ...end, id: "END" }] : []),
    ];
    const legs: PlanLeg[] = [];
    for (let i = 1; i < nodes.length; i++) legs.push({ from: nodes[i - 1].id, to: nodes[i].id, ...estimateLeg(nodes[i - 1], nodes[i]) });
    return {
        method: "ESTIMATE",
        order: ordered.map((s) => s.id),
        legs,
        totalKm: legs.reduce((s, l) => s + l.km, 0),
        totalMinutes: legs.reduce((s, l) => s + l.minutes, 0),
        path: nodes.map(({ lat, lng }) => ({ lat, lng })),
        start, end, edited,
        computedAt: Date.now(),
    };
};

// ── B. Google Directions ────────────────────────────────────────

/**
 * Plans with google.maps.DirectionsService. With `optimize`, Google picks the order; otherwise the
 * given order is kept and only road distances are fetched. Needs a start and end: when the station
 * is unknown, the first and last stops of `stops` are used as the ends.
 */
export const planWithGoogle = (
    service: any,
    stops: PlanStop[],
    opts: { start?: LatLng; end?: LatLng; optimize: boolean },
): Promise<RoutePlan> =>
    new Promise((resolve, reject) => {
        if (stops.length === 0) return reject(new Error("No stops to plan."));
        if (stops.length > GOOGLE_MAX_STOPS) return reject(new Error(`More than ${GOOGLE_MAX_STOPS} stops.`));
        const origin = opts.start ?? stops[0];
        const destination = opts.end ?? stops[stops.length - 1];
        // Stops that are the origin/destination themselves aren't waypoints.
        const middle = stops.filter((_, i) => !(!opts.start && i === 0) && !(!opts.end && i === stops.length - 1));
        service.route(
            {
                origin, destination,
                waypoints: middle.map((s) => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
                optimizeWaypoints: opts.optimize,
                travelMode: "DRIVING",
            },
            (result: any, status: string) => {
                if (status !== "OK" || !result?.routes?.[0]) return reject(new Error(`Google Directions: ${status}`));
                const route = result.routes[0];
                const wpOrder: number[] = route.waypoint_order ?? middle.map((_: unknown, i: number) => i);
                const ordered: PlanStop[] = [
                    ...(!opts.start ? [stops[0]] : []),
                    ...wpOrder.map((i) => middle[i]),
                    ...(!opts.end && stops.length > 1 ? [stops[stops.length - 1]] : []),
                ];
                const ids = [...(opts.start ? ["START"] : []), ...ordered.map((s) => s.id), ...(opts.end ? ["END"] : [])];
                const legs: PlanLeg[] = route.legs.map((l: any, i: number) => ({
                    from: ids[i], to: ids[i + 1],
                    km: (l.distance?.value ?? 0) / 1000,
                    minutes: (l.duration?.value ?? 0) / 60,
                }));
                const path: LatLng[] = (route.overview_path ?? []).map((p: any) => ({ lat: typeof p.lat === "function" ? p.lat() : p.lat, lng: typeof p.lng === "function" ? p.lng() : p.lng }));
                resolve({
                    method: "GOOGLE",
                    order: ordered.map((s) => s.id),
                    legs,
                    totalKm: legs.reduce((s, l) => s + l.km, 0),
                    totalMinutes: legs.reduce((s, l) => s + l.minutes, 0),
                    path: path.length ? path : [origin, ...ordered, destination].map(({ lat, lng }) => ({ lat, lng })),
                    start: opts.start, end: opts.end,
                    edited: !opts.optimize,
                    computedAt: Date.now(),
                });
            }
        );
    });

/**
 * B + A: Google when it's loaded and the stop count fits; otherwise (or if Google fails) the
 * in-browser estimate. `fallbackReason` says why the estimate was used.
 */
export const planRoute = async (
    stops: PlanStop[],
    opts: { start?: LatLng; end?: LatLng; directionsService?: any },
): Promise<{ plan: RoutePlan; fallbackReason?: string }> => {
    const estimate = () => estimatePlan(orderStops(stops, opts.start, opts.end), opts.start, opts.end);
    if (stops.length === 0) return { plan: estimatePlan([], opts.start, opts.end) };
    if (!opts.directionsService) return { plan: estimate(), fallbackReason: "Google Maps isn't available, so distances are straight-line estimates." };
    if (stops.length > GOOGLE_MAX_STOPS) return { plan: estimate(), fallbackReason: `More than ${GOOGLE_MAX_STOPS} stops, so the order is estimated without road data.` };
    try {
        // Without a station, let the heuristic choose sensible ends and Google optimise the middle.
        const seed = opts.start ? stops : orderStops(stops, undefined, opts.end);
        return { plan: await planWithGoogle(opts.directionsService, seed, { ...opts, optimize: true }) };
    } catch (e) {
        return { plan: estimate(), fallbackReason: `Google couldn't plan this route (${(e as Error).message}), so distances are estimates.` };
    }
};

// ── Sharing the route with the rider ───────────────────────────

/**
 * Google Maps links that open the stops in order. A link can carry a limited number of
 * waypoints (3 in mobile browsers, 9 elsewhere), so long routes are split into parts.
 * The first part starts from the rider's current location; later parts start at the
 * previous part's last stop.
 */
export const mapsRouteLinks = (ordered: Array<LatLng & { label?: string }>, opts: { mobile: boolean }) => {
    const perPart = (opts.mobile ? 3 : 9) + 1; // waypoints + destination
    const fmt = (p: LatLng) => `${p.lat},${p.lng}`;
    const links: Array<{ from: number; to: number; href: string }> = [];
    for (let i = 0; i < ordered.length; i += perPart) {
        const part = ordered.slice(i, i + perPart);
        const dest = part[part.length - 1];
        const wps = part.slice(0, -1);
        const params = new URLSearchParams({ api: "1", destination: fmt(dest), travelmode: "driving" });
        if (i > 0) params.set("origin", fmt(ordered[i - 1]));
        if (wps.length) params.set("waypoints", wps.map(fmt).join("|"));
        links.push({ from: i + 1, to: i + part.length, href: `https://www.google.com/maps/dir/?${params.toString().replace(/%2C/g, ",").replace(/%7C/g, "|")}` });
    }
    return links;
};

// ── Compact route line for storage (Google's encoded polyline format) ──

export const encodePolyline = (pts: LatLng[]) => {
    let out = "", pLat = 0, pLng = 0;
    const enc = (v: number) => {
        let s = v < 0 ? ~(v << 1) : v << 1, r = "";
        while (s >= 0x20) { r += String.fromCharCode((0x20 | (s & 0x1f)) + 63); s >>= 5; }
        return r + String.fromCharCode(s + 63);
    };
    pts.forEach(({ lat, lng }) => {
        const la = Math.round(lat * 1e5), ln = Math.round(lng * 1e5);
        out += enc(la - pLat) + enc(ln - pLng);
        pLat = la; pLng = ln;
    });
    return out;
};

export const decodePolyline = (str: string): LatLng[] => {
    const pts: LatLng[] = [];
    let i = 0, lat = 0, lng = 0;
    const next = () => {
        let b, shift = 0, result = 0;
        do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        return result & 1 ? ~(result >> 1) : result >> 1;
    };
    while (i < str.length) { lat += next(); lng += next(); pts.push({ lat: lat / 1e5, lng: lng / 1e5 }); }
    return pts;
};

export const formatMinutes = (m: number) => {
    const r = Math.round(m);
    return r < 60 ? `${r} min` : `${Math.floor(r / 60)} h ${r % 60 ? `${r % 60} min` : ""}`.trim();
};
