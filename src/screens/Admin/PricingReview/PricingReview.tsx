import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader, RefreshCw, Save, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/toast";
import { useLocation as useLocations } from "../../../contexts/LocationContext";
import { formatCurrency } from "../../../utils/dataHelpers";
import pricingService from "../../../services/pricingService";
import { OVERRIDE_REASONS } from "../../../utils/deliveryPricing";
import { DEFAULT_COST_SETTINGS, applyProposals, proposeAll, staffToCheck, type CostSettings, type PricingReview as Review } from "../../../utils/pricingReview";
import { localDate } from "../CashReports/reportsMath";

const DAY = 864e5;
const Tile = ({ label, value, sub, tone = "text-neutral-900" }: { label: string; value: string; sub?: string; tone?: string }) => (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6b7280]">{label}</p>
        <p className={`mt-0.5 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
        {sub && <p className="text-xs text-[#6b7280]">{sub}</p>}
    </div>
);
const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => <th className={`whitespace-nowrap px-3 py-2.5 font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
const Td = ({ children, right, cls = "", colSpan }: { children: ReactNode; right?: boolean; cls?: string; colSpan?: number }) => <td colSpan={colSpan} className={`px-3 py-2.5 align-top ${right ? "whitespace-nowrap text-right tabular-nums" : ""} ${cls}`}>{children}</td>;
const pct = (n?: number) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const reasonLabel = (v?: string) => OVERRIDE_REASONS.find((r) => r.value === v)?.label ?? v ?? "";
const inputCls = "mt-1 block h-9 w-full rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal";

/**
 * Delivery pricing review (stage 2): per station, what each distance band and zone costs to deliver
 * (rider GPS), whether customers accept the price, and how often staff override it, with a proposed
 * table that an admin approves as a new version.
 */
export const PricingReview = (): JSX.Element => {
    const { stations } = useLocations();
    const { showToast } = useToast();
    const [officeId, setOfficeId] = useState("");
    const [from, setFrom] = useState(() => localDate(Date.now() - 55 * DAY));
    const [to, setTo] = useState(() => localDate(Date.now()));
    const [costs, setCosts] = useState<CostSettings>(DEFAULT_COST_SETTINGS);
    const [review, setReview] = useState<Review | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [version, setVersion] = useState(0);

    useEffect(() => { if (!officeId && stations.length) setOfficeId(stations[0].id); }, [stations, officeId]);
    useEffect(() => {
        if (!officeId) return;
        setLoading(true);
        setError(null);
        pricingService.review(officeId, from, to).then((r) => {
            setLoading(false);
            if (r.success) setReview(r.data);
            else { setReview(null); setError(r.message); }
        });
    }, [officeId, from, to, version]);
    useEffect(() => { if (review?.table) setCosts((c) => ({ ...c, roundTo: review.table!.roundTo || 1 })); }, [review?.table]);

    const props = useMemo(() => (review ? proposeAll(review, costs) : []), [review, costs]);
    const changes = props.filter((p) => p.proposed !== p.current);
    const flagged = useMemo(() => new Set(review ? staffToCheck(review.staff) : []), [review]);
    const deliveries = props.reduce((s, p) => s + p.stats.deliveries, 0);
    const setCost = (k: keyof CostSettings, v: string, scale = 1) => setCosts((c) => ({ ...c, [k]: v.trim() === "" || !Number.isFinite(Number(v)) ? 0 : Number(v) / scale }));

    const approve = async () => {
        if (!review?.table || !changes.length) return;
        const summary = changes.map((p) => `${p.stats.label}: ${p.current} → ${p.proposed}`).join("; ");
        if (!window.confirm(`Save these prices as a new table for ${review.officeName}?\n\n${summary}`)) return;
        setSaving(true);
        const r = await pricingService.adminSaveTable(review.officeId, applyProposals(review.table, props), `Pricing review ${from} to ${to}: ${summary}`);
        setSaving(false);
        if (!r.success) { showToast(r.message, "error"); return; }
        showToast(`Saved as version ${r.data.version ?? ""}`, "success");
        setVersion((v) => v + 1);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4">
                <label className="text-sm font-medium text-neutral-700">Station
                    <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="mt-1 block h-9 min-w-[180px] rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal">
                        {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
                <label className="text-sm font-medium text-neutral-700">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm" /></label>
                <label className="text-sm font-medium text-neutral-700">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm" /></label>
                <Button variant="outline" size="sm" onClick={() => setVersion((v) => v + 1)} disabled={loading} aria-label="Refresh" className="h-9 border-[#d1d1d1]"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
            </div>

            <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                <p className="text-sm font-semibold text-neutral-800">Cost assumptions</p>
                <p className="text-xs text-[#6b7280]">Each delivery's cost is the km its rider drove for it (its share of the trip, from GPS) × cost per km, plus its time on the road × rider pay per hour. Proposals aim for this cost plus your margin.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-medium text-[#6b7280] sm:grid-cols-4">
                    <label>Fuel + maintenance per km (GHC)<input aria-label="Cost per km" type="number" min="0" step="0.05" value={costs.costPerKm} onChange={(e) => setCost("costPerKm", e.target.value)} className={inputCls} /></label>
                    <label>Rider pay per hour (GHC)<input aria-label="Rider cost per hour" type="number" min="0" step="0.5" value={costs.riderCostPerHour} onChange={(e) => setCost("riderCostPerHour", e.target.value)} className={inputCls} /></label>
                    <label>Target margin (%)<input aria-label="Target margin" type="number" min="0" step="1" value={Math.round(costs.targetMargin * 100)} onChange={(e) => setCost("targetMargin", e.target.value, 100)} className={inputCls} /></label>
                    <label>Minimum deliveries per band<input aria-label="Minimum deliveries" type="number" min="1" step="1" value={costs.minDeliveries} onChange={(e) => setCost("minDeliveries", e.target.value)} className={inputCls} /></label>
                </div>
            </div>

            {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
            {loading && !review && <div className="flex items-center gap-2 py-10 text-sm text-[#6b7280]"><Loader className="h-4 w-4 animate-spin" />Loading…</div>}

            {review && (
                <>
                    {!review.table && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{review.officeName} has no price table yet. The station manager sets one in Branch Settings → Charges.</div>}
                    {review.table?.version != null && (
                        <p className="text-xs text-[#6b7280]">
                            Prices charged, overrides and bookings below count only deliveries priced with the current table (version {review.statsTableVersion ?? review.table.version}
                            {review.statsSince ? `, in use since ${new Date(review.statsSince).toLocaleDateString()}` : ""}). After approving new prices, wait until each band has enough new deliveries before reviewing again.
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile label="Deliveries reviewed" value={String(deliveries)} sub={`${review.from} to ${review.to}`} />
                        <Tile label="Prices to raise" value={String(changes.filter((p) => p.proposed > p.current).length)} sub="Below cost + margin" tone="text-amber-600" />
                        <Tile label="Prices to lower" value={String(changes.filter((p) => p.proposed < p.current).length)} sub="Customers turning it down" tone="text-blue-700" />
                        <Tile label="Staff to check" value={String(flagged.size)} sub="Override far more than others" tone={flagged.size ? "text-red-600" : "text-green-700"} />
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                                <tr><Th>Band / zone</Th><Th right>Deliveries</Th><Th right>Price now</Th><Th right>Proposed</Th><Th right>Median charged</Th><Th right>Cost / delivery</Th><Th right>Margin now</Th><Th right>Customers book</Th><Th right>Overrides</Th></tr>
                            </thead>
                            <tbody>
                                {props.map((p) => {
                                    const changed = p.proposed !== p.current;
                                    const tone = changed ? (p.proposed > p.current ? "bg-amber-50/60" : "bg-blue-50/60") : "";
                                    return (
                                        <Fragment key={p.stats.key}>
                                        <tr className={`border-t border-[#f1f2f4] ${tone}`}>
                                            <Td cls="font-medium text-neutral-800">{p.stats.label}{p.stats.kind === "ZONE" && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">ZONE</span>}</Td>
                                            <Td right>{p.stats.deliveries}</Td>
                                            <Td right>{formatCurrency(p.current)}</Td>
                                            <Td right cls="font-bold">
                                                <span className={changed ? (p.proposed > p.current ? "text-amber-700" : "text-blue-700") : "text-neutral-800"}>
                                                    {changed && (p.proposed > p.current ? <TrendingUp className="mr-1 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-1 inline h-3.5 w-3.5" />)}
                                                    {formatCurrency(p.proposed)}
                                                </span>
                                            </Td>
                                            <Td right>{formatCurrency(p.stats.chargedMedian)}</Td>
                                            <Td right>{formatCurrency(p.cost)}<span className="block text-[11px] text-[#9a9a9a]">{p.stats.avgKmDriven} km · {Math.round(p.stats.avgMinutes)} min</span></Td>
                                            <Td right cls={p.currentMargin < costs.targetMargin ? "text-red-600" : "text-green-700"}>{pct(p.currentMargin)}</Td>
                                            <Td right>{pct(p.acceptance)}<span className="block text-[11px] text-[#9a9a9a]">{p.stats.quotesBooked}/{p.stats.quotesShown} quotes</span></Td>
                                            <Td right>{pct(p.overrideRate)}{p.topOverrideReason && <span className="block text-[11px] text-[#9a9a9a]">{reasonLabel(p.topOverrideReason)}</span>}</Td>
                                        </tr>
                                        <tr className={tone}>
                                            <Td colSpan={9} cls="!pt-0 text-xs text-[#4b5563]">
                                                {p.explanation}
                                                {p.checkStaff && <span className="mt-1 flex items-center gap-1 font-semibold text-red-600"><AlertTriangle className="h-3 w-3" />Staff change {pct(p.overrideRate)} of these prices, mostly "{reasonLabel(p.topOverrideReason)}". Check before deciding.</span>}
                                            </Td>
                                        </tr>
                                        </Fragment>
                                    );
                                })}
                                {!props.length && <tr><Td colSpan={9} cls="py-8 text-center text-[#6b7280]">No priced deliveries in this period.</Td></tr>}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={approve} disabled={!review.table || !changes.length || saving} className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50">
                            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {changes.length ? `Approve ${changes.length} change${changes.length === 1 ? "" : "s"} as version ${(review.table?.version ?? 0) + 1}` : "No changes to approve"}
                        </Button>
                        {!changes.length && <span className="flex items-center gap-1 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />Current prices cover cost and customers accept them.</span>}
                    </div>

                    {review.staff.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white">
                            <p className="px-4 pt-3 text-sm font-semibold text-neutral-800">Overrides by staff</p>
                            <p className="px-4 text-xs text-[#6b7280]">A check, not a price input: staff who change the suggested price at least twice as often as the station average are flagged.</p>
                            <table className="mt-2 w-full text-sm">
                                <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]"><tr><Th>Staff</Th><Th right>Parcels</Th><Th right>Overrides</Th><Th right>Rate</Th><Th right>Avg change</Th></tr></thead>
                                <tbody className="divide-y divide-[#f1f2f4]">
                                    {review.staff.map((s) => (
                                        <tr key={s.userId} className={flagged.has(s.userId) ? "bg-red-50/60" : ""}>
                                            <Td cls="font-medium">{s.name}{flagged.has(s.userId) && <span className="ml-2 text-xs font-semibold text-red-600">Check</span>}</Td>
                                            <Td right>{s.parcels}</Td><Td right>{s.overrides}</Td><Td right>{pct(s.parcels ? s.overrides / s.parcels : 0)}</Td>
                                            <Td right cls={s.avgDifference < 0 ? "text-red-600" : ""}>{s.avgDifference > 0 ? "+" : ""}{formatCurrency(s.avgDifference)}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
