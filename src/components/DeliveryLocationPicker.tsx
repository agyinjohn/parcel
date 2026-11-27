import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader, X, Crosshair, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { ACCRA_CENTER, loadGoogleMaps, onGoogleMapsAuthFailure } from "../utils/googleMaps";
import { searchPlaces, placeDetails, newSessionToken, type PlaceSuggestion } from "../utils/placeSearch";

/** Where a parcel is going. Sent to the backend as receiverLatitude / receiverLongitude etc. */
export interface DeliveryLocation {
    lat: number;
    lng: number;
    /** Place or landmark name shown to riders, e.g. "Accra Mall". */
    name: string;
    /** Full address from Google, when known. */
    address?: string;
    /** Google place id, when picked from search. */
    placeId?: string;
    /** "SEARCH" = picked from suggestions, "MAP_PIN" = pointed on the map. */
    source: "SEARCH" | "MAP_PIN";
}

/** The parcel fields that hold a pinned drop-off (docs/BACKEND_HANDOFF.md, Part A). */
export interface ParcelLocationFields {
    receiverLatitude?: number | null;
    receiverLongitude?: number | null;
    receiverLocationName?: string | null;
    receiverPlaceId?: string | null;
    receiverLocationSource?: "SEARCH" | "MAP_PIN" | null;
}

/** A parcel's saved pin, or null when it has none. */
export const locationFromParcel = (p?: ParcelLocationFields & { receiverAddress?: string | null } | null): DeliveryLocation | null =>
    p && p.receiverLatitude != null && p.receiverLongitude != null
        ? {
            lat: p.receiverLatitude,
            lng: p.receiverLongitude,
            name: p.receiverLocationName || "Pinned location",
            address: p.receiverAddress || undefined,
            placeId: p.receiverPlaceId || undefined,
            source: p.receiverLocationSource || "MAP_PIN",
        }
        : null;

/** Fields for PUT /api-frontdesk/parcel/{id}. Passing null clears the pin. */
export const locationToUpdate = (loc: DeliveryLocation | null): Required<ParcelLocationFields> =>
    loc
        ? {
            receiverLatitude: loc.lat,
            receiverLongitude: loc.lng,
            receiverLocationName: loc.name,
            receiverPlaceId: loc.placeId ?? null,
            receiverLocationSource: loc.source,
        }
        : { receiverLatitude: null, receiverLongitude: null, receiverLocationName: null, receiverPlaceId: null, receiverLocationSource: null };

/** True when two pins are the same point (to skip no-op saves). */
export const sameLocation = (a: DeliveryLocation | null, b: DeliveryLocation | null) =>
    (!a && !b) || (!!a && !!b && a.lat === b.lat && a.lng === b.lng && a.name === b.name);

interface Props {
    value: DeliveryLocation | null;
    onChange: (loc: DeliveryLocation | null) => void;
    /** Centre used to favour nearby places (the station). Defaults to Accra. */
    near?: { lat: number; lng: number };
    /** Reports whether Google Maps loaded, so the form can decide whether a pin is enforceable. */
    onAvailabilityChange?: (available: boolean) => void;
    error?: string;
}

const BIAS_RADIUS_M = 30_000;

/**
 * Required delivery location for home-delivery parcels: search Google Places for a nearby
 * landmark, or drop a pin on a map. Ghana only.
 */
export const DeliveryLocationPicker = ({ value, onChange, near = ACCRA_CENTER, onAvailabilityChange, error }: Props) => {
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [predictions, setPredictions] = useState<PlaceSuggestion[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);

    const services = useRef<{ autocomplete?: any; places?: any; geocoder?: any; token?: any }>({});

    useEffect(() => {
        let cancelled = false;
        loadGoogleMaps()
            .then(() => {
                if (cancelled) return;
                const g = (window as any).google;
                // Legacy PlacesService is only used to name map pins (nearbySearch); the geocoder covers it otherwise.
                if (typeof g.maps.places?.PlacesService === "function") {
                    services.current.places = new g.maps.places.PlacesService(document.createElement("div"));
                }
                services.current.geocoder = new g.maps.Geocoder();
                services.current.token = newSessionToken(g);
                setReady(true);
                onAvailabilityChange?.(true);
            })
            .catch((e: Error) => {
                if (cancelled) return;
                setLoadError(e.message || "Google Maps couldn't load.");
                onAvailabilityChange?.(false);
            });
        // A rejected key loads fine and fails later; treat it like Maps being unavailable so intake isn't blocked.
        const stop = onGoogleMapsAuthFailure(() => {
            if (cancelled) return;
            setReady(false);
            setLoadError("Google rejected the Maps key, so location search is unavailable.");
            onAvailabilityChange?.(false);
        });
        return () => { cancelled = true; stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Suggestions, debounced.
    useEffect(() => {
        if (!ready || !query.trim()) { setPredictions([]); setSearchError(null); return; }
        setSearching(true);
        let stale = false;
        const id = window.setTimeout(() => {
            searchPlaces((window as any).google, query.trim(), near, { radius: BIAS_RADIUS_M, token: services.current.token })
                .then((items) => { if (!stale) { setPredictions(items); setSearchError(null); } })
                .catch((e: Error) => { if (!stale) { setPredictions([]); setSearchError(e.message); } })
                .finally(() => { if (!stale) setSearching(false); });
        }, 250);
        return () => { stale = true; window.clearTimeout(id); };
    }, [query, ready, near]);

    const choosePrediction = (p: PlaceSuggestion) => {
        setOpen(false);
        setSearching(true);
        const g = (window as any).google;
        placeDetails(g, p, services.current.token)
            .then((place) => {
                onChange({ ...place, placeId: p.placeId, source: "SEARCH" });
                setQuery("");
                setPredictions([]);
                setSearchError(null);
            })
            .catch((e: Error) => setSearchError(e.message))
            .finally(() => {
                setSearching(false);
                // A new session per selection, as Google bills per session.
                services.current.token = newSessionToken(g);
            });
    };

    if (loadError) {
        return (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                    The map couldn't load ({loadError}), so the delivery location can't be pinned right now.
                    You can still save the parcel; add the location later from Parcel Search.
                </span>
            </div>
        );
    }

    if (value) {
        return (
            <div className={`flex items-start gap-3 rounded-lg border p-3 ${error ? "border-red-400" : "border-[#d1d1d1]"} bg-white`}>
                <div className="h-9 w-9 shrink-0 rounded-lg bg-orange-50 text-[#ea690c] flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-800 truncate">{value.name}</p>
                    {value.address && value.address !== value.name && (
                        <p className="text-xs text-[#5d5d5d] truncate">{value.address}</p>
                    )}
                    <p className="text-[11px] text-[#9a9a9a] mt-0.5">
                        {value.source === "MAP_PIN" ? "Pinned on map" : "From search"} · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
                    </p>
                </div>
                <div className="flex gap-1 shrink-0">
                    <Button type="button" variant="outline" size="sm" className="border border-[#d1d1d1]" onClick={() => setMapOpen(true)}>
                        Adjust
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="border border-[#d1d1d1]" onClick={() => onChange(null)} aria-label="Clear location">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {mapOpen && (
                    <PinMapDialog initial={value} near={near} geocoder={services.current.geocoder} places={services.current.places}
                        onCancel={() => setMapOpen(false)} onConfirm={(loc) => { onChange(loc); setMapOpen(false); }} />
                )}
            </div>
        );
    }

    return (
        <div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        disabled={!ready}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 200)}
                        placeholder={ready ? "Search a landmark, area or business" : "Loading map search…"}
                        className={`w-full rounded-lg border ${error ? "border-red-400" : "border-[#d1d1d1]"} bg-white pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ea690c]`}
                        aria-label="Search delivery location"
                        aria-autocomplete="list"
                    />
                    {searching && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                    {open && predictions.length > 0 && (
                        <ul className="absolute z-30 mt-1 w-full rounded-lg border border-[#d1d1d1] bg-white shadow-lg max-h-64 overflow-auto" role="listbox">
                            {predictions.map((p) => (
                                <li
                                    key={p.placeId}
                                    role="option"
                                    aria-selected={false}
                                    onMouseDown={(e) => { e.preventDefault(); choosePrediction(p); }}
                                    className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 border-b border-[#eee] last:border-b-0"
                                >
                                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-neutral-800">{p.main || p.description}</span>
                                        {p.secondary && <span className="block text-xs text-[#9a9a9a] truncate">{p.secondary}</span>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {open && !searching && searchError && ready && (
                        <div role="alert" className="absolute z-30 mt-1 w-full rounded-lg border border-amber-200 bg-amber-50 shadow-lg px-3 py-2 text-xs text-amber-900">
                            {searchError}
                        </div>
                    )}
                    {open && !searching && !searchError && query.trim().length >= 3 && predictions.length === 0 && ready && (
                        <div className="absolute z-30 mt-1 w-full rounded-lg border border-[#d1d1d1] bg-white shadow-lg px-3 py-2 text-xs text-[#5d5d5d]">
                            No places found. Try a nearby landmark, or pin it on the map.
                        </div>
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    disabled={!ready}
                    onClick={() => setMapOpen(true)}
                    className="border border-[#d1d1d1] flex items-center gap-1.5 shrink-0"
                >
                    <Crosshair className="w-4 h-4" /> Pin on map
                </Button>
            </div>
            {mapOpen && (
                <PinMapDialog initial={null} near={near} geocoder={services.current.geocoder} places={services.current.places}
                    onCancel={() => setMapOpen(false)} onConfirm={(loc) => { onChange(loc); setMapOpen(false); }} />
            )}
        </div>
    );
};

/** Full-screen-ish map where the user clicks or drags a pin; names it after the nearest landmark. */
const PinMapDialog = ({
    initial, near, geocoder, places, onCancel, onConfirm,
}: {
    initial: DeliveryLocation | null;
    near: { lat: number; lng: number };
    geocoder: any;
    places: any;
    onCancel: () => void;
    onConfirm: (loc: DeliveryLocation) => void;
}) => {
    const el = useRef<HTMLDivElement>(null);
    const marker = useRef<any>(null);
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
    const [label, setLabel] = useState<{ name: string; address?: string } | null>(initial ? { name: initial.name, address: initial.address } : null);
    const [naming, setNaming] = useState(false);
    const lookup = useRef(0);

    // Name the pin: nearest landmark within 200 m, else the street address.
    const describe = useCallback((pos: { lat: number; lng: number }) => {
        const id = ++lookup.current;
        setNaming(true);
        const fromGeocoder = () =>
            geocoder?.geocode({ location: pos }, (res: any[] | null, status: string) => {
                if (id !== lookup.current) return;
                setNaming(false);
                const a = status === "OK" && res?.[0]?.formatted_address;
                setLabel({ name: a ? a.split(",")[0] : "Pinned location", address: a || undefined });
            });
        if (!places?.nearbySearch) return fromGeocoder();
        places.nearbySearch({ location: pos, radius: 200 }, (res: any[] | null, status: string) => {
            if (id !== lookup.current) return;
            const named = status === "OK" && res?.find((r) => !(r.types ?? []).some((t: string) => ["locality", "political", "route"].includes(t)));
            if (named) {
                setNaming(false);
                setLabel({ name: `Near ${named.name}`, address: named.vicinity });
            } else fromGeocoder();
        });
    }, [geocoder, places]);

    useEffect(() => {
        const g = (window as any).google;
        if (!g || !el.current) return;
        const start = pin ?? near;
        const map = new g.maps.Map(el.current, {
            center: start, zoom: pin ? 17 : 13,
            mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false,
        });
        const place = (pos: { lat: number; lng: number }) => {
            setPin(pos);
            if (!marker.current) {
                marker.current = new g.maps.Marker({ map, position: pos, draggable: true, title: "Delivery location" });
                marker.current.addListener("dragend", (e: any) => place({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
            } else marker.current.setPosition(pos);
            describe(pos);
        };
        if (pin) {
            marker.current = new g.maps.Marker({ map, position: pin, draggable: true, title: "Delivery location" });
            marker.current.addListener("dragend", (e: any) => place({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
        }
        map.addListener("click", (e: any) => e.latLng && place({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
        return () => { marker.current?.setMap(null); marker.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Pin delivery location">
            <div className="bg-white w-full h-full sm:h-[80vh] sm:max-w-3xl sm:rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#ececec]">
                    <div>
                        <p className="font-semibold text-neutral-800">Pin the delivery location</p>
                        <p className="text-xs text-[#5d5d5d]">Tap the map where the parcel is going, then drag the pin to adjust.</p>
                    </div>
                    <button onClick={onCancel} className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div ref={el} className="relative flex-1" data-testid="pin-map" />
                <div className="flex items-center gap-3 px-4 py-3 border-t border-[#ececec]">
                    <div className="min-w-0 flex-1">
                        {pin ? (
                            <>
                                <p className="text-sm font-medium text-neutral-800 truncate">{naming ? "Finding the nearest landmark…" : label?.name}</p>
                                <p className="text-xs text-[#9a9a9a] truncate">{label?.address ?? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}</p>
                            </>
                        ) : (
                            <p className="text-sm text-[#5d5d5d]">No pin yet. Tap the map.</p>
                        )}
                    </div>
                    <Button type="button" variant="outline" onClick={onCancel} className="border border-[#d1d1d1]">Cancel</Button>
                    <Button
                        type="button"
                        disabled={!pin || naming}
                        onClick={() => pin && onConfirm({
                            lat: pin.lat, lng: pin.lng,
                            name: label?.name ?? "Pinned location",
                            address: label?.address,
                            source: "MAP_PIN",
                        })}
                        className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90"
                    >
                        Use this location
                    </Button>
                </div>
            </div>
        </div>
    );
};
