import { useMemo } from "react";
import { useLocation as useStationLocations } from "../../contexts/LocationContext";
import type { VendorStation } from "./partnerData";

export const useVendorStations = () => {
    const { stations, loading, error } = useStationLocations();

    const vendorStations = useMemo<VendorStation[]>(
        () => stations.map((station) => ({
            id: station.id,
            name: station.name,
            location: station.locationName || station.address || "",
        })),
        [stations],
    );

    return {
        stations: vendorStations,
        loading,
        error: error ? "Failed to load stations" : null,
    };
};
