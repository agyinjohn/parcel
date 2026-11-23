import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader, MapPinOff, RefreshCw, Route, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "../utils/googleMaps";
import {
    LatLng, PlanStop, RoutePlan, encodePolyline, estimatePlan, formatMinutes, planRoute, planWithGoogle,
} from "../utils/routePlan";
import type { AssignmentRoutePlan } from "../services/frontdeskService";

export interface PlannableParcel {
    parcelId: string;
    receiverName?: string;
    receiverAddress?: string;
    receiverLocationName?: string | null;
    receiverLatitude?: number | null;
    receiverLongitude?: number | null;
}

/** Turns a confirmed plan into what the backend stores with the assignment. */
export const toAssignmentPlan = (plan: RoutePlan): AssignmentRoutePlan => ({
    method: plan.method,
    stopOrder: plan.order,
    totalKm: Math.round(plan.totalKm * 10) / 10,
    totalMinutes: Math.round(plan.totalMinutes),
    legs: plan.legs.map((l) => ({ ...l, km: Math.round(l.km * 100) / 100, minutes: Math.round(l.minutes) })),
    encodedPath: encodePolyline(plan.path),
    startLatitude: plan.start?.lat,
    startLongitude: plan.start?.lng,
    edited: !!plan.edited,
    plannedAt: plan.computedAt,
});

interface Props {
    parcels: PlannableParcel[];
    /** The rider's station; the route starts and ends there when known. */
    station?: (LatLng & { name?: string }) | null;
    /** Reports the current plan (null while planning) and the full parcel order to assign in. */
    onChange: (plan: RoutePlan | null, parcelOrder: string[]) => void;
}

/**
 * Plans the best order for a rider's deliveries (Google road route when available, otherwise a
 * straight-line estimate), shows it on a map and lets the manager reorder before assigning.
 */
export const RoutePlanPanel = ({ parcels, station, onChange }: Props) => {
    const stops: PlanStop[] = useMemo(
        () => parcels
            .filter((p) => p.receiverLatitude != null && p.receiverLongitude != null)
            .map((p) => ({ id: p.parcelId, lat: p.receiverLatitude!, lng: p.receiverLongitude!, label: p.receiverName || p.parcelId })),
        [parcels]
    );
    const unpinned = useMemo(() => parcels.filter((p) => p.receiverLatitude == null || p.receiverLongitude == null), [parcels]);
    const byId = useMemo(() => new Map(parcels.map((p) => [p.parcelId, p])), [parcels]);
    const start = station ? { lat: station.lat, lng: station.lng } : undefined;

    const [plan, setPlan] = useState<RoutePlan | null>(null);
    const [note, setNote] = useState<string | undefined>();
    const [busy, setBusy] = useState(true);
    const directions = useRef<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const mapEl = useRef<HTMLDivElement>(null);
    const map = useRef<any>(null);

    const report = useCallback((p: RoutePlan | null) => {
        setPlan(p);
        onChange(p, p ? [...p.order, ...unpinned.map((u) => u.parcelId)] : parcels.map((x) => x.parcelId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unpinned, parcels]);

    const optimise = useCallback(async () => {
        setBusy(true);
        report(null);
        const r = await planRoute(stops, { start, end: start, directionsService: directions.current ?? undefined });
        setNote(r.fallbackReason);
        report(r.plan);
        setBusy(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stops, station?.lat, station?.lng]);

    // Load Google (for road distances and the map), then plan.
    useEffect(() => {
        let cancelled = false;
        loadGoogleMaps()
            .then(() => {
                if (cancelled) return;
                const g = (window as any).google;
                directions.current = new g.maps.DirectionsService();
                if (mapEl.current) {
                    map.current = new g.maps.Map(mapEl.current, { center: start ?? stops[0] ?? { lat: 5.6037, lng: -0.187 }, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
                    setMapReady(true);
                }
            })
            .catch(() => { /* no Google: the estimate is used and the map area explains */ })
            .finally(() => { if (!cancelled) optimise(); });
        // Key rejected after loading: drop Google and re-plan with the built-in estimate.
        const stop = onGoogleMapsAuthFailure(() => {
            if (cancelled) return;
            directions.current = null;
            map.current = null;
            setMapReady(false);
            optimise();
        });
        return () => { cancelled = true; stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Move a stop and re-measure: by road when Google is there, otherwise estimated. */
    const move = async (index: number, delta: -1 | 1) => {
        if (!plan) return;
        const order = plan.order.slice();
        const j = index + delta;
        if (j < 0 || j >= order.length) return;
        [order[index], order[j]] = [order[j], order[index]];
        const ordered = order.map((id) => stops.find((s) => s.id === id)!);
        const quick = estimatePlan(ordered, start, start, true);
        report(quick); // show the new order straight away
        if (directions.current) {
            try {
                const road = await planWithGoogle(directions.current, ordered, { start, end: start, optimize: false });
                report(road);
            } catch { /* keep the estimate */ }
        }
    };

    // Draw the plan.
    useEffect(() => {
        const g = (window as any).google;
        if (!g || !mapReady || !map.current || !plan) return;
        const made: any[] = [];
        made.push(new g.maps.Polyline({ map: map.current, path: plan.path, strokeColor: "#ea690c", strokeOpacity: 0.9, strokeWeight: 4 }));
        if (start) {
            made.push(new g.maps.Marker({
                map: map.current, position: start, title: station?.name ?? "Station", zIndex: 5,
                icon: { path: g.maps.SymbolPath.CIRCLE, scale: 11, fillColor: "#111827", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                label: { text: "S", color: "#fff", fontSize: "10px", fontWeight: "700" },
            }));
        }
        const bounds = new g.maps.LatLngBounds();
        if (start) bounds.extend(start);
        plan.order.forEach((id, i) => {
            const s = stops.find((x) => x.id === id);
            if (!s) return;
            bounds.extend(s);
            made.push(new g.maps.Marker({
                map: map.current, position: s, title: `${i + 1}. ${s.label}`, zIndex: 6,
                icon: { path: g.maps.SymbolPath.CIRCLE, scale: 11, fillColor: "#ea690c", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
                label: { text: String(i + 1), color: "#fff", fontSize: "11px", fontWeight: "700" },
            }));
        });
        if (plan.order.length) map.current.fitBounds(bounds, 40);
        return () => made.forEach((m) => m.setMap(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan, mapReady]);

    const legKm = (id: string) => plan?.legs.find((l) => l.to === id);

    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
            <div className="relative h-[280px] md:h-[420px] rounded-lg border border-[#d1d1d1] overflow-hidden bg-gray-50">
                <div ref={mapEl} className="absolute inset-0" />
                {!mapReady && (
                    <div className="absolute inset-0 z-10 bg-gray-50 flex flex-col items-center justify-center text-center p-4 text-xs text-[#5d5d5d]">
                        <Route className="w-6 h-6 text-gray-300 mb-1" />
                        Map unavailable. The planned order is listed on the right.
                    </div>
                )}
            </div>

            <div className="flex flex-col min-h-0">
                {busy ? (
                    <div className="flex items-center gap-2 text-sm text-[#5d5d5d] py-6"><Loader className="w-4 h-4 animate-spin" /> Planning the best route…</div>
                ) : stops.length === 0 ? (
                    <p className="text-sm text-[#5d5d5d] py-4">None of these parcels have a delivery pin, so there's no route to plan.</p>
                ) : plan && (
                    <>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="rounded-md bg-gray-50 px-3 py-2">
                                <p className="text-[11px] text-[#9a9a9a]">Distance</p>
                                <p className="text-sm font-semibold text-neutral-800">{plan.totalKm.toFixed(1)} km</p>
                            </div>
                            <div className="rounded-md bg-gray-50 px-3 py-2">
                                <p className="text-[11px] text-[#9a9a9a]">Riding time</p>
                                <p className="text-sm font-semibold text-neutral-800">{formatMinutes(plan.totalMinutes)}</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-[#5d5d5d] mb-2">
                            {plan.method === "GOOGLE" ? "Road distances from Google Maps" : "Straight-line estimate (×1.3 for roads)"}
                            {plan.edited ? " · order changed by hand" : " · best order"}
                            {!station && " · station location not set, so the route starts at stop 1"}
                        </p>
                        {note && (
                            <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 rounded-md px-2 py-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {note}
                            </p>
                        )}

                        <ol className="space-y-1 overflow-y-auto max-h-[260px] pr-1">
                            {station && (
                                <li className="flex items-center gap-2 px-2 py-1 text-xs text-[#5d5d5d]">
                                    <span className="h-5 w-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">S</span>
                                    {station.name ?? "Station"}
                                </li>
                            )}
                            {plan.order.map((id, i) => {
                                const p = byId.get(id);
                                const leg = legKm(id);
                                return (
                                    <li key={id} className="flex items-center gap-2 rounded-md border border-[#ececec] px-2 py-1.5">
                                        <span className="h-5 w-5 shrink-0 rounded-full bg-[#ea690c] text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm text-neutral-800 truncate">{p?.receiverName ?? id}</span>
                                            <span className="block text-[11px] text-[#9a9a9a] truncate">
                                                {p?.receiverLocationName ?? p?.receiverAddress}{leg ? ` · ${leg.km.toFixed(1)} km` : ""}
                                            </span>
                                        </span>
                                        <span className="flex flex-col">
                                            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-gray-500 hover:text-neutral-900 disabled:opacity-20" aria-label={`Move ${p?.receiverName ?? id} earlier`}>
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button type="button" onClick={() => move(i, 1)} disabled={i === plan.order.length - 1} className="p-0.5 text-gray-500 hover:text-neutral-900 disabled:opacity-20" aria-label={`Move ${p?.receiverName ?? id} later`}>
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    </li>
                                );
                            })}
                            {station && (
                                <li className="flex items-center gap-2 px-2 py-1 text-xs text-[#5d5d5d]">
                                    <span className="h-5 w-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">S</span>
                                    Back to {station.name ?? "station"}
                                </li>
                            )}
                        </ol>

                        {plan.edited && (
                            <Button type="button" variant="outline" size="sm" onClick={optimise} className="mt-2 border border-[#d1d1d1] flex items-center gap-1.5 self-start">
                                <RefreshCw className="w-3.5 h-3.5" /> Back to best order
                            </Button>
                        )}
                    </>
                )}

                {unpinned.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                            <MapPinOff className="w-3.5 h-3.5" /> {unpinned.length} without a pin, added after the planned stops
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {unpinned.map((u) => (
                                <li key={u.parcelId} className="text-[11px] text-amber-900 truncate">{u.receiverName ?? u.parcelId} · {u.receiverAddress ?? "no address"}</li>
                            ))}
                        </ul>
                        <p className="text-[11px] text-amber-800 mt-1">Add pins in Parcel Search to include them in the route.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
