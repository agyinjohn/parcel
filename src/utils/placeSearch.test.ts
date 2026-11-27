import { describe, it, expect, vi } from "vitest";
import { searchPlaces, placeDetails, PLACES_DENIED } from "./placeSearch";

const near = { lat: 5.6, lng: -0.19 };

const newApi = (impl: () => Promise<any>) => ({ AutocompleteSuggestion: { fetchAutocompleteSuggestions: vi.fn(impl) } });
const legacyApi = (status: string, results: any[] | null = []) => ({
    AutocompleteService: class { getPlacePredictions(_req: any, cb: any) { cb(results, status); } },
});

describe("searchPlaces", () => {
    it("uses the new Places API", async () => {
        const g = { maps: { places: newApi(async () => ({ suggestions: [{ placePrediction: { placeId: "p1", mainText: { text: "Accra Mall" }, secondaryText: { text: "Spintex Rd" }, text: { text: "Accra Mall, Spintex Rd" } } }] })) } };
        expect(await searchPlaces(g, "accra mall", near)).toEqual([{ placeId: "p1", main: "Accra Mall", secondary: "Spintex Rd", description: "Accra Mall, Spintex Rd" }]);
        expect(g.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions).toHaveBeenCalledWith(expect.objectContaining({ includedRegionCodes: ["gh"] }));
    });

    it("falls back to the legacy API when the new one fails", async () => {
        const g = { maps: { places: { ...newApi(async () => { throw new Error("Places API (New) has not been used in project"); }), ...legacyApi("OK", [{ place_id: "p2", description: "Osu, Accra", structured_formatting: { main_text: "Osu", secondary_text: "Accra" } }]) } } };
        expect(await searchPlaces(g, "osu", near)).toEqual([{ placeId: "p2", main: "Osu", secondary: "Accra", description: "Osu, Accra" }]);
    });

    it("treats ZERO_RESULTS as an empty list", async () => {
        expect(await searchPlaces({ maps: { places: legacyApi("ZERO_RESULTS", null) } }, "zzz", near)).toEqual([]);
    });

    it("explains a refused key instead of showing no results", async () => {
        const g = { maps: { places: { ...newApi(async () => { throw new Error("PERMISSION_DENIED"); }), ...legacyApi("REQUEST_DENIED", null) } } };
        await expect(searchPlaces(g, "osu", near)).rejects.toThrow(PLACES_DENIED);
    });
});

describe("placeDetails", () => {
    it("reads location, name and address from the new Place class", async () => {
        class Place {
            location = { lat: () => 5.63, lng: () => -0.17 };
            displayName = "Accra Mall";
            formattedAddress = "Spintex Rd, Accra";
            constructor(_o: any) {}
            async fetchFields() {}
        }
        const r = await placeDetails({ maps: { places: { Place } } }, { placeId: "p1", main: "Accra Mall", description: "Accra Mall" });
        expect(r).toEqual({ lat: 5.63, lng: -0.17, name: "Accra Mall", address: "Spintex Rd, Accra" });
    });
});
