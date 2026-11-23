import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, RotateCcw, Loader, MapPin, CheckCircle2, XCircle, MapPinOff, AlertTriangle, Clock, Route, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import adminService, { type ServerDeliveryCheck } from "../../services/adminService";
import { API_V2 } from "../../config/api";
import frontdeskService from "../../services/frontdeskService";
import { decodePolyline, type LatLng } from "../../utils/routePlan";
import {
    CORRIDOR_M, PLANNED_ROAD_CORRIDOR_M, DeliveryCheck, DeliveryStop, EXPLAINED_STOP_M, MIN_DETOUR_MS, OffTaskReport, Stop, TimedPoint, VISIT_RADIUS_M,
    analyzeOffTask, checkDeliveries, formatDistance, formatDuration, fromServerCheck,
    indexAt, normalizePoints, positionAt, summarize, toApiTime, validateRange,
} from "./trackUtils";

const FINISHED = ["DELIVERED", "RETURNED", "COMPLETED", "CANCELLED"];

/** One stop per parcel from GET /api-frontdesk/rider/{riderId}/assignments. */
const toStops = (assignments: any[]): DeliveryStop[] =>
    assignments.flatMap((a) =>
        (a.parcels ?? (a.parcel ? [a.parcel] : [])).map((p: any) => ({
            id: `${a.assignmentId}:${p.parcelId}`,
            parcelId: p.parcelId,
            receiverName: p.receiverName,
            locationName: p.receiverLocationName ?? p.receiverAddress,
            lat: p.receiverLatitude ?? undefined,
            lng: p.receiverLongitude ?? undefined,
            assignedAt: a.assignedAt ?? undefined,
            completedAt: FINISHED.includes(a.status) ? a.completedAt ?? undefined : undefined,
            status: p.returned ? "RETURNED" : p.delivered ? "DELIVERED" : a.status,
        }))
    );

const PIN_PATH = "M12 1.5C7.6 1.5 4 5 4 9.4 4 15.3 12 22.5 12 22.5S20 15.3 20 9.4C20 5 16.4 1.5 12 1.5z";
const DETOUR_COLOR = "#dc2626";
const OFF_TASK_STOP_COLOR = "#7c3aed";

const CHECK_COLOR = { visited: "#16a34a", "not-visited": "#dc2626", pending: "#6b7280", "no-data": "#6b7280", "no-location": "#6b7280" } as const;

type Preset = "today" | "yesterday" | "custom";
const SPEEDS = [1, 10, 60] as const;
const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();

/** "2026-11-22T08:30" for <input type="datetime-local"> in local time. */
const toLocalInput = (ms: number) => {
    const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).getTime() : NaN);

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const clockSec = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

interface Props {
    rider: { userId: string; name: string; phoneNumber: string };
    /** The shared google.maps.Map, or null while it loads / if it can't. */
    map: any;
    onClose: () => void;
}

/**
 * Route playback for one rider, drawn on the Rider Map's Google Map.
 * Uses GET /api-admin/riders/track (max 2 days per request, last 3 months).
 */
export const RouteHistoryPanel = ({ rider, map, onClose }: Props) => {
    const [preset, setPreset] = useState<Preset>("today");
    const [customStart, setCustomStart] = useState(() => toLocalInput(startOfToday() - DAY));
    const [customEnd, setCustomEnd] = useState(() => toLocalInput(Date.now()));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [points, setPoints] = useState<TimedPoint[] | null>(null);
    const [current, setCurrent] = useState(0); // playback time, epoch ms
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(60);
    const [stops, setStops] = useState<DeliveryStop[] | null>(null);
    const [stopsError, setStopsError] = useState<string | null>(null);
    /** Route(s) the manager confirmed for these deliveries, joined in planning order. */
    const [planned, setPlanned] = useState<{ path: LatLng[]; road: boolean; count: number } | null>(null);
    /** The backend's own delivery check (updated backend). When present it replaces the in-browser check. */
    const [serverCheck, setServerCheck] = useState<ServerDeliveryCheck | null>(null);

    const range = useMemo(() => {
        const now = Date.now();
        if (preset === "today") return { start: startOfToday(), end: now };
        if (preset === "yesterday") return { start: startOfToday() - DAY, end: startOfToday() - 1 };
        return { start: fromLocalInput(customStart), end: Math.min(fromLocalInput(customEnd), now) };
    }, [preset, customStart, customEnd]);
    const rangeError = validateRange(range.start, range.end);

    // ── Load ────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (rangeError) return;
        setLoading(true);
        setError(null);
        setPlaying(false);
        const [res, del, chk] = await Promise.all([
            adminService.getRiderTrack(rider.phoneNumber, toApiTime(range.start), toApiTime(range.end)),
            frontdeskService.getRiderAssignments(rider.userId),
            API_V2 ? adminService.getDeliveryCheck(rider.phoneNumber, toApiTime(range.start), toApiTime(range.end)) : Promise.resolve(null),
        ]);
        setLoading(false);
        setServerCheck(chk?.success && chk.data ? chk.data : null);
        if (del.success && Array.isArray(del.data)) {
            // Deliveries finished in the range, plus ones still open that were assigned before it ended.
            const inRange = toStops(del.data).filter((s) =>
                s.completedAt != null
                    ? s.completedAt >= range.start && s.completedAt <= range.end
                    : (s.assignedAt ?? 0) <= range.end && !FINISHED.includes(s.status)
            ).sort((a, b) => (a.completedAt ?? Infinity) - (b.completedAt ?? Infinity));
            setStops(inRange);
            setStopsError(null);
            // Plans attached to these deliveries' assignments (one plan may repeat across assignments).
            const ids = new Set(inRange.map((s) => s.parcelId));
            const plans = new Map<string, any>();
            (del.data as any[]).forEach((a) => {
                const pl = a.routePlan;
                if (pl?.encodedPath && (a.parcels ?? []).some((p: any) => ids.has(p.parcelId))) {
                    plans.set(`${pl.plannedAt ?? ""}|${(pl.stopOrder ?? []).join(",")}`, pl);
                }
            });
            const ordered = Array.from(plans.values()).sort((x, y) => (x.plannedAt ?? 0) - (y.plannedAt ?? 0));
            setPlanned(ordered.length
                ? { path: ordered.flatMap((pl) => decodePolyline(pl.encodedPath)), road: ordered.every((pl) => pl.method === "GOOGLE"), count: ordered.length }
                : null);
        } else {
            setStops(null);
            setPlanned(null);
            setStopsError(del.message || "Couldn't load this rider's deliveries.");
        }
        if (!res.success) {
            setPoints(null);
            setError(
                res.status === 422 ? "This rider has no GPS device assigned. Assign one in User Management." :
                res.status === 404 ? "This rider wasn't found in the tracking system." :
                res.status === 403 ? "Your account isn't allowed to view rider routes." :
                res.status === 502 ? "The GPS tracking service didn't respond. Try again in a moment." :
                res.message || "Couldn't load the route."
            );
            return;
        }
        const pts = normalizePoints(res.data?.trackPoints);
        setPoints(pts);
        setCurrent(pts[0]?.t ?? 0);
    }, [rider.phoneNumber, rider.userId, range.start, range.end, rangeError]);

    // Presets load straight away; custom ranges wait for the Load button.
    useEffect(() => {
        if (preset !== "custom") load();
        else { setPlaying(false); setPoints(null); setError(null); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset, rider.phoneNumber]);

    const summary = useMemo(() => (points ? summarize(points) : null), [points]);
    const server = useMemo(() => (points && serverCheck ? fromServerCheck(serverCheck, points) : null), [points, serverCheck]);
    const checks = useMemo<DeliveryCheck[]>(
        () => server?.checks ?? (points && stops ? checkDeliveries(points, stops, range) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [server, points, stops]
    );
    const tally = useMemo(() => {
        const t = { visited: 0, "not-visited": 0, pending: 0, "no-location": 0, "no-data": 0, markedAway: 0 };
        checks.forEach((c) => {
            t[c.kind]++;
            if ((c.kind === "visited" || c.kind === "not-visited") && c.markedAwayM) t.markedAway++;
        });
        return t;
    }, [checks]);
    const offTask = useMemo<OffTaskReport | null>(
        () => server?.offTask ?? (points && summary && stops
            ? analyzeOffTask(points, checks, summary.stops, planned
                ? { plannedPath: planned.path, corridorM: planned.road ? PLANNED_ROAD_CORRIDOR_M : CORRIDOR_M }
                : {})
            : null),
        [server, points, summary, stops, checks, planned]
    );
    const isOffTaskStop = (st: Stop) => !!offTask?.unexplainedStops.some((u) => u.start === st.start);
    const first = points?.[0]?.t ?? 0;
    const last = points?.[points.length - 1]?.t ?? 0;
    const here = points ? positionAt(points, current) : null;

    // ── Playback loop ───────────────────────────────────────────
    const frame = useRef<number>();
    useEffect(() => {
        if (!playing || !points?.length) return;
        let prev = performance.now();
        const tick = (now: number) => {
            const dt = now - prev;
            prev = now;
            setCurrent((t) => {
                const next = t + dt * speed;
                if (next >= last) { setPlaying(false); return last; }
                return next;
            });
            frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        return () => { if (frame.current) cancelAnimationFrame(frame.current); };
    }, [playing, speed, points, last]);

    const togglePlay = () => {
        if (!points?.length) return;
        if (!playing && current >= last) setCurrent(first); // replay from the start
        setPlaying((p) => !p);
    };

    // ── Map drawing ─────────────────────────────────────────────
    const shapes = useRef<{ route?: any; travelled?: any; rider?: any; fixed: any[] }>({ fixed: [] });
    const lastIdx = useRef(-2);

    useEffect(() => {
        const g = (window as any).google;
        if (!g || !map || !points || points.length === 0) return;
        const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
        const s = shapes.current;
        s.route = new g.maps.Polyline({ map, path, strokeColor: "#9ca3af", strokeOpacity: 0.9, strokeWeight: 4 });
        s.travelled = new g.maps.Polyline({ map, path: [], strokeColor: "#ea690c", strokeOpacity: 1, strokeWeight: 5 });
        const pin = (pos: { lat: number; lng: number }, color: string, text: string, title: string, scale = 11) =>
            new g.maps.Marker({
                map, position: pos, title,
                icon: { path: g.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                label: text ? { text, color: "#fff", fontSize: "10px", fontWeight: "700" } : undefined,
            });
        s.fixed.push(pin(path[0], "#16a34a", "S", `Start ${clock(points[0].t)}`));
        s.fixed.push(pin(path[path.length - 1], "#111827", "E", `End ${clock(points[points.length - 1].t)}`));
        s.rider = new g.maps.Marker({
            map, position: path[0], title: rider.name, zIndex: 10,
            icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#ea690c", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
        });
        const bounds = new g.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 48);
        lastIdx.current = -2;
        return () => {
            s.route?.setMap(null);
            s.travelled?.setMap(null);
            s.rider?.setMap(null);
            s.fixed.forEach((m) => m.setMap(null));
            shapes.current = { fixed: [] };
        };
    }, [map, points, summary, rider.name]);

    // Stops (amber) and off-task stops (purple), plus red detour sections over the route.
    useEffect(() => {
        const g = (window as any).google;
        if (!g || !map || !points || !summary) return;
        const made: any[] = [];
        summary.stops.forEach((st) => {
            const off = isOffTaskStop(st);
            const m = new g.maps.Marker({
                map, position: { lat: st.lat, lng: st.lng }, zIndex: off ? 6 : 4,
                title: `${off ? "Stop not at a drop-off" : "Stopped"} ${formatDuration(st.end - st.start)} (${clock(st.start)}–${clock(st.end)})`,
                icon: { path: g.maps.SymbolPath.CIRCLE, scale: off ? 9 : 7, fillColor: off ? OFF_TASK_STOP_COLOR : "#d97706", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                label: off ? { text: "?", color: "#fff", fontSize: "10px", fontWeight: "700" } : undefined,
            });
            m.addListener("click", () => { setPlaying(false); setCurrent(st.start); });
            made.push(m);
        });
        offTask?.detours.forEach((d) => {
            const path = points.slice(Math.max(0, d.from - 1), Math.min(points.length, d.to + 2)).map((p) => ({ lat: p.lat, lng: p.lng }));
            const line = new g.maps.Polyline({ map, path, strokeColor: DETOUR_COLOR, strokeOpacity: 0.95, strokeWeight: 6, zIndex: 3 });
            line.addListener?.("click", () => { setPlaying(false); setCurrent(d.start); });
            made.push(line);
        });
        return () => made.forEach((m) => m.setMap(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, points, summary, offTask]);

    // The planned route, under everything else.
    useEffect(() => {
        const g = (window as any).google;
        if (!g || !map || !planned) return;
        const line = new g.maps.Polyline({ map, path: planned.path, strokeColor: "#2563eb", strokeOpacity: 0.45, strokeWeight: 4, zIndex: 1 });
        return () => line.setMap(null);
    }, [map, planned]);

    // Drop-off pins, coloured by whether the GPS reached them.
    useEffect(() => {
        const g = (window as any).google;
        if (!g || !map || checks.length === 0) return;
        const made = checks
            .filter((c) => c.stop.lat != null && c.stop.lng != null)
            .map((c) => {
                const m = new g.maps.Marker({
                    map, position: { lat: c.stop.lat, lng: c.stop.lng }, zIndex: 5,
                    title: `${c.stop.receiverName ?? c.stop.parcelId}: ${c.kind === "visited" ? "reached" : c.kind === "not-visited" ? "not reached" : c.kind === "pending" ? "not finished" : "no GPS"}`,
                    icon: { path: PIN_PATH, fillColor: CHECK_COLOR[c.kind], fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5, scale: 1.3, anchor: new g.maps.Point(12, 22.5) },
                });
                m.addListener("click", () => jumpTo(c));
                return m;
            });
        return () => made.forEach((m) => m.setMap(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, checks]);

    const jumpTo = (c: DeliveryCheck) => {
        setPlaying(false);
        if (c.kind === "visited") setCurrent(c.arrivedAt);
        else if (c.kind === "not-visited") setCurrent(c.closestAt);
        if (c.stop.lat != null && c.stop.lng != null) map?.panTo({ lat: c.stop.lat, lng: c.stop.lng });
    };

    // Move the rider marker every frame; extend the orange line only when a new point is passed.
    useEffect(() => {
        const s = shapes.current;
        if (!points || !here || !s.rider) return;
        s.rider.setPosition({ lat: here.lat, lng: here.lng });
        const idx = indexAt(points, current);
        if (idx !== lastIdx.current) {
            lastIdx.current = idx;
            s.travelled?.setPath(points.slice(0, idx + 1).map((p) => ({ lat: p.lat, lng: p.lng })));
        }
    }, [points, here, current]);

    // Shown both with and without GPS points, so deliveries are never hidden.
    const deliveriesSection = (
        <>
                    {/* Deliveries vs movement */}
                    <div className="p-3 border-b border-[#ececec]">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-neutral-700">
                                Deliveries · {checks.length}
                                <span className="ml-1.5 font-normal text-[10px] text-[#9a9a9a]" title={server ? "Result from the backend's delivery check" : "Worked out in the browser from the GPS track"}>
                                    {server ? "checked by server" : "checked in browser"}
                                </span>
                            </p>
                            {checks.length > 0 && (
                                <p className="text-[11px] text-[#5d5d5d]">
                                    <span className="text-green-700 font-medium">{tally.visited} reached</span>
                                    {tally["not-visited"] > 0 && <> · <span className="text-red-600 font-medium">{tally["not-visited"]} not reached</span></>}
                                    {tally.pending > 0 && <> · {tally.pending} not finished</>}
                                    {tally["no-location"] > 0 && <> · {tally["no-location"]} no pin</>}
                                    {tally["no-data"] > 0 && <> · {tally["no-data"]} no GPS</>}
                                </p>
                            )}
                        </div>
                        {stopsError ? (
                            <p className="text-xs text-red-600">{stopsError}</p>
                        ) : checks.length === 0 ? (
                            <p className="text-xs text-[#9a9a9a]">No deliveries in this period.</p>
                        ) : (
                            <ul className="space-y-1 max-h-[260px] overflow-y-auto">
                                {checks.map((c) => {
                                    const st = c.stop;
                                    const when = st.completedAt ? clock(st.completedAt) : null;
                                    const marked = st.status === "RETURNED" ? "Returned" : when ?? "Open";
                                    return (
                                        <li key={st.id}>
                                            <button onClick={() => jumpTo(c)} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-left">
                                                {c.kind === "visited" ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                                                    : c.kind === "not-visited" ? <XCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                                                    : c.kind === "pending" ? <Clock className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                                                    : <MapPinOff className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm text-neutral-800 truncate">{st.receiverName ?? st.parcelId}</span>
                                                    <span className="block text-[11px] text-[#9a9a9a] truncate">{st.locationName ?? "No address"}</span>
                                                    <span className="block text-xs text-[#5d5d5d] truncate">
                                                        {c.kind === "visited" && <>Arrived {clock(c.arrivedAt)} · {formatDuration(Math.max(60_000, c.leftAt - c.arrivedAt))}</>}
                                                        {c.kind === "not-visited" && <span className="text-red-700">Not reached · closest {formatDistance(c.closestM)}</span>}
                                                        {c.kind === "pending" && <>Not reached yet{c.closestM != null && Number.isFinite(c.closestM) ? ` · closest ${formatDistance(c.closestM)}` : ""}</>}
                                                        {c.kind === "no-location" && "No pin saved for this parcel"}
                                                        {c.kind === "no-data" && "No GPS points during this delivery"}
                                                    </span>
                                                    {(c.kind === "visited" || c.kind === "not-visited") && c.markedAwayM && (
                                                        <span className="flex items-center gap-1 text-[11px] text-amber-700 whitespace-nowrap">
                                                            <AlertTriangle className="w-3 h-3" /> Marked {st.status === "RETURNED" ? "returned" : "delivered"} {formatDistance(c.markedAwayM)} away
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[11px] text-[#9a9a9a] shrink-0 text-right tabular-nums" title={st.completedAt ? `Marked ${st.status === "RETURNED" ? "returned" : "delivered"} at ${when}` : "Not marked done yet"}>{marked}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <p className="text-[11px] text-[#9a9a9a] mt-2">
                            Reached = GPS came within {VISIT_RADIUS_M} m of the pinned drop-off between assignment and 30 min after it was marked.
                        </p>
                    </div>

        </>
    );

    // ── UI ──────────────────────────────────────────────────────
    const presetBtn = (key: Preset, label: string) => (
        <button
            key={key}
            onClick={() => setPreset(key)}
            className={`flex-1 h-9 rounded-md text-sm font-medium transition ${preset === key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b border-[#ececec]">
                <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Back to live map">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{rider.name} · route history</p>
                    <p className="text-xs text-[#9a9a9a]">{rider.phoneNumber}</p>
                </div>
            </div>

            <div className="p-3 space-y-3 border-b border-[#ececec]">
                <div className="flex p-1 rounded-lg bg-gray-100">
                    {presetBtn("today", "Today")}
                    {presetBtn("yesterday", "Yesterday")}
                    {presetBtn("custom", "Custom")}
                </div>
                {preset === "custom" && (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-neutral-700">
                            From
                            <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                                className="mt-1 w-full h-9 px-2 rounded-lg border border-[#d1d1d1] text-sm" />
                        </label>
                        <label className="block text-xs font-medium text-neutral-700">
                            To
                            <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                                className="mt-1 w-full h-9 px-2 rounded-lg border border-[#d1d1d1] text-sm" />
                        </label>
                        {rangeError ? (
                            <p className="text-xs text-red-600">{rangeError}</p>
                        ) : (
                            <p className="text-xs text-[#9a9a9a]">Up to 2 days at a time, within the last 3 months.</p>
                        )}
                        <Button onClick={load} disabled={!!rangeError || loading} className="w-full bg-[#ea690c] text-white hover:bg-[#ea690c]/90">
                            Load route
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-sm text-[#5d5d5d]">
                    <Loader className="w-4 h-4 animate-spin" /> Loading route…
                </div>
            ) : error ? (
                <div className="p-6 text-sm text-red-600 space-y-3">
                    <p>{error}</p>
                    <Button onClick={load} variant="outline" className="border border-[#d1d1d1]">Try again</Button>
                </div>
            ) : points && points.length === 0 ? (
                <>
                    <div className="p-6 text-center text-sm text-[#5d5d5d] border-b border-[#ececec]">
                        <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                        No GPS points were recorded in this period.
                    </div>
                    {deliveriesSection}
                </>
            ) : points && summary ? (
                <>
                    {/* Player */}
                    <div className="p-3 space-y-2 border-b border-[#ececec]">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={togglePlay}
                                className="h-10 w-10 shrink-0 rounded-full bg-[#ea690c] text-white flex items-center justify-center active:scale-95"
                                aria-label={playing ? "Pause" : current >= last ? "Replay" : "Play"}
                            >
                                {playing ? <Pause className="w-4 h-4" /> : current >= last ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-neutral-800 tabular-nums">{clockSec(current || first)}</p>
                                <p className="text-xs text-[#5d5d5d]">{here ? `${Math.round(here.speed)} km/h` : ""}</p>
                            </div>
                            <div className="flex rounded-lg border border-[#d1d1d1] overflow-hidden" role="group" aria-label="Playback speed">
                                {SPEEDS.map((sp) => (
                                    <button
                                        key={sp}
                                        onClick={() => setSpeed(sp)}
                                        className={`px-2.5 h-8 text-xs font-medium ${speed === sp ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-gray-50"}`}
                                        aria-pressed={speed === sp}
                                    >
                                        {sp}×
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="range"
                            min={first}
                            max={last}
                            step={1000}
                            value={current || first}
                            onChange={(e) => { setPlaying(false); setCurrent(Number(e.target.value)); }}
                            className="w-full accent-[#ea690c]"
                            aria-label="Playback position"
                        />
                        <div className="flex justify-between text-[11px] text-[#9a9a9a] tabular-nums">
                            <span>{clock(first)}</span>
                            <span>{clock(last)}</span>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-px bg-[#ececec] border-b border-[#ececec]">
                        {[
                            ["Distance", `${summary.distanceKm.toFixed(1)} km`],
                            ["Top speed", `${Math.round(summary.maxSpeed)} km/h`],
                            ["Moving", formatDuration(summary.movingMs)],
                            ["Stopped", formatDuration(summary.stoppedMs)],
                        ].map(([k, v]) => (
                            <div key={k} className="bg-white px-3 py-2.5">
                                <p className="text-[11px] text-[#9a9a9a]">{k}</p>
                                <p className="text-sm font-semibold text-neutral-800">{v}</p>
                            </div>
                        ))}
                    </div>

                    {/* Off-task: detours and stops away from the day's work */}
                    {offTask && (
                        <div className="p-3 border-b border-[#ececec]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-neutral-700">Off-task</p>
                                {offTask.judged && offTask.detours.length === 0 && offTask.unexplainedStops.length === 0 ? (
                                    <p className="flex items-center gap-1 text-[11px] font-medium text-green-700"><ShieldCheck className="w-3.5 h-3.5" /> Stayed on task</p>
                                ) : (
                                    <p className="text-[11px] text-[#5d5d5d]">
                                        {offTask.detours.length > 0 && <span className="text-red-600 font-medium">{offTask.detours.length} detour{offTask.detours.length === 1 ? "" : "s"}</span>}
                                        {offTask.detours.length > 0 && offTask.unexplainedStops.length > 0 && " · "}
                                        {offTask.unexplainedStops.length > 0 && <span className="text-violet-700 font-medium">{offTask.unexplainedStops.length} stop{offTask.unexplainedStops.length === 1 ? "" : "s"} away from drop-offs</span>}
                                    </p>
                                )}
                            </div>

                            {offTask.judged ? (
                                <div className="grid grid-cols-3 gap-2 mb-2 text-center">
                                    {[
                                        ["Direct route", `${offTask.directKm.toFixed(1)} km`],
                                        ["Covered", `${summary.distanceKm.toFixed(1)} km`],
                                        ["Off route", offTask.offRouteMs ? `${formatDuration(offTask.offRouteMs)} · ${offTask.offRouteKm.toFixed(1)} km` : "0 min"],
                                    ].map(([k, v]) => (
                                        <div key={k} className="rounded-md bg-gray-50 px-1.5 py-1.5">
                                            <p className="text-[10px] text-[#9a9a9a]">{k}</p>
                                            <p className={`text-xs font-semibold ${k === "Off route" && offTask.offRouteMs ? "text-red-600" : "text-neutral-800"}`}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-[#9a9a9a] mb-2">{offTask.reason} Detours can't be measured, but stops away from drop-offs are still listed.</p>
                            )}

                            {(offTask.detours.length > 0 || offTask.unexplainedStops.length > 0) && (
                                <ul className="space-y-1 max-h-[220px] overflow-y-auto">
                                    {[
                                        ...offTask.detours.map((d) => ({ at: d.start, kind: "detour" as const, d })),
                                        ...offTask.unexplainedStops.map((st) => ({ at: st.start, kind: "stop" as const, st })),
                                    ].sort((a, b) => a.at - b.at).map((it) => it.kind === "detour" ? (
                                        <li key={`d${it.d.start}`}>
                                            <button
                                                onClick={() => { setPlaying(false); setCurrent(it.d.start); const p = points[Math.round((it.d.from + it.d.to) / 2)]; map?.panTo({ lat: p.lat, lng: p.lng }); }}
                                                className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-left"
                                            >
                                                <Route className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm text-neutral-800 tabular-nums">Detour {clock(it.d.start)}–{clock(it.d.end)}</span>
                                                    <span className="block text-[11px] text-[#9a9a9a] truncate">{it.d.leg}</span>
                                                    <span className="block text-xs text-red-700">Up to {formatDistance(it.d.maxOffM)} off route · {it.d.km.toFixed(1)} km ridden</span>
                                                </span>
                                                <span className="text-[11px] text-[#9a9a9a] shrink-0">{formatDuration(it.d.end - it.d.start)}</span>
                                            </button>
                                        </li>
                                    ) : (
                                        <li key={`s${it.st.start}`}>
                                            <button
                                                onClick={() => { setPlaying(false); setCurrent(it.st.start); map?.panTo({ lat: it.st.lat, lng: it.st.lng }); }}
                                                className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-left"
                                            >
                                                <span className="mt-0.5 h-4 w-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">?</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm text-neutral-800 tabular-nums">Stopped {clock(it.st.start)}–{clock(it.st.end)}</span>
                                                    <span className="block text-xs text-violet-700">Not at a drop-off, the start or the end</span>
                                                </span>
                                                <span className="text-[11px] text-[#9a9a9a] shrink-0">{formatDuration(it.st.end - it.st.start)}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-[11px] text-[#9a9a9a] mt-2">
                                {planned
                                    ? <>Detour = over {formatDistance(planned.road ? PLANNED_ROAD_CORRIDOR_M : CORRIDOR_M)} from the planned route (blue line{planned.road ? ", road route from Google" : ", straight-line plan"}) for {formatDuration(MIN_DETOUR_MS)}+.</>
                                    : <>Detour = over {formatDistance(CORRIDOR_M)} from the straight line between consecutive drop-offs for {formatDuration(MIN_DETOUR_MS)}+. No route was planned for these deliveries, and roads aren't straight, so check flagged stretches on the map.</>}
                                {" "}Stops within {EXPLAINED_STOP_M} m of a drop-off, the start or the end count as on task.
                            </p>
                        </div>
                    )}

                    {deliveriesSection}

                    {/* Stops */}
                    <div className="p-3">
                        <p className="text-xs font-semibold text-neutral-700 mb-2">
                            Stops over 5 min · {summary.stops.length}
                        </p>
                        {summary.stops.length === 0 ? (
                            <p className="text-xs text-[#9a9a9a]">No long stops in this period.</p>
                        ) : (
                            <ul className="space-y-1 max-h-[220px] overflow-y-auto">
                                {summary.stops.map((st) => (
                                    <li key={st.start}>
                                        <button
                                            onClick={() => { setPlaying(false); setCurrent(st.start); map?.panTo({ lat: st.lat, lng: st.lng }); }}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-left"
                                        >
                                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOffTaskStop(st) ? "bg-violet-600" : "bg-amber-500"}`} />
                                            <span className="text-sm text-neutral-800 tabular-nums">{clock(st.start)}–{clock(st.end)}</span>
                                            {isOffTaskStop(st) && <span className="text-[10px] font-medium text-violet-700">off-task</span>}
                                            <span className="ml-auto text-xs text-[#5d5d5d]">{formatDuration(st.end - st.start)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="px-3 pb-3 text-[11px] text-[#9a9a9a]">
                        {points.length} GPS points · {clock(first)}–{clock(last)}
                    </p>
                </>
            ) : null}
        </div>
    );
};
