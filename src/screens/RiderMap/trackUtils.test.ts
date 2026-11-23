import { describe, it, expect } from "vitest";
import {
    toApiTime, parseGpsTime, validateRange, distanceKm, normalizePoints, summarize,
    positionAt, indexAt, formatDuration, MAX_RANGE_MS, checkDeliveries, analyzeOffTask, distanceToSegmentM, distanceToPathM,
} from "./trackUtils";

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 20, 8, 0, 0); // 2026-11-20 08:00:00 UTC

describe("API time format", () => {
    it("formats epoch ms as UTC yyyy-MM-dd HH:mm:ss", () => {
        expect(toApiTime(T0 + 5 * MIN + 7000)).toBe("2026-11-20 08:05:07");
    });
    it("round-trips through parseGpsTime", () => {
        expect(parseGpsTime(toApiTime(T0))).toBe(T0);
    });
    it("rejects missing or garbage times", () => {
        expect(parseGpsTime(undefined)).toBeNull();
        expect(parseGpsTime("not a time")).toBeNull();
    });
});

describe("validateRange", () => {
    const now = T0 + 10 * 24 * 60 * MIN;
    it("accepts a range within the limits", () => {
        expect(validateRange(now - 24 * 60 * MIN, now, now)).toBeNull();
    });
    it("rejects end before start", () => {
        expect(validateRange(now, now - MIN, now)).toMatch(/after the start/);
    });
    it("rejects more than 2 days", () => {
        expect(validateRange(now - MAX_RANGE_MS - MIN, now, now)).toMatch(/2 days/);
    });
    it("rejects anything older than 3 months", () => {
        const start = now - 100 * 24 * 60 * MIN;
        expect(validateRange(start, start + 60 * MIN, now)).toMatch(/3 months/);
    });
});

describe("distanceKm", () => {
    it("is about 111 km per degree of latitude", () => {
        expect(distanceKm({ lat: 5, lng: 0 }, { lat: 6, lng: 0 })).toBeCloseTo(111.2, 0);
    });
});

// A route: drive 10 min, stand still 10 min, drive 2 min, pause 2 min (too short to be a stop), drive 1 min.
const raw = [
    ...Array.from({ length: 11 }, (_, i) => ({ lat: 5.6 + i * 0.001, lng: -0.2, speed: 30, t: T0 + i * MIN })),
    ...Array.from({ length: 10 }, (_, i) => ({ lat: 5.61, lng: -0.2, speed: 0, t: T0 + (11 + i) * MIN })),
    ...Array.from({ length: 2 }, (_, i) => ({ lat: 5.611 + i * 0.001, lng: -0.2, speed: 25, t: T0 + (21 + i) * MIN })),
    ...Array.from({ length: 2 }, (_, i) => ({ lat: 5.613, lng: -0.2, speed: 0, t: T0 + (23 + i) * MIN })),
    { lat: 5.614, lng: -0.2, speed: 20, t: T0 + 25 * MIN },
].map((p) => ({ ...p, gpsTime: toApiTime(p.t) }));

describe("normalizePoints", () => {
    it("sorts by time and drops points without a position", () => {
        const pts = normalizePoints([raw[2], raw[0], { ...raw[1], lat: NaN }, { ...raw[3], lat: 0, lng: 0 }]);
        expect(pts.map((p) => p.t)).toEqual([raw[0], raw[2]].map((p) => parseGpsTime(p.gpsTime)));
    });
});

describe("summarize", () => {
    const s = summarize(normalizePoints(raw));
    it("finds the 10-minute stop and ignores the 2-minute pause", () => {
        expect(s.stops).toHaveLength(1);
        expect(s.stops[0].start).toBe(T0 + 11 * MIN);
        // Runs until the rider moves again at minute 21.
        expect(s.stops[0].end - s.stops[0].start).toBe(10 * MIN);
    });
    it("splits moving and stopped time across the whole span", () => {
        expect(s.movingMs + s.stoppedMs).toBe(25 * MIN);
        expect(s.stoppedMs).toBe(10 * MIN);
    });
    it("reports top speed and a plausible distance", () => {
        expect(s.maxSpeed).toBe(30);
        expect(s.distanceKm).toBeGreaterThan(1.5);
        expect(s.distanceKm).toBeLessThan(1.7);
    });
    it("handles an empty track", () => {
        expect(summarize([])).toEqual({ distanceKm: 0, movingMs: 0, stoppedMs: 0, maxSpeed: 0, stops: [] });
    });
});

describe("positionAt / indexAt", () => {
    const pts = normalizePoints(raw);
    it("interpolates halfway between two points", () => {
        const p = positionAt(pts, T0 + 30_000)!;
        expect(p.lat).toBeCloseTo(5.6005, 6);
    });
    it("clamps before the start and after the end", () => {
        expect(positionAt(pts, T0 - MIN)!.t).toBe(T0);
        expect(positionAt(pts, T0 + 99 * MIN)!.t).toBe(pts[pts.length - 1].t);
    });
    it("finds the last point at or before a time", () => {
        expect(indexAt(pts, T0 + 90_000)).toBe(1);
        expect(indexAt(pts, T0 - 1)).toBe(-1);
    });
});

describe("formatDuration", () => {
    it("formats minutes and hours", () => {
        expect(formatDuration(14 * MIN)).toBe("14 min");
        expect(formatDuration(125 * MIN)).toBe("2 h 5 min");
        expect(formatDuration(120 * MIN)).toBe("2 h");
    });
});

describe("checkDeliveries", () => {
    // Rider drives north from 5.600 to 5.610 over 10 minutes, then waits at 5.610 for 10 minutes.
    const pts = normalizePoints(raw).filter((p) => p.t <= T0 + 20 * MIN);
    const range = { start: T0, end: T0 + 60 * MIN };
    const stop = (over: Partial<import("./trackUtils").DeliveryStop>) => ({ id: "a", parcelId: "P1", status: "DELIVERED", ...over });

    it("marks a drop-off the rider waited at as visited, with arrival and departure", () => {
        const [r] = checkDeliveries(pts, [stop({ lat: 5.61, lng: -0.2, completedAt: T0 + 15 * MIN })], range);
        expect(r.kind).toBe("visited");
        if (r.kind !== "visited") return;
        expect(r.arrivedAt).toBe(T0 + 9 * MIN); // 5.609 is ~111 m away, inside 150 m
        expect(r.leftAt).toBe(T0 + 20 * MIN);
        expect(r.markedAwayM).toBeUndefined();
    });

    it("reports a drop-off the GPS never reached, with the closest approach", () => {
        const [r] = checkDeliveries(pts, [stop({ lat: 5.63, lng: -0.2, completedAt: T0 + 15 * MIN })], range);
        expect(r.kind).toBe("not-visited");
        if (r.kind !== "not-visited") return;
        expect(r.closestM).toBeGreaterThan(2000);
        expect(r.closestM).toBeLessThan(2300);
        expect(r.markedAwayM).toBeGreaterThan(2000); // marked done ~2.2 km away
    });

    it("flags a visit that was marked done somewhere else", () => {
        // Visited at the start (5.600), but marked done at minute 15 while waiting at 5.610 (~1.1 km away).
        const [r] = checkDeliveries(pts, [stop({ lat: 5.6, lng: -0.2, completedAt: T0 + 15 * MIN })], range);
        expect(r.kind).toBe("visited");
        expect(r.kind === "visited" && r.markedAwayM! > 1000).toBe(true);
    });

    it("handles parcels without a pin and periods without GPS", () => {
        const [a, b] = checkDeliveries(pts, [
            stop({}),
            stop({ id: "b", lat: 5.61, lng: -0.2, assignedAt: T0 + 40 * MIN, completedAt: T0 + 45 * MIN }),
        ], range);
        expect(a.kind).toBe("no-location");
        expect(b.kind).toBe("no-data");
    });

    it("treats unfinished deliveries the rider hasn't reached as pending, not failed", () => {
        const [r] = checkDeliveries(pts, [stop({ lat: 5.63, lng: -0.2, status: "ACCEPTED" })], range);
        expect(r.kind).toBe("pending");
    });
});

describe("analyzeOffTask", () => {
    // Station at 5.600 → drop-off A at 5.620 (due north, ~2.2 km). Halfway there the rider rides
    // ~3.3 km east for 6 minutes and waits there 10 minutes, then continues to A and waits.
    const mk = (i: number, lat: number, lng: number, speed: number) => ({ lat, lng, speed, gpsTime: toApiTime(T0 + i * MIN) });
    const route = [
        ...Array.from({ length: 5 }, (_, i) => mk(i, 5.600 + i * 0.002, -0.2, 25)),          // 0-4 north
        ...Array.from({ length: 3 }, (_, i) => mk(5 + i, 5.610, -0.19 + i * 0.01, 30)),       // 5-7 east (out to -0.17)
        ...Array.from({ length: 10 }, (_, i) => mk(8 + i, 5.610, -0.17, 0)),                  // 8-17 parked off route
        ...Array.from({ length: 3 }, (_, i) => mk(18 + i, 5.610, -0.18 - i * 0.01, 30)),      // 18-20 back west
        ...Array.from({ length: 5 }, (_, i) => mk(21 + i, 5.612 + i * 0.002, -0.2, 25)),      // 21-25 north to A
        ...Array.from({ length: 8 }, (_, i) => mk(26 + i, 5.620, -0.2, 0)),                   // 26-33 at A
        mk(34, 5.6201, -0.2, 0),
    ];
    const pts = normalizePoints(route);
    const range = { start: T0, end: T0 + 60 * MIN };
    const checks = checkDeliveries(pts, [{ id: "a", parcelId: "A", receiverName: "Drop A", status: "DELIVERED", lat: 5.62, lng: -0.2, completedAt: T0 + 30 * MIN }], range);
    const report = analyzeOffTask(pts, checks, summarize(pts).stops, { base: { lat: 5.6, lng: -0.2 } });

    it("finds the detour on the station → drop-off leg", () => {
        expect(checks[0].kind).toBe("visited");
        expect(report.judged).toBe(true);
        expect(report.detours).toHaveLength(1);
        const d = report.detours[0];
        expect(d.leg).toBe("Station → Drop A");
        expect(d.maxOffM).toBeGreaterThan(3000);
        expect(d.end - d.start).toBeGreaterThanOrEqual(10 * MIN);
        // Counted from the last on-route point to the next one (here 4 legs of ~1.1 km).
        expect(d.km).toBeGreaterThan(4);
        expect(d.km).toBeLessThan(5);
    });

    it("flags the stop off route but not the one at the drop-off", () => {
        expect(report.unexplainedStops).toHaveLength(1);
        expect(report.unexplainedStops[0].lng).toBeCloseTo(-0.17, 3);
    });

    it("reports direct distance as station → drop-off → station", () => {
        expect(report.directKm).toBeCloseTo(2 * distanceKm({ lat: 5.6, lng: -0.2 }, { lat: 5.62, lng: -0.2 }), 3);
    });

    it("ignores short blips and stays unjudged without reached drop-offs", () => {
        const blip = normalizePoints([mk(0, 5.6, -0.2, 20), mk(1, 5.605, -0.17, 20), mk(2, 5.61, -0.2, 20), mk(3, 5.62, -0.2, 0), mk(10, 5.62, -0.2, 0)]);
        const c = checkDeliveries(blip, [{ id: "a", parcelId: "A", status: "DELIVERED", lat: 5.62, lng: -0.2, completedAt: T0 + 5 * MIN }], range);
        expect(analyzeOffTask(blip, c, [], { base: { lat: 5.6, lng: -0.2 } }).detours).toHaveLength(0);
        expect(analyzeOffTask(blip, [], []).judged).toBe(false);
    });

    it("measures distance to a segment, not just to its ends", () => {
        expect(distanceToSegmentM({ lat: 5.61, lng: -0.2 }, { lat: 5.6, lng: -0.2 }, { lat: 5.62, lng: -0.2 })).toBeLessThan(1);
        expect(distanceToSegmentM({ lat: 5.61, lng: -0.19 }, { lat: 5.6, lng: -0.2 }, { lat: 5.62, lng: -0.2 })).toBeCloseTo(1108, -1);
    });
});

describe("analyzeOffTask with a planned route", () => {
    // The road from the station (5.600) to drop-off A (5.620) bends ~2.2 km east via 5.61,-0.18.
    const road = [{ lat: 5.6, lng: -0.2 }, { lat: 5.61, lng: -0.18 }, { lat: 5.62, lng: -0.2 }];
    const mk = (i: number, lat: number, lng: number, speed: number) => ({ lat, lng, speed, gpsTime: toApiTime(T0 + i * MIN) });
    // The rider follows that road exactly.
    const along = normalizePoints([
        ...Array.from({ length: 6 }, (_, i) => mk(i, 5.6 + i * 0.002, -0.2 + i * 0.004, 30)),
        ...Array.from({ length: 6 }, (_, i) => mk(6 + i, 5.61 + i * 0.002, -0.18 - i * 0.004, 30)),
        ...Array.from({ length: 8 }, (_, i) => mk(12 + i, 5.62, -0.2, 0)),
    ]);
    const range = { start: T0, end: T0 + 60 * MIN };
    const checks = checkDeliveries(along, [{ id: "a", parcelId: "A", receiverName: "Drop A", status: "DELIVERED", lat: 5.62, lng: -0.2, completedAt: T0 + 15 * MIN }], range);
    const base = { lat: 5.6, lng: -0.2 };

    it("doesn't flag riding the planned road, which the straight-line check would", () => {
        expect(analyzeOffTask(along, checks, [], { base }).detours).toHaveLength(1);
        expect(analyzeOffTask(along, checks, [], { base, plannedPath: road, corridorM: 500 }).detours).toHaveLength(0);
    });

    it("still flags leaving the planned road", () => {
        const off = normalizePoints([
            ...Array.from({ length: 3 }, (_, i) => mk(i, 5.6 + i * 0.002, -0.2 + i * 0.004, 30)),
            ...Array.from({ length: 8 }, (_, i) => mk(3 + i, 5.585, -0.17, 0)), // 1.7+ km south-east of the road
            ...Array.from({ length: 6 }, (_, i) => mk(11 + i, 5.61 + i * 0.002, -0.18 - i * 0.004, 30)),
            ...Array.from({ length: 6 }, (_, i) => mk(17 + i, 5.62, -0.2, 0)),
        ]);
        const c = checkDeliveries(off, [{ id: "a", parcelId: "A", receiverName: "Drop A", status: "DELIVERED", lat: 5.62, lng: -0.2, completedAt: T0 + 20 * MIN }], range);
        expect(analyzeOffTask(off, c, [], { base, plannedPath: road, corridorM: 500 }).detours).toHaveLength(1);
    });

    it("doesn't call the ride home a detour when a planned stop was skipped", () => {
        // Plan: station -> A -> far stop B (never visited) -> station. Rider does A and rides straight back.
        const plan = [{ lat: 5.6, lng: -0.2 }, { lat: 5.62, lng: -0.2 }, { lat: 5.62, lng: -0.15 }, { lat: 5.6, lng: -0.2 }];
        const trip = normalizePoints([
            ...Array.from({ length: 6 }, (_, i) => mk(i, 5.6 + i * 0.004, -0.2, 30)),
            ...Array.from({ length: 6 }, (_, i) => mk(6 + i, 5.62, -0.2, 0)),
            ...Array.from({ length: 6 }, (_, i) => mk(12 + i, 5.62 - i * 0.004, -0.2, 30)),
        ]);
        const c = checkDeliveries(trip, [
            { id: "a", parcelId: "A", receiverName: "Drop A", status: "DELIVERED", lat: 5.62, lng: -0.2, completedAt: T0 + 9 * MIN },
            { id: "b", parcelId: "B", receiverName: "Drop B", status: "DELIVERED", lat: 5.62, lng: -0.15, completedAt: T0 + 10 * MIN },
        ], range);
        expect(c[1].kind).toBe("not-visited"); // the skipped stop is caught by the delivery check instead
        expect(analyzeOffTask(trip, c, [], { base, plannedPath: plan, corridorM: 500 }).detours).toHaveLength(0);
    });

    it("measures distance to the nearest part of the path", () => {
        expect(distanceToPathM({ lat: 5.61, lng: -0.18 }, road)).toBeLessThan(1);
        expect(distanceToPathM({ lat: 5.6, lng: -0.2 }, [])).toBe(Infinity);
    });
});
