import { describe, it, expect } from "vitest";
import { fromServerCheck, type TimedPoint } from "./trackUtils";

const pts: TimedPoint[] = [0, 1, 2, 3, 4].map((i) => ({ lat: 5.6 + i * 0.001, lng: -0.18, speed: 20, t: 1000 + i * 60_000 }));

describe("fromServerCheck", () => {
    it("maps each server result to the panel's delivery check", () => {
        const { checks } = fromServerCheck({
            deliveries: [
                { assignmentId: "a1", parcelId: "P1", result: "REACHED", arrivedAt: 61_000, leftAt: 121_000, closestDistanceM: 12, receiverLatitude: 5.6, receiverLongitude: -0.18 },
                { assignmentId: "a1", parcelId: "P2", result: "NOT_REACHED", closestDistanceM: 900, closestAt: 181_000, markedAway: true, markedDistanceFromDropoffM: 850 },
                { parcelId: "P3", result: "NOT_FINISHED" },
                { parcelId: "P4", result: "NO_PIN" },
                { parcelId: "P5", result: "NO_GPS" },
            ],
        }, pts);
        expect(checks.map((c) => c.kind)).toEqual(["visited", "not-visited", "pending", "no-location", "no-data"]);
        expect(checks[0]).toMatchObject({ arrivedAt: 61_000, leftAt: 121_000, closestM: 12, markedAwayM: undefined });
        expect(checks[1]).toMatchObject({ closestM: 900, markedAwayM: 850 });
        expect(checks[0].stop).toMatchObject({ id: "a1:P1", parcelId: "P1", lat: 5.6 });
    });

    it("converts the off-task report and finds detour points on the track", () => {
        const { offTask } = fromServerCheck({
            offTask: {
                judged: true, directKm: 4.2, offRouteMinutes: 3, offRouteKm: 1.1,
                detours: [{ start: 61_000, end: 181_000, fromLabel: "Station", toLabel: "Ama", maxOffRouteM: 640, kmRidden: 1.1 }],
                offTaskStops: [{ start: 200_000, end: 900_000, lat: 5.61, lng: -0.19, minutes: 12 }],
            },
        }, pts);
        expect(offTask).toMatchObject({ judged: true, directKm: 4.2, offRouteMs: 180_000, offRouteKm: 1.1 });
        expect(offTask.detours[0]).toMatchObject({ leg: "Station → Ama", maxOffM: 640, km: 1.1, from: 1, to: 3 });
        expect(offTask.unexplainedStops[0]).toEqual({ start: 200_000, end: 900_000, lat: 5.61, lng: -0.19 });
    });

    it("treats a missing off-task block as not judged", () => {
        expect(fromServerCheck({}, pts).offTask).toMatchObject({ judged: false, detours: [], unexplainedStops: [] });
    });
});
