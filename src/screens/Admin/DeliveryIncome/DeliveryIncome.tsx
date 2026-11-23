import { useEffect, useState } from "react";
import {
    Bike, Building2, CheckCircle2, CircleDollarSign, Clock, HandCoins, Loader2, RefreshCw, Truck,
} from "lucide-react";
import adminService, { RevenueDashboard, RiderLeaderboardEntry } from "../../../services/adminService";
import { useLocation } from "../../../contexts/LocationContext";
import { formatCurrency } from "../../../utils/dataHelpers";
import { settlementStatus, parcelIncome, DeliveredParcelRow, Settlement, SETTLEMENT_LABEL } from "./deliveryIncome";

const Kpi = ({
    icon: Icon, iconBg, label, value, sub,
}: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string; label: string; value: string; sub: string;
}) => (
    <div className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className="h-[18px] w-[18px]" />
            </div>
        </div>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">{value}</p>
        <p className="mt-1.5 text-xs text-neutral-500">{sub}</p>
    </div>
);

const SectionCard = ({
    title, sub, children, action,
}: { title: string; sub: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ececec] px-5 py-4">
            <div>
                <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
                <p className="mt-0.5 text-xs text-[#8a8a8a]">{sub}</p>
            </div>
            {action}
        </div>
        {children}
    </div>
);

const payBadge = (status: Settlement) =>
    status === "settled"
        ? "bg-green-50 text-green-700"
        : status === "partial"
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-red-600";

type Range = "7" | "30" | "90";
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 20;

export const DeliveryIncome = (): JSX.Element => {
    const { stations, refreshLocations } = useLocation();
    const [officeId, setOfficeId] = useState("");
    const [range, setRange] = useState<Range>("30");
    const [reloadKey, setReloadKey] = useState(0);

    const [revenue, setRevenue] = useState<RevenueDashboard | null>(null);
    const [riders, setRiders] = useState<RiderLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [parcels, setParcels] = useState<DeliveredParcelRow[]>([]);
    const [parcelPage, setParcelPage] = useState(0);
    const [parcelPages, setParcelPages] = useState(1);
    const [parcelTotal, setParcelTotal] = useState(0);
    const [parcelsLoading, setParcelsLoading] = useState(true);
    const [parcelsError, setParcelsError] = useState<string | null>(null);

    useEffect(() => {
        if (stations.length === 0) refreshLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;
        const endDate = Date.now();
        const filters = { officeId: officeId || undefined, startDate: endDate - Number(range) * DAY_MS, endDate };
        setLoading(true);
        setError(null);
        Promise.all([adminService.getRevenueDashboard(filters), adminService.getRiderPerformanceDashboard(filters)]).then(([rev, perf]) => {
            if (cancelled) return;
            if (rev.success && rev.data) setRevenue(rev.data);
            else setError(rev.message || "Failed to load income figures.");
            setRiders(perf.success
                ? (perf.data?.riderLeaderboard ?? []).filter((r) => r.deliveries || r.failed || r.revenue || r.outstanding).sort((a, b) => b.revenue - a.revenue)
                : []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [officeId, range, reloadKey]);

    useEffect(() => setParcelPage(0), [officeId]);

    useEffect(() => {
        let cancelled = false;
        setParcelsLoading(true);
        setParcelsError(null);
        adminService.searchParcels({ officeId: officeId || undefined, isDelivered: true, page: parcelPage, size: PAGE_SIZE }).then((res) => {
            if (cancelled) return;
            if (res.success) {
                const data = res.data ?? {};
                setParcels((data.content ?? []).map(parcelIncome));
                setParcelPages(Math.max(1, data.totalPages ?? 1));
                setParcelTotal(data.totalElements ?? (data.content ?? []).length);
            } else {
                setParcelsError(res.message || "Failed to load delivered parcels.");
            }
            setParcelsLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [officeId, parcelPage, reloadKey]);

    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    const totalRevenue = n(revenue?.totalRevenue);
    const driverPayments = n(revenue?.driverPayments);
    const stationRows = [...(revenue?.revenueByStation ?? [])].sort((a, b) => n(b.revenue) - n(a.revenue));
    const stationNameOf = (id?: string) => stations.find((s) => s.id === id)?.name;

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

                {/* ── Header ── */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Delivery Income</h1>
                        <p className="mt-1 text-sm text-[#7d7d7d]">
                            Income from Delivery Hub operations: revenue, cash collected from riders, and what is still outstanding.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            id="income-station"
                            aria-label="Station"
                            value={officeId}
                            onChange={(e) => setOfficeId(e.target.value)}
                            className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                        >
                            <option value="">All stations</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <div className="flex rounded-lg border border-[#e3e3e3] bg-white p-0.5">
                            {(["7", "30", "90"] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRange(r)}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${range === r ? "bg-[#ea690c] text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
                                >
                                    {r} days
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setReloadKey((k) => k + 1)}
                            aria-label="Refresh figures"
                            className="rounded-lg border border-[#e3e3e3] bg-white p-2 text-neutral-600 hover:bg-neutral-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{error}</span>
                        <button onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">Try again</button>
                    </div>
                )}

                {!revenue && loading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-neutral-500">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading income figures…
                    </div>
                ) : revenue && (
                    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
                        {/* ── KPI row ── */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Kpi
                                icon={Truck} iconBg="bg-orange-50 text-[#ea690c]"
                                label="Revenue" value={formatCurrency(totalRevenue)}
                                sub={`${formatCurrency(n(revenue.avgPerParcel))} per parcel, last ${range} days`}
                            />
                            <Kpi
                                icon={HandCoins} iconBg="bg-blue-50 text-[#1e40af]"
                                label="Collected" value={formatCurrency(n(revenue.collected))}
                                sub={`${n(revenue.collectionRate)}% of revenue handed in`}
                            />
                            <Kpi
                                icon={Clock} iconBg="bg-red-50 text-red-500"
                                label="Outstanding" value={formatCurrency(n(revenue.outstanding))}
                                sub="Delivered, cash not yet reconciled"
                            />
                            <Kpi
                                icon={CircleDollarSign} iconBg="bg-green-50 text-green-600"
                                label="Net Delivery Income" value={formatCurrency(totalRevenue - driverPayments)}
                                sub={`Revenue − ${formatCurrency(driverPayments)} driver payments`}
                            />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                            {/* ── Income by station ── */}
                            <SectionCard title="Income by Station" sub="Revenue and collections per station">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[480px] text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wider text-neutral-400">
                                                <th className="px-5 py-3 font-semibold">Station</th>
                                                <th className="px-5 py-3 text-right font-semibold">Parcels</th>
                                                <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                                                <th className="px-5 py-3 text-right font-semibold">Collected</th>
                                                <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stationRows.length === 0 && (
                                                <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-500">No station income in this period.</td></tr>
                                            )}
                                            {stationRows.map(st => (
                                                <tr key={st.officeId || st.stationName} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                                                                <Building2 className="h-4 w-4 text-[#ea690c]" />
                                                            </div>
                                                            <span className="font-medium text-neutral-800">{st.stationName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-neutral-700">{n(st.parcels)}</td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-neutral-900">{formatCurrency(n(st.revenue))}</td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-neutral-700">{formatCurrency(n(st.collected))}</td>
                                                    <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium ${n(st.outstanding) > 0 ? "text-red-500" : "text-neutral-400"}`}>
                                                        {formatCurrency(n(st.outstanding))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </SectionCard>

                            {/* ── Rider collections ── */}
                            <SectionCard title="Rider Collections" sub="Revenue from each rider's deliveries and cash not yet handed in">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[460px] text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wider text-neutral-400">
                                                <th className="px-5 py-3 font-semibold">Rider</th>
                                                <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                                                <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                                                <th className="px-5 py-3 text-right font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {riders.length === 0 && (
                                                <tr><td colSpan={4} className="px-5 py-10 text-center text-neutral-500">No rider deliveries in this period.</td></tr>
                                            )}
                                            {riders.map(r => {
                                                const status = settlementStatus(n(r.revenue), n(r.outstanding));
                                                return (
                                                    <tr key={r.riderId || r.riderName} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ea690c] to-[#c2470a] text-[10px] font-bold text-white">
                                                                    {(r.riderName || "?").split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-neutral-800">{r.riderName}</p>
                                                                    <p className="flex items-center gap-1 text-[11px] text-neutral-400">
                                                                        <Bike className="h-3 w-3" /> {n(r.deliveries)} deliveries{n(r.failed) ? `, ${n(r.failed)} failed` : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-neutral-900">{formatCurrency(n(r.revenue))}</td>
                                                        <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium ${n(r.outstanding) > 0 ? "text-red-500" : "text-neutral-400"}`}>
                                                            {formatCurrency(n(r.outstanding))}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${payBadge(status)}`}>
                                                                {SETTLEMENT_LABEL[status]}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                )}

                {/* ── Per-parcel income ── */}
                <div className="mt-6">
                    <SectionCard
                        title="Delivered Parcel Income"
                        sub={`Most recent delivered parcels${officeId ? " at this station" : ""} (${parcelTotal.toLocaleString()} in total)`}
                        action={parcelPages > 1 && (
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <button
                                    onClick={() => setParcelPage((p) => Math.max(0, p - 1))}
                                    disabled={parcelPage === 0 || parcelsLoading}
                                    className="rounded-md border border-[#e3e3e3] px-2.5 py-1 font-medium text-neutral-700 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <span>Page {parcelPage + 1} of {parcelPages}</span>
                                <button
                                    onClick={() => setParcelPage((p) => Math.min(parcelPages - 1, p + 1))}
                                    disabled={parcelPage >= parcelPages - 1 || parcelsLoading}
                                    className="rounded-md border border-[#e3e3e3] px-2.5 py-1 font-medium text-neutral-700 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    >
                        <div className={`overflow-x-auto transition-opacity ${parcelsLoading ? "opacity-60" : ""}`}>
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wider text-neutral-400">
                                        <th className="px-5 py-3 font-semibold">Parcel</th>
                                        <th className="px-5 py-3 font-semibold">Recipient</th>
                                        <th className="px-5 py-3 font-semibold">Station</th>
                                        <th className="px-5 py-3 font-semibold">Rider</th>
                                        <th className="px-5 py-3 text-right font-semibold">Delivery Fee</th>
                                        <th className="px-5 py-3 text-right font-semibold">Total Charge</th>
                                        <th className="px-5 py-3 text-right font-semibold">COD Item Value</th>
                                        <th className="px-5 py-3 text-right font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parcelsError && (
                                        <tr><td colSpan={8} className="px-5 py-10 text-center text-red-600">{parcelsError}</td></tr>
                                    )}
                                    {!parcelsError && parcels.length === 0 && !parcelsLoading && (
                                        <tr><td colSpan={8} className="px-5 py-10 text-center text-neutral-500">No delivered parcels yet.</td></tr>
                                    )}
                                    {!parcelsError && parcels.length === 0 && parcelsLoading && (
                                        <tr><td colSpan={8} className="px-5 py-10 text-center text-neutral-500">Loading parcels…</td></tr>
                                    )}
                                    {parcels.map(rec => (
                                        <tr key={rec.parcelId} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/60">
                                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-neutral-700">{rec.parcelId}</td>
                                            <td className="px-5 py-3.5 text-neutral-800">{rec.recipient}</td>
                                            <td className="px-5 py-3.5 text-neutral-600">{rec.stationName || stationNameOf(rec.officeId) || "-"}</td>
                                            <td className="px-5 py-3.5 text-neutral-600">{rec.riderName || (rec.status === "Picked up" ? "Self pickup" : "-")}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-neutral-900">{formatCurrency(rec.deliveryFee)}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right text-neutral-700">{formatCurrency(rec.total)}</td>
                                            <td className="whitespace-nowrap px-5 py-3.5 text-right text-neutral-700">{rec.codAmount === null ? "-" : formatCurrency(rec.codAmount)}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                                                    <CheckCircle2 className="h-3 w-3" /> {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};
