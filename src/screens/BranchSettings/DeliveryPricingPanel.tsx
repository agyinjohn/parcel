import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { DeliveryLocationPicker, type DeliveryLocation } from "../../components/DeliveryLocationPicker";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { useStation } from "../../contexts/StationContext";
import { cn } from "../../lib/utils";
import pricingService from "../../services/pricingService";
import { DEFAULT_PRICE_TABLE, quoteFromTable, validateTable, type DeliveryPriceTable } from "../../utils/deliveryPricing";

const inputCls = "h-9 rounded-lg border-[#dcdcdc] text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#ea690c]/20 focus-visible:border-[#ea690c]";
const money = (n: number) => `GHC ${n.toFixed(2)}`;
const numOr = (v: string, fallback = 0) => (v.trim() === "" || !Number.isFinite(Number(v)) ? fallback : Number(v));

/** Manager: this station's delivery price table (distance + weight). Used to fill in the delivery price at intake. */
export const DeliveryPricingPanel = () => {
    const { userOfficeName } = useStation();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<DeliveryPriceTable | null>(null);
    const [t, setT] = useState<DeliveryPriceTable>(DEFAULT_PRICE_TABLE);
    const [tryKm, setTryKm] = useState("7");
    const [tryKg, setTryKg] = useState("2");
    const [tryFragile, setTryFragile] = useState(false);
    // New zone being added.
    const [zoneCentre, setZoneCentre] = useState<DeliveryLocation | null>(null);
    const [zoneName, setZoneName] = useState("");
    const [zoneRadius, setZoneRadius] = useState("2");
    const [zonePrice, setZonePrice] = useState("");
    const [zoneCoords, setZoneCoords] = useState("");
    const [mapsOk, setMapsOk] = useState(true);

    useEffect(() => {
        pricingService.getTable().then((r) => {
            setLoading(false);
            if (!r.success) { showToast(r.message, "error"); return; }
            setSaved(r.data);
            if (r.data) setT({ ...DEFAULT_PRICE_TABLE, ...r.data });
        });
    }, [showToast]);

    const errors = useMemo(() => validateTable(t), [t]);
    const dirty = JSON.stringify({ ...t, version: undefined, updatedAt: undefined, updatedByName: undefined }) !==
        JSON.stringify(saved ? { ...DEFAULT_PRICE_TABLE, ...saved, version: undefined, updatedAt: undefined, updatedByName: undefined } : null);
    const sample = quoteFromTable(t, numOr(tryKm), { weightKg: numOr(tryKg), fragile: tryFragile });

    const set = <K extends keyof DeliveryPriceTable>(k: K, v: DeliveryPriceTable[K]) => setT((x) => ({ ...x, [k]: v }));
    const setBand = (i: number, k: "upToKm" | "price", v: string) => set("bands", t.bands.map((b, j) => (j === i ? { ...b, [k]: numOr(v) } : b)));
    const setWeight = (i: number, k: "overKg" | "surcharge", v: string) => set("weightBands", t.weightBands.map((w, j) => (j === i ? { ...w, [k]: numOr(v) } : w)));

    const zones = t.zones ?? [];
    const setZone = (i: number, k: "name" | "radiusKm" | "price", v: string) =>
        set("zones", zones.map((z, j) => (j === i ? { ...z, [k]: k === "name" ? v : numOr(v) } : z)));
    const typedCentre = (() => {
        const m = zoneCoords.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
    })();
    const centre = zoneCentre ?? typedCentre;
    const addZone = () => {
        if (!centre || !zoneName.trim() || !(numOr(zonePrice) > 0) || !(numOr(zoneRadius) > 0)) {
            showToast("Choose the centre, and give the zone a name, radius and price", "error");
            return;
        }
        set("zones", [...zones, { name: zoneName.trim(), lat: centre.lat, lng: centre.lng, radiusKm: numOr(zoneRadius), price: numOr(zonePrice) }]);
        setZoneCentre(null); setZoneName(""); setZonePrice(""); setZoneCoords("");
    };

    const save = async () => {
        if (errors.length) { showToast(errors[0], "error"); return; }
        setSaving(true);
        const clean = { ...t, bands: [...t.bands].sort((a, b) => a.upToKm - b.upToKm), weightBands: [...t.weightBands].sort((a, b) => a.overKg - b.overKg) };
        const r = await pricingService.saveTable(clean);
        setSaving(false);
        if (!r.success) { showToast(r.message, "error"); return; }
        setSaved(r.data);
        setT({ ...DEFAULT_PRICE_TABLE, ...r.data });
        showToast("Delivery prices saved", "success");
    };

    if (loading) return <div className="flex items-center gap-2 py-6 text-sm text-[#6b7280]"><Loader className="h-4 w-4 animate-spin" />Loading delivery prices…</div>;

    return (
        <div className="max-w-3xl space-y-5 border-t border-[#ececec] pt-6">
            <div>
                <h2 className="text-base font-semibold text-neutral-900">Delivery prices</h2>
                <p className="mt-1 text-sm text-[#5d5d5d]">
                    When staff at {userOfficeName ?? "this station"} register a home delivery with a pinned location, the delivery price
                    fills in from the road distance and the parcel's weight. Staff can change it, but must give a reason.
                </p>
                {saved ? (
                    <p className="mt-1 text-xs text-[#9a9a9a]">Version {saved.version ?? 1}{saved.updatedByName ? ` · saved by ${saved.updatedByName}` : ""}{saved.updatedAt ? ` on ${new Date(saved.updatedAt).toLocaleDateString()}` : ""}</p>
                ) : (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">No prices are set for this station yet. Below is a suggested starting table: adjust it and save.</p>
                )}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                    {/* Distance */}
                    <section className="space-y-3 rounded-xl border border-[#e3e3e3] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-neutral-800">By distance</h3>
                            <div className="inline-flex rounded-lg border border-[#e3e3e3] p-0.5 text-xs">
                                {([["BANDS", "Distance bands"], ["PER_KM", "Base + per km"]] as const).map(([m, l]) => (
                                    <button key={m} type="button" onClick={() => set("mode", m)} className={cn("rounded-md px-3 py-1.5 font-medium", t.mode === m ? "bg-[#ea690c] text-white" : "text-neutral-600")}>{l}</button>
                                ))}
                            </div>
                        </div>
                        {t.mode === "BANDS" ? (
                            <>
                                <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-xs font-medium text-[#6b7280]"><span>Up to (km)</span><span>Price (GHC)</span><span /></div>
                                {t.bands.map((b, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2">
                                        <Input aria-label={`Band ${i + 1} up to km`} type="number" min="0" step="0.5" value={b.upToKm} onChange={(e) => setBand(i, "upToKm", e.target.value)} className={inputCls} />
                                        <Input aria-label={`Band ${i + 1} price`} type="number" min="0" step="0.5" value={b.price} onChange={(e) => setBand(i, "price", e.target.value)} className={inputCls} />
                                        <button type="button" aria-label="Remove band" onClick={() => set("bands", t.bands.filter((_, j) => j !== i))} className="rounded-lg p-2 text-[#9a9a9a] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => { const last = t.bands[t.bands.length - 1]; set("bands", [...t.bands, { upToKm: (last?.upToKm ?? 0) + 5, price: (last?.price ?? 10) + 5 }]); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#ea690c]"><Plus className="h-3.5 w-3.5" />Add band</button>
                                <label className="flex items-center gap-2 text-sm text-neutral-700">Beyond the last band, add GHC
                                    <Input type="number" min="0" step="0.5" value={t.perKmBeyond} onChange={(e) => set("perKmBeyond", numOr(e.target.value))} className={cn(inputCls, "w-20")} />per extra km</label>
                            </>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 text-xs font-medium text-[#6b7280]">
                                <label>Base fee (GHC)<Input type="number" min="0" step="0.5" value={t.baseFee} onChange={(e) => set("baseFee", numOr(e.target.value))} className={cn(inputCls, "mt-1")} /></label>
                                <label>Per km (GHC)<Input type="number" min="0" step="0.1" value={t.perKm} onChange={(e) => set("perKm", numOr(e.target.value))} className={cn(inputCls, "mt-1")} /></label>
                                <label>Minimum (GHC)<Input type="number" min="0" step="0.5" value={t.minFee} onChange={(e) => set("minFee", numOr(e.target.value))} className={cn(inputCls, "mt-1")} /></label>
                            </div>
                        )}
                    </section>

                    {/* Weight */}
                    <section className="space-y-3 rounded-xl border border-[#e3e3e3] p-4">
                        <div>
                            <h3 className="text-sm font-semibold text-neutral-800">By weight</h3>
                            <p className="text-xs text-[#9a9a9a]">Added on top of the distance price. Only the highest matching row applies.</p>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-xs font-medium text-[#6b7280]"><span>Heavier than (kg)</span><span>Add (GHC)</span><span /></div>
                        {t.weightBands.map((w, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_36px] items-center gap-2">
                                <Input aria-label={`Weight band ${i + 1} kg`} type="number" min="0" step="0.5" value={w.overKg} onChange={(e) => setWeight(i, "overKg", e.target.value)} className={inputCls} />
                                <Input aria-label={`Weight band ${i + 1} surcharge`} type="number" min="0" step="0.5" value={w.surcharge} onChange={(e) => setWeight(i, "surcharge", e.target.value)} className={inputCls} />
                                <button type="button" aria-label="Remove weight band" onClick={() => set("weightBands", t.weightBands.filter((_, j) => j !== i))} className="rounded-lg p-2 text-[#9a9a9a] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => { const last = t.weightBands[t.weightBands.length - 1]; set("weightBands", [...t.weightBands, { overKg: (last?.overKg ?? 0) + 10, surcharge: (last?.surcharge ?? 0) + 5 }]); }} className="inline-flex items-center gap-1 text-xs font-semibold text-[#ea690c]"><Plus className="h-3.5 w-3.5" />Add weight band</button>
                    </section>

                    {/* Zones */}
                    <section className="space-y-3 rounded-xl border border-[#e3e3e3] p-4">
                        <div>
                            <h3 className="text-sm font-semibold text-neutral-800">Zones <span className="font-normal text-[#9a9a9a]">(optional)</span></h3>
                            <p className="text-xs text-[#9a9a9a]">A flat price for a named area, e.g. "East Legon GHC 20". A pin inside a zone gets the zone price instead of the distance price (weight and fragile still apply). If zones overlap, the smallest wins. Pins outside every zone use the distance price.</p>
                        </div>
                        {zones.length > 0 && (
                            <>
                                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto_36px] gap-2 text-xs font-medium text-[#6b7280]"><span>Name</span><span>Radius (km)</span><span>Price (GHC)</span><span>Centre</span><span /></div>
                                {zones.map((z, i) => (
                                    <div key={i} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto_36px] items-center gap-2">
                                        <Input aria-label={`Zone ${i + 1} name`} value={z.name} onChange={(e) => setZone(i, "name", e.target.value)} className={inputCls} />
                                        <Input aria-label={`Zone ${i + 1} radius`} type="number" min="0" step="0.1" value={z.radiusKm} onChange={(e) => setZone(i, "radiusKm", e.target.value)} className={inputCls} />
                                        <Input aria-label={`Zone ${i + 1} price`} type="number" min="0" step="0.5" value={z.price} onChange={(e) => setZone(i, "price", e.target.value)} className={inputCls} />
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${z.lat},${z.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#ea690c] hover:underline"><ExternalLink className="h-3 w-3" />Map</a>
                                        <button type="button" aria-label="Remove zone" onClick={() => set("zones", zones.filter((_, j) => j !== i))} className="rounded-lg p-2 text-[#9a9a9a] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))}
                            </>
                        )}
                        <div className="space-y-2 rounded-lg bg-[#fafafa] p-3">
                            <p className="text-xs font-semibold text-neutral-700">Add a zone</p>
                            {mapsOk ? (
                                <DeliveryLocationPicker
                                    value={zoneCentre}
                                    onChange={(loc) => { setZoneCentre(loc); if (loc && !zoneName) setZoneName(loc.name); }}
                                    onAvailabilityChange={setMapsOk}
                                />
                            ) : (
                                <label className="block text-xs font-medium text-[#6b7280]">Centre (latitude, longitude)
                                    <Input aria-label="Zone centre" value={zoneCoords} onChange={(e) => setZoneCoords(e.target.value)} placeholder="5.6370, -0.1650" className={cn(inputCls, "mt-1 bg-white")} /></label>
                            )}
                            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto] items-end gap-2 text-xs font-medium text-[#6b7280]">
                                <label>Name<Input aria-label="New zone name" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="East Legon" className={cn(inputCls, "mt-1 bg-white")} /></label>
                                <label>Radius (km)<Input aria-label="New zone radius" type="number" min="0" step="0.1" value={zoneRadius} onChange={(e) => setZoneRadius(e.target.value)} className={cn(inputCls, "mt-1 bg-white")} /></label>
                                <label>Price (GHC)<Input aria-label="New zone price" type="number" min="0" step="0.5" value={zonePrice} onChange={(e) => setZonePrice(e.target.value)} className={cn(inputCls, "mt-1 bg-white")} /></label>
                                <Button type="button" variant="outline" onClick={addZone} className="h-9 border-[#ea690c] text-[#ea690c]"><MapPin className="mr-1 h-4 w-4" />Add zone</Button>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-2 gap-3 rounded-xl border border-[#e3e3e3] p-4 text-xs font-medium text-[#6b7280]">
                        <label>Fragile handling (GHC)<Input type="number" min="0" step="0.5" value={t.fragileFee} onChange={(e) => set("fragileFee", numOr(e.target.value))} className={cn(inputCls, "mt-1")} /></label>
                        <label>Round the total up to (GHC)<Input type="number" min="0" step="0.5" value={t.roundTo} onChange={(e) => set("roundTo", numOr(e.target.value))} className={cn(inputCls, "mt-1")} /></label>
                    </section>
                </div>

                {/* Preview */}
                <aside className="space-y-3 self-start rounded-xl border border-orange-100 bg-orange-50/40 p-4">
                    <h3 className="text-sm font-semibold text-neutral-800">Try it</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-[#6b7280]">
                        <label>Road km<Input aria-label="Try distance km" type="number" min="0" step="0.5" value={tryKm} onChange={(e) => setTryKm(e.target.value)} className={cn(inputCls, "mt-1 bg-white")} /></label>
                        <label>Weight kg<Input aria-label="Try weight kg" type="number" min="0" step="0.5" value={tryKg} onChange={(e) => setTryKg(e.target.value)} className={cn(inputCls, "mt-1 bg-white")} /></label>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={tryFragile} onChange={(e) => setTryFragile(e.target.checked)} className="accent-[#ea690c]" />Fragile</label>
                    <div className="space-y-1 rounded-lg bg-white p-3 text-xs">
                        {sample.lines.map((l) => <div key={l.label} className="flex justify-between gap-2"><span className="text-[#6b7280]">{l.label}</span><span className="tabular-nums">{money(l.amount)}</span></div>)}
                        <div className="flex justify-between border-t border-[#ececec] pt-1 text-sm font-bold"><span>Price</span><span className="tabular-nums text-[#ea690c]">{money(sample.price)}</span></div>
                    </div>
                    <div className="text-xs">
                        <p className="mb-1 font-medium text-[#6b7280]">At 2 kg</p>
                        {[2, 5, 8, 12, 20].map((km) => (
                            <div key={km} className="flex justify-between py-0.5"><span className="text-[#6b7280]">{km} km</span><span className="tabular-nums font-medium">{money(quoteFromTable(t, km, { weightKg: 2 }).price)}</span></div>
                        ))}
                    </div>
                </aside>
            </div>

            {errors.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-600">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            <Button onClick={save} disabled={saving || errors.length > 0 || (!dirty && !!saved)} className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50">
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save delivery prices
            </Button>
        </div>
    );
};
