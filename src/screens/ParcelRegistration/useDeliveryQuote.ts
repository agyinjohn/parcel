import { useEffect, useRef, useState } from "react";
import pricingService from "../../services/pricingService";
import { useStation } from "../../contexts/StationContext";
import { useLocation as useLocations } from "../../contexts/LocationContext";
import { estimateRoadKm, quoteFromTable, type DeliveryPriceTable, type PriceQuote } from "../../utils/deliveryPricing";

/**
 * Suggested delivery price for a pinned home delivery: the backend quote (road distance), or, if
 * the backend can't quote, an estimate from this station's table and the straight-line distance.
 */
export const useDeliveryQuote = (enabled: boolean, pin: { lat: number; lng: number } | null | undefined, weightKg?: number, fragile?: boolean) => {
    const { userOfficeId } = useStation();
    const { stations } = useLocations();
    const [quote, setQuote] = useState<PriceQuote | null>(null);
    const [loading, setLoading] = useState(false);
    const table = useRef<DeliveryPriceTable | null | undefined>(undefined);

    useEffect(() => {
        if (!enabled || !pin) {
            setQuote(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const t = setTimeout(async () => {
            const r = await pricingService.quote({ latitude: pin.lat, longitude: pin.lng, weightKg: weightKg || undefined, fragile: fragile || undefined });
            if (cancelled) return;
            if (r.success) {
                setQuote(r.data);
                setLoading(false);
                return;
            }
            // Fallback: same maths, straight line × road factor.
            if (table.current === undefined) {
                const tr = await pricingService.getTable();
                table.current = tr.success ? tr.data : null;
            }
            const st: any = stations.find((s) => s.id === userOfficeId);
            if (cancelled) return;
            if (table.current && st?.latitude != null && st?.longitude != null) {
                const km = estimateRoadKm({ lat: Number(st.latitude), lng: Number(st.longitude) }, pin);
                setQuote(quoteFromTable(table.current, km, { weightKg, fragile, distanceSource: "ESTIMATE", pin }));
            } else {
                setQuote(null);
            }
            setLoading(false);
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, pin?.lat, pin?.lng, weightKg, fragile, userOfficeId]);

    return { quote, loading };
};
