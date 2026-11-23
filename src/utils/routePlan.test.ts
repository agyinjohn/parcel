import { describe, it, expect } from "vitest";
import {
    PlanStop, orderStops, estimatePlan, planRoute, planWithGoogle, mapsRouteLinks,
    encodePolyline, decodePolyline, haversineKm, ROAD_FACTOR, GOOGLE_MAX_STOPS,
} from "./routePlan";

const station = { lat: 5.6, lng: -0.2 };
// Five stops due north of the station, given in a scrambled order.
const line: PlanStop[] = [3, 1, 5, 2, 4].map((k) => ({ id: `S${k}`, label: `S${k}`, lat: 5.6 + k * 0.01, lng: -0.2 }));

describe("orderStops (in-browser)", () => {
    it("visits points on a line in order from the station", () => {
        expect(orderStops(line, station, station).map((s) => s.id)).toEqual(["S1", "S2", "S3", "S4", "S5"]);
    });

    it("untangles a crossing that nearest-neighbour alone gets wrong", () => {
        // A square: start at bottom-left. Visiting the corners crosswise is longer than around the edge.
        const sq: PlanStop[] = [
            { id: "TR", label: "", lat: 5.61, lng: -0.19 },
            { id: "BR", label: "", lat: 5.6, lng: -0.19 },
            { id: "TL", label: "", lat: 5.61, lng: -0.2 },
        ];
        // Going round the edge (either direction) is shortest.
        const ids = orderStops(sq, station, station).map((s) => s.id).join();
        expect(["TL,TR,BR", "BR,TR,TL"]).toContain(ids);
    });

    it("picks a sensible first stop when the station is unknown", () => {
        const ids = orderStops(line).map((s) => s.id);
        expect([ids.join(), [...ids].reverse().join()]).toContain("S1,S2,S3,S4,S5");
    });
});

describe("estimatePlan", () => {
    it("adds legs from the station, through the stops, back to the station", () => {
        const ordered = orderStops(line, station, station);
        const plan = estimatePlan(ordered, station, station);
        expect(plan.method).toBe("ESTIMATE");
        expect(plan.legs).toHaveLength(6);
        expect(plan.legs[0].from).toBe("START");
        expect(plan.legs[5].to).toBe("END");
        const straight = 2 * haversineKm(station, { lat: 5.65, lng: -0.2 });
        expect(plan.totalKm).toBeCloseTo(straight * ROAD_FACTOR, 5);
        expect(plan.path).toHaveLength(7);
    });
});

/** Fake google.maps.DirectionsService: reverses the waypoints as its "optimisation". */
const fakeDirections = (status = "OK") => ({
    calls: [] as any[],
    route(req: any, cb: (r: any, s: string) => void) {
        this.calls.push(req);
        const n = req.waypoints.length;
        const order = req.optimizeWaypoints ? [...Array(n).keys()].reverse() : [...Array(n).keys()];
        cb(status === "OK" ? {
            routes: [{
                waypoint_order: order,
                legs: Array.from({ length: n + 1 }, () => ({ distance: { value: 2000 }, duration: { value: 300 } })),
                overview_path: [{ lat: () => 5.6, lng: () => -0.2 }, { lat: () => 5.65, lng: () => -0.2 }],
            }],
        } : null, status);
    },
});

describe("planWithGoogle / planRoute", () => {
    it("uses Google's waypoint order and road distances", async () => {
        const svc = fakeDirections();
        const plan = await planWithGoogle(svc, line, { start: station, end: station, optimize: true });
        expect(plan.method).toBe("GOOGLE");
        expect(plan.order).toEqual(["S4", "S2", "S5", "S1", "S3"]); // reversed input order
        expect(plan.totalKm).toBe(12); // 6 legs x 2 km
        expect(plan.totalMinutes).toBe(30);
        expect(svc.calls[0].optimizeWaypoints).toBe(true);
        expect(svc.calls[0].waypoints).toHaveLength(5);
    });

    it("keeps a hand-made order when not optimising", async () => {
        const plan = await planWithGoogle(fakeDirections(), line, { start: station, end: station, optimize: false });
        expect(plan.order).toEqual(line.map((s) => s.id));
        expect(plan.edited).toBe(true);
    });

    it("falls back to the estimate without Google, with too many stops, or on an error", async () => {
        const noGoogle = await planRoute(line, { start: station, end: station });
        expect(noGoogle.plan.method).toBe("ESTIMATE");
        expect(noGoogle.fallbackReason).toMatch(/isn't available/);

        const many: PlanStop[] = Array.from({ length: GOOGLE_MAX_STOPS + 1 }, (_, i) => ({ id: `M${i}`, label: "", lat: 5.6 + i * 0.001, lng: -0.2 }));
        expect((await planRoute(many, { start: station, directionsService: fakeDirections() })).fallbackReason).toMatch(/More than 25/);

        const failed = await planRoute(line, { start: station, directionsService: fakeDirections("ZERO_RESULTS") });
        expect(failed.plan.method).toBe("ESTIMATE");
        expect(failed.fallbackReason).toMatch(/ZERO_RESULTS/);
    });

    it("uses Google when it's there", async () => {
        const r = await planRoute(line, { start: station, end: station, directionsService: fakeDirections() });
        expect(r.plan.method).toBe("GOOGLE");
        expect(r.fallbackReason).toBeUndefined();
    });
});

describe("mapsRouteLinks", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ lat: +(5.6 + i * 0.01).toFixed(2), lng: -0.2 }));
    it("splits into parts of 4 stops on phones (3 waypoints + destination)", () => {
        const links = mapsRouteLinks(ten, { mobile: true });
        expect(links.map((l) => [l.from, l.to])).toEqual([[1, 4], [5, 8], [9, 10]]);
        expect(links[0].href).not.toContain("origin=");
        expect(links[0].href).toContain("waypoints=5.6,-0.2|5.61,-0.2|5.62,-0.2");
        expect(links[0].href).toContain("destination=5.63,-0.2");
        expect(links[1].href).toContain("origin=5.63,-0.2"); // continues from the previous part's last stop
    });
    it("fits 10 stops in one link on desktop", () => {
        expect(mapsRouteLinks(ten, { mobile: false })).toHaveLength(1);
    });
});

describe("polyline encoding", () => {
    it("round-trips Google's example", () => {
        const pts = [{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }];
        expect(encodePolyline(pts)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
        expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual(pts);
    });
});
