import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, RefreshCw, Search, Navigation, AlertTriangle, History } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useStation } from "../../contexts/StationContext";
import { useLocation as useLocations } from "../../contexts/LocationContext";
import adminService, { RiderLocation } from "../../services/adminService";
import frontdeskService from "../../services/frontdeskService";
import userService, { fromBackendRole } from "../../services/userService";
import { ACCRA_CENTER, loadGoogleMaps, MAPS_KEY_REJECTED, onGoogleMapsAuthFailure } from "../../utils/googleMaps";
import { API_V2 } from "../../config/api";

/** "+233 24 123 4567", "233241234567" and "0241234567" all become "0241234567". */
const normalizePhone = (p?: string) => {
    const d = (p ?? "").replace(/\D/g, "");
    return d.startsWith("233") ? `0${d.slice(3)}` : d;
};
import { runPool } from "../../utils/asyncPool";
import { parseGpsTime } from "./trackUtils";
import { RouteHistoryPanel } from "./RouteHistoryPanel";
import { HISTORY_LEGEND, LIVE_LEGEND, MapLegend } from "./MapLegend";

const REFRESH_MS = 30_000;
/** A fix newer than this counts as "live". */
const LIVE_WINDOW_MS = 5 * 60_000;

interface RiderRow {
    userId: string;
    name: string;
    phoneNumber: string;
    officeId?: string;
}

type RiderState =
    | { kind: "loading" }
    | { kind: "located"; loc: RiderLocation; at: number }
    | { kind: "no-signal"; loc: RiderLocation }
    | { kind: "no-device" }
    | { kind: "not-found" }
    | { kind: "forbidden" }
    | { kind: "error"; message: string };

const ago = (ms: number) => {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h} h ago`;
    return `${Math.round(h / 24)} days ago`;
};

const isLive = (st: RiderState) => st.kind === "located" && Date.now() - st.at <= LIVE_WINDOW_MS;

const describe = (st: RiderState): { label: string; tone: "live" | "stale" | "muted" | "error" } => {
    switch (st.kind) {
        case "loading": return { label: "Locating…", tone: "muted" };
        case "located": {
            const speed = st.loc.speed ? ` · ${Math.round(st.loc.speed)} km/h` : "";
            return isLive(st)
                ? { label: `Live${speed}`, tone: "live" }
                : { label: `Last seen ${ago(st.at)}`, tone: "stale" };
        }
        case "no-signal": return { label: "No GPS signal", tone: "muted" };
        case "no-device": return { label: "No GPS device", tone: "muted" };
        case "not-found": return { label: "Not found in tracking", tone: "muted" };
        case "forbidden": return { label: "No permission", tone: "error" };
        case "error": return { label: "Tracking unavailable", tone: "error" };
    }
};

const TONE_DOT = { live: "bg-green-500", stale: "bg-amber-500", muted: "bg-gray-300", error: "bg-red-500" };
const TONE_TEXT = { live: "text-green-700", stale: "text-amber-700", muted: "text-gray-500", error: "text-red-600" };
const MARKER_COLOR = { live: "#16a34a", stale: "#d97706" };

const initials = (name: string) => name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const RiderMap = (): JSX.Element => {
    const { isAdmin, userOfficeId, userOfficeName } = useStation();
    const { stations } = useLocations();

    const [riders, setRiders] = useState<RiderRow[]>([]);
    const [ridersError, setRidersError] = useState<string | null>(null);
    const [states, setStates] = useState<Record<string, RiderState>>({});
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [stationFilter, setStationFilter] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    /** Rider whose route history is open; live markers are hidden meanwhile. */
    const [historyRider, setHistoryRider] = useState<RiderRow | null>(null);

    const mapEl = useRef<HTMLDivElement>(null);
    // Google Maps objects. The project's typings only cover the address picker, so these stay loosely typed.
    const mapRef = useRef<any>(null);
    const infoRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const fittedRef = useRef(false);

    // ── Riders ──────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            setRidersError(null);
            if (isAdmin) {
                const res = await userService.getUsers({ page: 0, size: 1000 });
                if (!res.success) return setRidersError(res.message || "Couldn't load riders.");
                setRiders(
                    (res.data?.content ?? [])
                        .filter((u: any) => fromBackendRole(u.role) === "RIDER" && u.phoneNumber && u.status !== "DELETED")
                        .map((u: any) => ({ userId: u.userId, name: u.name, phoneNumber: u.phoneNumber, officeId: u.officeId ?? u.office?.id }))
                );
            } else {
                const res = await frontdeskService.getRiders();
                if (!res.success) return setRidersError(res.message || "Couldn't load riders.");
                setRiders(
                    (res.data ?? [])
                        .filter((u: any) => u.phoneNumber && u.status !== "DELETED")
                        .map((u: any) => ({ userId: u.userId, name: u.name, phoneNumber: u.phoneNumber, officeId: u.officeId ?? userOfficeId ?? undefined }))
                );
            }
        })();
    }, [isAdmin, userOfficeId]);

    const visibleRiders = useMemo(() => {
        const q = search.trim().toLowerCase();
        return riders.filter((r) =>
            (!stationFilter || r.officeId === stationFilter) &&
            (!q || r.name.toLowerCase().includes(q) || r.phoneNumber.includes(q))
        );
    }, [riders, search, stationFilter]);

    // ── Locations ───────────────────────────────────────────────
    const refresh = useCallback(async (list: RiderRow[], includeNoDevice: boolean) => {
        if (list.length === 0) return;
        setRefreshing(true);
        // Updated backend: one call for every rider. Anyone it doesn't return is asked for individually.
        const bulk: Array<[string, RiderState]> = [];
        let remaining = list;
        if (API_V2) {
            const res = await adminService.getRiderLocations();
            if (res.success && res.data) {
                const byPhone = new Map(res.data.map((l) => [normalizePhone(l.riderPhoneNumber), l]));
                const byId = new Map(res.data.map((l) => [l.riderId, l]));
                remaining = [];
                list.forEach((r) => {
                    const loc = byId.get(r.userId) ?? byPhone.get(normalizePhone(r.phoneNumber));
                    if (!loc) return remaining.push(r);
                    if (!loc.deviceImei) return bulk.push([r.userId, { kind: "no-device" }]);
                    if (loc.located === false || loc.lat == null || loc.lng == null) return bulk.push([r.userId, { kind: "no-signal", loc }]);
                    bulk.push([r.userId, { kind: "located", loc, at: parseGpsTime(loc.gpsTime) ?? Date.now() }]);
                });
            }
        }
        const results = await runPool(
            remaining.map((r) => async (): Promise<[string, RiderState] | null> => {
                // Riders without a device rarely change; only re-check them on a manual refresh.
                if (!includeNoDevice && states[r.userId]?.kind === "no-device") return null;
                const res = await adminService.getRiderLocation(r.phoneNumber);
                if (res.success && res.data) {
                    const loc = res.data;
                    const at = parseGpsTime(loc.gpsTime);
                    if (loc.located === false || loc.lat == null || loc.lng == null) return [r.userId, { kind: "no-signal", loc }];
                    return [r.userId, { kind: "located", loc, at: at ?? Date.now() }];
                }
                if (res.status === 422) return [r.userId, { kind: "no-device" }];
                if (res.status === 404) return [r.userId, { kind: "not-found" }];
                if (res.status === 403) return [r.userId, { kind: "forbidden" }];
                return [r.userId, { kind: "error", message: res.message || "Tracking unavailable" }];
            }),
            6
        );
        setStates((prev) => {
            const next = { ...prev };
            [...bulk, ...results].forEach((x) => { if (x) next[x[0]] = x[1]; });
            return next;
        });
        setLastUpdated(Date.now());
        setRefreshing(false);
    }, [states]);

    // Keep the latest refresh in a ref so the interval doesn't restart on every state change.
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        if (riders.length === 0) return;
        setStates(Object.fromEntries(riders.map((r) => [r.userId, { kind: "loading" } as RiderState])));
        refreshRef.current(riders, true);
        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") refreshRef.current(riders, false);
        }, REFRESH_MS);
        const onVisible = () => document.visibilityState === "visible" && refreshRef.current(riders, false);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [riders]);

    // ── Map ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        loadGoogleMaps()
            .then(() => {
                if (cancelled || !mapEl.current) return;
                const g = (window as any).google;
                mapRef.current = new g.maps.Map(mapEl.current, {
                    center: ACCRA_CENTER,
                    zoom: 12,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                });
                infoRef.current = new g.maps.InfoWindow();
                setMapReady(true);
            })
            .catch((e: Error) => !cancelled && setMapError(e.message || "Google Maps couldn't load."));
        const stop = onGoogleMapsAuthFailure(() => !cancelled && setMapError(MAPS_KEY_REJECTED));
        return () => { cancelled = true; stop(); };
    }, []);

    const openInfo = useCallback((r: RiderRow) => {
        const marker = markersRef.current[r.userId];
        const st = states[r.userId];
        if (!marker || !mapRef.current || st?.kind !== "located") return;
        const { loc } = st;
        const d = describe(st);
        infoRef.current?.setContent(
            `<div style="font:13px/1.4 system-ui,sans-serif;min-width:180px">
               <div style="font-weight:600;font-size:14px">${escapeHtml(r.name)}</div>
               <div style="color:#6b7280">${escapeHtml(r.phoneNumber)}</div>
               <div style="margin-top:6px">${escapeHtml(d.label)}</div>
               <div style="color:#6b7280">Fix at ${new Date(st.at).toLocaleTimeString()}</div>
               <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank" rel="noreferrer"
                  style="display:inline-block;margin-top:6px;color:#ea690c;font-weight:600">Open in Google Maps</a>
             </div>`
        );
        infoRef.current?.open({ map: mapRef.current, anchor: marker });
    }, [states]);

    // Sync markers with the latest positions.
    useEffect(() => {
        const g = (window as any).google;
        const map = mapRef.current;
        if (!g || !map) return;
        const seen = new Set<string>();
        const bounds = new g.maps.LatLngBounds();
        let count = 0;

        (historyRider ? [] : visibleRiders).forEach((r) => {
            const st = states[r.userId];
            if (st?.kind !== "located") return;
            const pos = { lat: st.loc.lat!, lng: st.loc.lng! };
            const tone = isLive(st) ? "live" : "stale";
            const icon = {
                path: g.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: MARKER_COLOR[tone],
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
            };
            let m = markersRef.current[r.userId];
            if (!m) {
                m = new g.maps.Marker({ map, position: pos, title: r.name, icon, label: { text: initials(r.name), color: "#fff", fontSize: "11px", fontWeight: "600" } });
                m.addListener("click", () => setSelected(r.userId));
                markersRef.current[r.userId] = m;
            } else {
                m.setPosition(pos);
                m.setIcon(icon);
                m.setMap(map);
            }
            seen.add(r.userId);
            bounds.extend(pos);
            count++;
        });

        Object.entries(markersRef.current).forEach(([id, m]) => {
            if (!seen.has(id)) m.setMap(null);
        });

        // Frame everyone once; after that leave the view where the user put it.
        if (!fittedRef.current && count > 0) {
            if (count === 1) { map.setCenter(bounds.getCenter()); map.setZoom(15); }
            else map.fitBounds(bounds, 48);
            fittedRef.current = true;
        }
    }, [states, visibleRiders, mapReady, historyRider]);

    useEffect(() => {
        if (!selected || historyRider) return;
        const st = states[selected];
        if (st?.kind === "located" && mapReady && mapRef.current) {
            mapRef.current.panTo({ lat: st.loc.lat, lng: st.loc.lng });
            if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
            const r = riders.find((x) => x.userId === selected);
            if (r) openInfo(r);
        }
    }, [selected, states, riders, openInfo, mapReady, historyRider]);

    // ── Summary ─────────────────────────────────────────────────
    const counts = useMemo(() => {
        const c = { live: 0, stale: 0, noDevice: 0, noSignal: 0, other: 0 };
        visibleRiders.forEach((r) => {
            const st = states[r.userId];
            if (!st || st.kind === "loading") return;
            if (st.kind === "located") isLive(st) ? c.live++ : c.stale++;
            else if (st.kind === "no-device") c.noDevice++;
            else if (st.kind === "no-signal" || st.kind === "not-found") c.noSignal++;
            else c.other++;
        });
        return c;
    }, [visibleRiders, states]);

    const allForbidden = riders.length > 0 && riders.every((r) => states[r.userId]?.kind === "forbidden");

    // Located riders first (live, then most recent), then the rest by name.
    const sortedRiders = useMemo(() => {
        const rank = (st?: RiderState) => (st?.kind === "located" ? (isLive(st) ? 0 : 1) : st?.kind === "loading" ? 2 : 3);
        return [...visibleRiders].sort((a, b) => {
            const sa = states[a.userId], sb = states[b.userId];
            const d = rank(sa) - rank(sb);
            if (d) return d;
            if (sa?.kind === "located" && sb?.kind === "located") return sb.at - sa.at;
            return a.name.localeCompare(b.name);
        });
    }, [visibleRiders, states]);

    return (
        <div className="w-full">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-800">Rider Map</h1>
                        <p className="text-sm text-[#5d5d5d] mt-1">
                            {isAdmin ? "All stations" : userOfficeName ?? "Your station"} · GPS positions refresh every 30 seconds
                            {lastUpdated && <> · updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>}
                        </p>
                    </div>
                    <Button
                        onClick={() => refresh(visibleRiders, true)}
                        disabled={refreshing || visibleRiders.length === 0}
                        variant="outline"
                        className="border border-[#d1d1d1] flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {/* Summary */}
                <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" /> {counts.live} live
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.stale} seen earlier
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-3 py-1 text-[#5d5d5d]">
                        <span className="h-2 w-2 rounded-full bg-gray-300" /> {counts.noDevice} without GPS device
                    </span>
                    {counts.noSignal > 0 && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-3 py-1 text-[#5d5d5d]">
                            <span className="h-2 w-2 rounded-full bg-gray-300" /> {counts.noSignal} no GPS signal
                        </span>
                    )}
                    {counts.other > 0 && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#d1d1d1] bg-white px-3 py-1 text-[#5d5d5d]">
                            <span className="h-2 w-2 rounded-full bg-red-500" /> {counts.other} unavailable
                        </span>
                    )}
                </div>

                {allForbidden && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        Your account isn't allowed to read rider locations. Ask an administrator for access.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
                    {/* Map (first on phones) */}
                    <Card className="order-1 lg:order-2 border border-[#d1d1d1] bg-white overflow-hidden">
                        <div className="relative h-[360px] lg:h-[calc(100vh-260px)] lg:min-h-[480px]">
                            <div ref={mapEl} className="absolute inset-0" />
                            {mapReady && !mapError && (
                                historyRider
                                    ? <MapLegend title="Route history" items={HISTORY_LEGEND} />
                                    : <MapLegend title="Riders" items={LIVE_LEGEND} />
                            )}
                            {mapError && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-50 text-center p-6">
                                    <MapPin className="w-8 h-8 text-gray-300" />
                                    <p className="text-sm font-medium text-neutral-700">The map couldn't load</p>
                                    <p className="text-xs text-[#5d5d5d] max-w-xs">{mapError} Rider positions are still listed here.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Rider list, or the route history panel */}
                    <Card className="order-2 lg:order-1 border border-[#d1d1d1] bg-white">
                        <CardContent className="p-0">
                            {historyRider ? (
                                <RouteHistoryPanel
                                    key={historyRider.userId}
                                    rider={historyRider}
                                    map={mapReady ? mapRef.current : null}
                                    onClose={() => { setHistoryRider(null); fittedRef.current = false; }}
                                />
                            ) : (<>
                            <div className="p-3 border-b border-[#ececec] space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search rider or phone"
                                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#d1d1d1] text-sm focus:outline-none focus:ring-2 focus:ring-[#ea690c]/30"
                                    />
                                </div>
                                {isAdmin && (
                                    <select
                                        value={stationFilter}
                                        onChange={(e) => { setStationFilter(e.target.value); fittedRef.current = false; }}
                                        className="w-full h-10 px-3 rounded-lg border border-[#d1d1d1] text-sm bg-white"
                                    >
                                        <option value="">All stations</option>
                                        {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}
                            </div>

                            {ridersError ? (
                                <p className="p-6 text-sm text-red-600">{ridersError}</p>
                            ) : sortedRiders.length === 0 ? (
                                <p className="p-6 text-sm text-[#5d5d5d]">{riders.length === 0 ? "Loading riders…" : "No riders match."}</p>
                            ) : (
                                <ul className="divide-y divide-[#ececec] max-h-[calc(100vh-330px)] min-h-[200px] overflow-y-auto">
                                    {sortedRiders.map((r) => {
                                        const st = states[r.userId] ?? { kind: "loading" };
                                        const d = describe(st);
                                        const clickable = st.kind === "located";
                                        return (
                                            <li key={r.userId} className={`flex items-center ${selected === r.userId ? "bg-orange-50" : ""}`}>
                                                <button
                                                    onClick={() => clickable && setSelected(r.userId)}
                                                    className={`min-w-0 flex-1 flex items-center gap-3 pl-4 pr-2 py-3 text-left ${clickable ? "hover:bg-gray-50" : "cursor-default"}`}
                                                >
                                                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${TONE_DOT[d.tone]}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-neutral-800 truncate">{r.name}</p>
                                                        <p className="text-xs text-[#9a9a9a] truncate">
                                                            {r.phoneNumber}
                                                            {isAdmin && r.officeId && ` · ${stations.find((s) => s.id === r.officeId)?.name ?? ""}`}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-medium text-right ${TONE_TEXT[d.tone]}`}>{d.label}</span>
                                                    {clickable && <Navigation className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                                </button>
                                                <button
                                                    onClick={() => { infoRef.current?.close?.(); setSelected(null); setHistoryRider(r); }}
                                                    disabled={st.kind === "no-device" || st.kind === "not-found"}
                                                    className="mr-2 h-8 w-8 shrink-0 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-neutral-800 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title={st.kind === "no-device" ? "No GPS device, so no history" : `View ${r.name}'s route history`}
                                                    aria-label={`View route history for ${r.name}`}
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            </>)}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
