/**
 * Google place search for picking a delivery location.
 *
 * Uses the Places API (New) — AutocompleteSuggestion and Place — which is what new Google Cloud
 * projects get. Falls back to the legacy AutocompleteService / PlacesService for keys that only
 * have the old "Places API" enabled. When Google refuses both, the error says which API to enable.
 */

export interface PlaceSuggestion {
    placeId: string;
    main: string;
    secondary?: string;
    description: string;
}

export interface PlaceResult {
    lat: number;
    lng: number;
    name: string;
    address?: string;
}

export const PLACES_DENIED =
    "Google refused the place search. Enable \"Places API (New)\" for the Maps key in Google Cloud Console (and check billing), or pin the location on the map.";

type LatLng = { lat: number; lng: number };

const placesNs = (g: any) => g?.maps?.places;
const hasNewApi = (g: any) => typeof placesNs(g)?.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function";
const hasLegacyApi = (g: any) => typeof placesNs(g)?.AutocompleteService === "function";

export const newSessionToken = (g: any) => {
    const T = placesNs(g)?.AutocompleteSessionToken;
    return T ? new T() : undefined;
};

/** True when Google's error looks like "this API isn't enabled / not allowed for this key". */
const isDenied = (e: unknown) => /denied|not.*(enabled|activated|authorized)|legacy|billing|403|PERMISSION/i.test(String((e as any)?.message ?? e));

const legacyPredictions = (g: any, input: string, near: LatLng, radius: number, token: any) =>
    new Promise<PlaceSuggestion[]>((resolve, reject) => {
        const svc = new (placesNs(g).AutocompleteService)();
        svc.getPlacePredictions(
            { input, componentRestrictions: { country: "gh" }, locationBias: { center: near, radius }, sessionToken: token },
            (results: any[] | null, status: string) => {
                if (status === "OK" || status === "ZERO_RESULTS" || (results && !status)) {
                    resolve((results ?? []).map((p) => ({
                        placeId: p.place_id,
                        main: p.structured_formatting?.main_text ?? p.description,
                        secondary: p.structured_formatting?.secondary_text,
                        description: p.description,
                    })));
                } else reject(new Error(status || "UNKNOWN_ERROR"));
            }
        );
    });

/** Suggestions for what the user typed, Ghana only, favouring places near `near`. */
export const searchPlaces = async (
    g: any,
    input: string,
    near: LatLng,
    opts: { radius?: number; token?: any } = {},
): Promise<PlaceSuggestion[]> => {
    const radius = opts.radius ?? 30_000;
    let newError: unknown = null;
    if (hasNewApi(g)) {
        try {
            const { suggestions } = await placesNs(g).AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input,
                includedRegionCodes: ["gh"],
                locationBias: { center: near, radius },
                sessionToken: opts.token,
            });
            return (suggestions ?? [])
                .map((s: any) => s.placePrediction)
                .filter(Boolean)
                .map((p: any) => ({
                    placeId: p.placeId,
                    main: p.mainText?.text ?? p.text?.text ?? "",
                    secondary: p.secondaryText?.text,
                    description: p.text?.text ?? p.mainText?.text ?? "",
                }));
        } catch (e) {
            newError = e;
        }
    }
    if (hasLegacyApi(g)) {
        try {
            return await legacyPredictions(g, input, near, radius, opts.token);
        } catch (e) {
            throw new Error(isDenied(e) || isDenied(newError) ? PLACES_DENIED : `Place search failed (${(e as Error).message}).`);
        }
    }
    throw new Error(newError && !isDenied(newError) ? `Place search failed (${(newError as Error).message}).` : PLACES_DENIED);
};

/** Position, name and address of a chosen suggestion. */
export const placeDetails = async (g: any, s: PlaceSuggestion, token?: any): Promise<PlaceResult> => {
    let newError: unknown = null;
    const PlaceCls = placesNs(g)?.Place;
    if (typeof PlaceCls === "function") {
        try {
            const place = new PlaceCls({ id: s.placeId });
            await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
            const loc = place.location;
            if (loc) {
                return {
                    lat: typeof loc.lat === "function" ? loc.lat() : loc.lat,
                    lng: typeof loc.lng === "function" ? loc.lng() : loc.lng,
                    name: place.displayName || s.main || s.description,
                    address: place.formattedAddress || s.description,
                };
            }
        } catch (e) {
            newError = e;
        }
    }
    if (typeof placesNs(g)?.PlacesService === "function") {
        return new Promise<PlaceResult>((resolve, reject) => {
            const svc = new (placesNs(g).PlacesService)(document.createElement("div"));
            svc.getDetails(
                { placeId: s.placeId, fields: ["geometry", "name", "formatted_address"], sessionToken: token },
                (place: any, status: string) => {
                    const loc = place?.geometry?.location;
                    if (status !== "OK" || !loc) {
                        return reject(new Error(isDenied(status) || isDenied(newError) ? PLACES_DENIED : `Couldn't get that place (${status}).`));
                    }
                    resolve({ lat: loc.lat(), lng: loc.lng(), name: place.name || s.main || s.description, address: place.formatted_address || s.description });
                }
            );
        });
    }
    throw new Error(PLACES_DENIED);
};
