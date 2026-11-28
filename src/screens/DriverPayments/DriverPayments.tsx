import { useCallback, useEffect, useState } from "react";
import { Search, Loader, RefreshCw, AlertTriangle, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useStation } from "../../contexts/StationContext";
import { formatCurrency } from "../../utils/dataHelpers";
import driverPayments, { type BalanceRow, type Driver, type DriverPayout, type PaymentsSummary, type Trip } from "../../services/driverPaymentsService";
import { DriverStatement } from "./DriverStatement";
import { DriverForm, ReceiptDialog } from "./dialogs";
import { prettyPhone } from "./payoutMath";

type Tab = "pay" | "trips" | "payouts" | "drivers";
const DAY = 24 * 60 * 60 * 1000;
const initials = (n: string) => n.split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const ago = (t?: number) => {
    if (!t) return "";
    const days = Math.floor((Date.now() - t) / DAY);
    return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * Driver Payments (handoff Part M): what the station owes the drivers who bring parcels in,
 * paying them with deductions and receipts, and the history.
 */
export const DriverPayments = (): JSX.Element => {
    const { userRole, userOfficeName } = useStation();
    const canManage = userRole === "MANAGER" || userRole === "ADMIN";
    const [tab, setTab] = useState<Tab>("pay");
    const [summary, setSummary] = useState<PaymentsSummary | null>(null);
    const [version, setVersion] = useState(0);
    const bump = useCallback(() => setVersion((v) => v + 1), []);

    useEffect(() => {
        driverPayments.summary().then((r) => setSummary(r.success ? r.data ?? null : null));
    }, [version]);

    const tabs: [Tab, string, number?][] = [["pay", "To pay", summary?.readyDrivers], ["trips", "Trips"], ["payouts", "Payout history"], ["drivers", "Drivers"]];

    return (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb]">
                <div className="flex gap-1 overflow-x-auto" role="tablist">
                    {tabs.map(([id, label, n]) => (
                        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium ${tab === id ? "border-[#ea690c] text-[#ea690c]" : "border-transparent text-[#6b7280] hover:text-neutral-800"}`}>
                            {label}{n ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[11px] text-neutral-700">{n}</span> : null}
                        </button>
                    ))}
                </div>
                <Button variant="outline" size="sm" className="mb-1.5 border-[#d1d1d1]" onClick={bump} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ["Ready to pay", summary?.readyAmount, "text-green-700", summary ? `Customers have paid · ${summary.readyDrivers} driver${summary.readyDrivers === 1 ? "" : "s"}` : ""],
                    ["Waiting on customers", summary?.waitingAmount, "text-amber-700", summary ? `${summary.waitingParcels} parcels still with us` : ""],
                    ["Paid this week", summary?.paidThisWeekAmount, "text-neutral-900", summary ? `${summary.paidThisWeekCount} payouts · ${Math.round(summary.paidThisWeekMomoPercent || 0)}% by MoMo` : ""],
                    ["On hold", summary?.onHoldAmount, "text-red-600", summary ? `${summary.onHoldCount} parcels disputed or damaged` : ""],
                ].map(([label, v, cls, sub]) => (
                    <div key={label as string} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6b7280]">{label}</p>
                        <p className={`mt-0.5 text-xl font-bold tabular-nums ${cls}`}>{v == null ? "—" : formatCurrency(v as number)}</p>
                        <p className="text-xs text-[#6b7280]">{sub}</p>
                    </div>
                ))}
            </div>

            {tab === "pay" && <ToPay canManage={canManage} station={userOfficeName ?? undefined} version={version} onChanged={bump} />}
            {tab === "trips" && <TripsTab version={version} />}
            {tab === "payouts" && <PayoutsTab canManage={canManage} station={userOfficeName ?? undefined} version={version} onChanged={bump} />}
            {tab === "drivers" && <DriversTab version={version} onChanged={bump} />}
        </div>
    );
};

// ── To pay: driver list + statement ─────────────────────────────

const ToPay = ({ canManage, station, version, onChanged }: { canManage: boolean; station?: string; version: number; onChanged: () => void }) => {
    const [filter, setFilter] = useState<"READY" | "ALL" | "ON_HOLD">("READY");
    const [search, setSearch] = useState("");
    const [q, setQ] = useState("");
    const [rows, setRows] = useState<BalanceRow[]>([]);
    const [page, setPage] = useState(0);
    const [last, setLast] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
    useEffect(() => {
        let stale = false;
        setLoading(true);
        driverPayments.balances({ search: q || undefined, state: filter, page: 0, size: 50 }).then((r) => {
            if (stale) return;
            setLoading(false);
            if (r.success && r.data) {
                setRows(r.data.content ?? []);
                setPage(0);
                setLast((r.data.number ?? 0) >= (r.data.totalPages ?? 1) - 1);
                setError(null);
                setSelected((s) => s ?? r.data!.content?.[0]?.driverId ?? null);
            } else setError(r.message || "Couldn't load drivers.");
        });
        return () => { stale = true; };
    }, [q, filter, version]);

    const more = async () => {
        const r = await driverPayments.balances({ search: q || undefined, state: filter, page: page + 1, size: 50 });
        if (r.success && r.data) {
            setRows((x) => [...x, ...(r.data!.content ?? [])]);
            setPage(page + 1);
            setLast((r.data.number ?? 0) >= (r.data.totalPages ?? 1) - 1);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
            <div className="flex max-h-[calc(100vh-280px)] min-h-[420px] flex-col rounded-xl border border-[#e5e7eb] bg-white">
                <div className="space-y-2 border-b border-[#f0f0f0] p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input aria-label="Search driver, phone or vehicle" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver, phone or vehicle"
                            className="h-9 w-full rounded-lg bg-gray-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]/20" />
                    </div>
                    <div className="flex gap-1.5">
                        {([["READY", "Ready to pay"], ["ALL", "All"], ["ON_HOLD", "On hold"]] as const).map(([v, l]) => (
                            <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v}
                                className={`rounded-full border px-2.5 py-0.5 text-xs ${filter === v ? "border-orange-200 bg-orange-50 font-semibold text-[#ea690c]" : "border-[#e5e7eb] text-neutral-600"}`}>{l}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}
                    {!error && loading && rows.length === 0 && <p className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader className="h-4 w-4 animate-spin" />Loading…</p>}
                    {!error && !loading && rows.length === 0 && <p className="p-4 text-sm text-neutral-500">{filter === "READY" ? "Nothing ready to pay. Fees become payable once customers have paid." : "No drivers match."}</p>}
                    {rows.map((r) => (
                        <button key={r.driverId} onClick={() => setSelected(r.driverId)}
                            className={`flex w-full items-center gap-3 border-t border-[#f3f4f6] px-3 py-2.5 text-left first:border-t-0 ${selected === r.driverId ? "bg-orange-50 shadow-[inset_3px_0_0_#ea690c]" : "hover:bg-gray-50"}`}>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] to-[#c2410c] text-[11px] font-bold text-white">{initials(r.name)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-neutral-800">{r.name}</span>
                                <span className="block truncate text-[11.5px] text-[#6b7280]">{[r.vehicles?.[0], r.lastTripAt && `last trip ${ago(r.lastTripAt)}`].filter(Boolean).join(" · ") || prettyPhone(r.phone)}</span>
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block text-sm font-bold tabular-nums">{formatCurrency(r.readyAmount)}</span>
                                <span className="block text-[11px] text-[#6b7280]">{r.onHoldAmount > 0 && filter === "ON_HOLD" ? `${formatCurrency(r.onHoldAmount)} held` : r.waitingAmount > 0 ? `+ ${r.waitingAmount.toFixed(2)} waiting` : "nothing waiting"}</span>
                            </span>
                        </button>
                    ))}
                    {!last && <button onClick={more} className="w-full py-2.5 text-sm font-medium text-[#ea690c] hover:bg-orange-50">Load more</button>}
                </div>
            </div>
            <div className="min-h-[420px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white lg:max-h-[calc(100vh-280px)]">
                {selected
                    ? <DriverStatement key={selected} driverId={selected} canManage={canManage} station={station} onChanged={onChanged} />
                    : <p className="p-6 text-sm text-neutral-500">Choose a driver to see their statement.</p>}
            </div>
        </div>
    );
};

// ── Trips ───────────────────────────────────────────────────────

const TripsTab = ({ version }: { version: number }) => {
    const [days, setDays] = useState(7);
    const [trips, setTrips] = useState<Trip[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    useEffect(() => {
        setTrips(null);
        driverPayments.trips({ from: Date.now() - days * DAY, to: Date.now() }).then((r) => {
            if (r.success) { setTrips([...(r.data ?? [])].sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0))); setError(null); } else setError(r.message || "Couldn't load trips.");
        });
    }, [days, version]);
    return (
        <div className="rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
                <p className="text-sm font-semibold">Trips · last {days} days</p>
                <select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-lg border border-[#d1d1d1] px-2 text-sm">
                    <option value={1}>Today</option><option value={7}>7 days</option><option value={30}>30 days</option>
                </select>
            </div>
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}
            {!trips && !error && <p className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader className="h-4 w-4 animate-spin" />Loading…</p>}
            {trips?.length === 0 && <p className="p-4 text-sm text-neutral-500">No trips in this period.</p>}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                    {trips && trips.length > 0 && (
                        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#6b7280]">
                            <th className="px-4 py-2 font-semibold">Arrived</th><th className="px-4 py-2 font-semibold">Driver</th><th className="px-4 py-2 font-semibold">Vehicle · from</th>
                            <th className="px-4 py-2 font-semibold">Parcels</th><th className="px-4 py-2 text-right font-semibold">Fees</th><th className="px-4 py-2 text-right font-semibold">Ready</th>
                        </tr></thead>
                    )}
                    <tbody>
                        {(trips ?? []).map((t) => {
                            const short = t.declaredCount != null && t.receivedCount != null && t.receivedCount < t.declaredCount;
                            return [
                                <tr key={t.tripId} onClick={() => setOpen(open === t.tripId ? null : t.tripId)} className="cursor-pointer border-t border-[#f3f4f6] hover:bg-gray-50">
                                    <td className="px-4 py-2.5 whitespace-nowrap">{open === t.tripId ? <ChevronDown className="mr-1 inline h-3.5 w-3.5" /> : <ChevronRight className="mr-1 inline h-3.5 w-3.5" />}{new Date(t.arrivedAt ?? 0).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                                    <td className="px-4 py-2.5 font-medium">{t.driverName ?? "-"}</td>
                                    <td className="px-4 py-2.5 text-[#6b7280]">{[t.vehicleNumber, t.origin].filter(Boolean).join(" · ") || "-"}</td>
                                    <td className="px-4 py-2.5">
                                        {t.receivedCount ?? t.lines?.length ?? 0}{t.declaredCount != null ? ` of ${t.declaredCount} declared` : ""}
                                        {(t.flagged || short) && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><AlertTriangle className="h-3 w-3" />{short ? `${(t.declaredCount ?? 0) - (t.receivedCount ?? 0)} missing` : "Check"}</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(t.feeTotal ?? 0)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{t.fullyPaid ? <span className="text-xs text-gray-500">Paid</span> : formatCurrency(t.readyAmount ?? 0)}</td>
                                </tr>,
                                open === t.tripId && (
                                    <tr key={`${t.tripId}-x`} className="bg-[#fafafa]"><td colSpan={6} className="px-4 py-2">
                                        {(t.lines ?? []).map((l) => <div key={l.id} className="flex justify-between py-0.5 text-xs"><span className="font-mono">{l.parcelId}</span><span className="flex-1 px-3 text-[#6b7280]">{l.receiverName}</span><span className="w-24">{l.state.toLowerCase().replace("_", " ")}</span><span className="w-16 text-right tabular-nums">{l.amount.toFixed(2)}</span></div>)}
                                        {t.note && <p className="mt-1 text-xs text-[#6b7280]">Note: {t.note}</p>}
                                    </td></tr>
                                ),
                            ];
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Payout history ──────────────────────────────────────────────

const PayoutsTab = ({ canManage, station, version, onChanged }: { canManage: boolean; station?: string; version: number; onChanged: () => void }) => {
    const [days, setDays] = useState(7);
    const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);
    const [list, setList] = useState<DriverPayout[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<DriverPayout | null>(null);
    useEffect(() => {
        setList(null);
        driverPayments.payouts({ from: Date.now() - days * DAY, to: Date.now(), ...(onlyUnconfirmed ? { unconfirmed: true } : {}) }).then((r) => {
            if (r.success) { setList([...(r.data ?? [])].sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))); setError(null); } else setError(r.message || "Couldn't load payouts.");
        });
    }, [days, onlyUnconfirmed, version]);
    const live = (list ?? []).filter((p) => !p.reversed);
    const cash = live.filter((p) => p.paymentMethod === "CASH").reduce((s, p) => s + p.netAmount, 0);
    const momo = live.filter((p) => p.paymentMethod === "MOMO").reduce((s, p) => s + p.netAmount, 0);
    return (
        <div className="rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
                <p className="text-sm font-semibold">Payouts · {formatCurrency(cash + momo)} <span className="font-normal text-[#6b7280]">({formatCurrency(cash)} cash, {formatCurrency(momo)} MoMo)</span></p>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#ea690c]" checked={onlyUnconfirmed} onChange={(e) => setOnlyUnconfirmed(e.target.checked)} />Not confirmed only</label>
                    <select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-lg border border-[#d1d1d1] px-2 text-sm">
                        <option value={1}>Today</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
                    </select>
                </div>
            </div>
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}
            {!list && !error && <p className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader className="h-4 w-4 animate-spin" />Loading…</p>}
            {list?.length === 0 && <p className="p-4 text-sm text-neutral-500">No payouts in this period.</p>}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    {list && list.length > 0 && (
                        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#6b7280]">
                            <th className="px-4 py-2 font-semibold">Receipt</th><th className="px-4 py-2 font-semibold">Paid</th><th className="px-4 py-2 font-semibold">Driver</th>
                            <th className="px-4 py-2 font-semibold">Method</th><th className="px-4 py-2 text-right font-semibold">Fees</th><th className="px-4 py-2 text-right font-semibold">Paid out</th><th className="px-4 py-2 font-semibold">Status</th>
                        </tr></thead>
                    )}
                    <tbody>
                        {(list ?? []).map((p) => (
                            <tr key={p.id} onClick={() => setOpen(p)} className="cursor-pointer border-t border-[#f3f4f6] hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-mono text-xs font-semibold">{p.receiptNo ?? p.id}</td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-[#6b7280]">{new Date(p.paidAt ?? 0).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{p.paidByName ? ` · ${p.paidByName}` : ""}</td>
                                <td className="px-4 py-2.5 font-medium">{p.driverName}</td>
                                <td className="px-4 py-2.5">{p.paymentMethod === "MOMO" ? `MoMo${p.momoReference ? ` · ${p.momoReference}` : ""}` : "Cash"}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{p.grossAmount.toFixed(2)}</td>
                                <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${p.reversed ? "text-gray-400 line-through" : ""}`}>{formatCurrency(p.netAmount)}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.reversed ? "bg-red-50 text-red-600" : p.confirmed ? "bg-green-50 text-green-700" : p.legacy ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
                                        {p.reversed ? "Reversed" : p.confirmed ? "Confirmed" : p.legacy ? "Old system" : "Not confirmed"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {open && <ReceiptDialog payout={open} station={station} canManage={canManage} onClose={() => setOpen(null)} onChanged={() => { onChanged(); }} />}
        </div>
    );
};

// ── Drivers ─────────────────────────────────────────────────────

const DriversTab = ({ version, onChanged }: { version: number; onChanged: () => void }) => {
    const [search, setSearch] = useState("");
    const [list, setList] = useState<Driver[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Driver | null | "new">(null);
    useEffect(() => {
        const t = setTimeout(() => {
            driverPayments.drivers(search.trim(), 0, 100).then((r) => {
                if (r.success) { setList(r.data?.content ?? []); setError(null); } else setError(r.message || "Couldn't load drivers.");
            });
        }, 250);
        return () => clearTimeout(t);
    }, [search, version]);
    return (
        <div className="rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input aria-label="Search drivers" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or vehicle" className="h-9 w-full rounded-lg bg-gray-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]/20" />
                </div>
                <Button size="sm" className="bg-[#ea690c] text-white hover:bg-[#d45d0a]" onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" />Add driver</Button>
            </div>
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}
            {!list && !error && <p className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader className="h-4 w-4 animate-spin" />Loading…</p>}
            {list?.length === 0 && <p className="p-4 text-sm text-neutral-500">No drivers found. Drivers are added automatically when they bring parcels in, or add one here.</p>}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                    <tbody>
                        {(list ?? []).map((d) => (
                            <tr key={d.id} className="border-t border-[#f3f4f6] first:border-t-0">
                                <td className="px-4 py-2.5 font-medium">{d.name}{d.status === "BLOCKED" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Blocked</span>}</td>
                                <td className="px-4 py-2.5 text-[#6b7280]">{(d.phoneNumbers ?? []).map(prettyPhone).join(", ")}</td>
                                <td className="px-4 py-2.5 text-[#6b7280]">{d.momoNumber ? `${prettyPhone(d.momoNumber)}${d.momoNetwork ? ` · ${d.momoNetwork}` : ""}` : <span className="text-amber-700">No MoMo number</span>}</td>
                                <td className="px-4 py-2.5 text-[#6b7280]">{(d.vehicles ?? []).join(", ")}</td>
                                <td className="px-4 py-2.5 text-right"><button onClick={() => setEditing(d)} className="text-sm font-medium text-[#ea690c] hover:underline">Edit</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editing && <DriverForm driver={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
        </div>
    );
};
