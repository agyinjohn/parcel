import { describe, it, expect } from "vitest";
import { destinationLabel, directionsHref, hasPin } from "./RiderUI";

const base = { parcelId: "P1", receiverAddress: "12 Oxford St, Osu" };

describe("directionsHref", () => {
    it("routes to the pin's coordinates when the parcel has one", () => {
        const href = directionsHref({ ...base, receiverLatitude: 5.6223, receiverLongitude: -0.1735 });
        expect(href).toBe("https://www.google.com/maps/dir/?api=1&destination=5.6223,-0.1735&travelmode=driving");
    });
    it("falls back to searching the address text without a pin", () => {
        expect(directionsHref(base)).toBe("https://www.google.com/maps/search/?api=1&query=12%20Oxford%20St%2C%20Osu%2C%20Ghana");
    });
    it("treats 0 as a real coordinate and ignores half pins", () => {
        expect(hasPin({ receiverLatitude: 0, receiverLongitude: 0 })).toBe(true);
        expect(hasPin({ receiverLatitude: 5.6 })).toBe(false);
    });
    it("gives nothing when there is neither a pin nor an address", () => {
        expect(directionsHref({ parcelId: "P2" })).toBeUndefined();
    });
});

describe("destinationLabel", () => {
    it("prefers the pinned landmark name, then the address", () => {
        expect(destinationLabel({ ...base, receiverLatitude: 5.6, receiverLongitude: -0.2, receiverLocationName: "Near Accra Mall" })).toBe("Near Accra Mall");
        expect(destinationLabel(base)).toBe("12 Oxford St, Osu");
    });
});
