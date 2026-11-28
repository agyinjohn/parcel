import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Loader, RefreshCw, AlertTriangle, Lock, Unlock } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useLocation as useLocations } from "../../../contexts/LocationContext";
import { formatCurrency } from "../../../utils/dataHelpers";
import adminReports, { podAmountOf, type CashupReportRow, type PayoutReport, type PodOwedRow, type WaitingFeeRow } from "../../../services/adminReportsService";
import type { Trip } from "../../../services/driverPaymentsService";
import { cashupSummary, downloadCsv, localDate, sumPayouts, toCsv } from "./reportsMath";

type Tab = "cashups" | "payouts" | "pod" | "waiting" | "missing";
const TABS: [Tab, string][] = [["cashups", "Counter cash-ups"], ["payouts", "Driver payouts"], ["pod", "POD owed to senders"], ["waiting", "Driver fees waiting"], ["missing", "Missing parcels"]];
const DAY = 24 * 60 * 60 * 1000;

const Tile = ({ label, value, sub, tone = "text-neutral-900" }: { label: string; value: string; sub?: string; tone?: string }) => (
    <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6b7280]">{label}</p>
        <p className={`mt-0.5 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
        {sub && <p className="text-xs text-[#6b7280]">{sub}</p>}
    </div>
);
const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => <th className={`px-4 py-2.5 font-semibold ${right ? "text-right" : "text-left"}`}>{children}</th>;
const Td = ({ children, right, cls = "" }: { children: ReactNode; right?: boolean; cls?: string }) => <td className={`px-4 py-2.5 ${right ? "text-right tabular-nums" : ""} ${cls}`}>{children}</td>;
const money = (n?: number) => (n == null ? "—" : formatCurrency(n));
const signed = (n?: number) => (n == null ? "—" : `${n > 0 ? "+" : ""}${formatCurrency(n)}`);
const diffTone = (n?: number) => (!n ? "text-green-700" : n < 0 ? "text-red-600" : "text-amber-600");

/**
 * Admin reports on counter cash and driver payments (backend: /api-admin counter-cashups,
 * driver-payouts/summary, pod-payouts, driver-fee-lines/long-waiting, driver-trips/missing-parcels).
 */
export const CashReports = (): JSX.Element => {
    const { stations, refreshLocations } = useLocations();
    const [tab, setTab] = useState<Tab>("cashups");
    const [officeId, setOfficeId] = useState("");
    const [from, setFrom] = useState(() => localDate(Date.now() - 29 * DAY));
    const [to, setTo] = useState(() => localDate(Date.now()));
    const [days, setDays] = useState(7);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cashups, setCashups] = useState<CashupReportRow[]>([]);
    const [payouts, setPayouts] = useState<PayoutReport | null>(null);
    const [pod, setPod] = useState<PodOwedRow[]>([]);
    const [waiting, setWaiting] = useState<WaitingFeeRow[]>([]);
    const [missing, setMissing] = useState<Trip[]>([]);
    const [openOnly, setOpenOnly] = useState(false);

    useEffect(() => { if (stations.length === 0) refreshLocations(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
    const stationName = (id?: string, fallback?: string) => fallback || stations.find((s) => s.id === id)?.name || id || "—";
    const office = officeId || undefined;

    useEffect(() => {
        let stale = false;
        setLoading(true);
        setError(null);
        const done = (ok: boolean, msg?: string) => { if (stale) return; setLoading(false); setError(ok ? null : msg || "Couldn't load the report."); };
        if (tab === "cashups") adminReports.cashups(office, from, to).then((r) => { if (!stale) setCashups([...(r.data ?? [])].sort((a, b) => b.date.localeCompare(a.date) || (a.officeName ?? "").localeCompare(b.officeName ?? ""))); done(r.success, r.message); });
        if (tab === "payouts") adminReports.payouts(office, from, to).then((r) => { if (!stale) setPayouts(r.data ?? null); done(r.success, r.message); });
        if (tab === "pod") adminReports.podOwed(office).then((r) => { if (!stale) setPod([...(r.data ?? [])].sort((a, b) => (a.pickedUpAt ?? 0) - (b.pickedUpAt ?? 0))); done(r.success, r.message); });
        if (tab === "waiting") adminReports.longWaiting(office, days).then((r) => { if (!stale) setWaiting([...(r.data ?? [])].sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0))); done(r.success, r.message); });
        if (tab === "missing") adminReports.missingParcels(office, from, to).then((r) => { if (!stale) setMissing([...(r.data ?? [])].sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0))); done(r.success, r.message); });
        return () => { stale = true; };
    }, [tab, office, from, to, days, version]);

    const cs = useMemo(() => cashupSummary(cashups), [cashups]);
    const shownCashups = openOnly ? cashups.filter((r) => !r.closed) : cashups;
    const payTotals = useMemo(() => sumPayouts(payouts?.byStation ?? []), [payouts]);
    const podTotal = pod.reduce((s, r) => s + podAmountOf(r), 0);
    const waitingTotal = waiting.reduce((s, r) => s + (r.amount || 0), 0);
    const missingCount = missing.reduce((s, t) => s + Math.max(0, (t.declaredCount ?? 0) - (t.receivedCount ?? 0)), 0);
    const ageDays = (t?: number) => (t ? Math.floor((Date.now() - t) / DAY) : null);
    const usesDates = tab === "cashups" || tab === "payouts" || tab === "missing";

    const exportCsv = () => {
        const stamp = `${office ? stationName(office).replace(/\s+/g, "-") : "all-stations"}-${usesDates ? `${from}_to_${to}` : localDate(Date.now())}`;
        if (tab === "cashups") downloadCsv(`cash-ups-${stamp}.csv`, toCsv(
            ["Date", "Station", "Status", "Pickups", "Expected cash", "Counted cash", "Difference", "Corrections", "MoMo", "Closed by", "Note"],
            shownCashups.map((r) => [r.date, stationName(r.officeId, r.officeName), r.closed ? "Closed" : "Not closed", r.collectionCount, r.expectedCash, r.countedCash, r.difference, r.adjustmentTotal, r.expectedMomo, r.closedByName, r.note])));
        if (tab === "payouts") downloadCsv(`driver-payouts-${stamp}.csv`, toCsv(
            ["Driver", "Station", "Payouts", "Fees", "Deductions", "Bonuses", "Paid out", "Cash", "MoMo", "Not confirmed"],
            (payouts?.byDriver ?? []).map((r) => [r.driverName, stationName(r.officeId, r.officeName), r.payouts, r.gross, r.deductions, r.bonuses, r.net, r.cash, r.momo, r.unconfirmed])));
        if (tab === "pod") downloadCsv(`pod-owed-${stamp}.csv`, toCsv(
            ["Collected", "Station", "Parcel", "Receiver", "Item value owed", "Paid by"],
            pod.map((r) => [r.pickedUpAt ? new Date(r.pickedUpAt).toLocaleString() : r.businessDate, stationName(r.officeId), r.parcelId, r.receiverName, podAmountOf(r), r.paymentMethod])));
        if (tab === "waiting") downloadCsv(`driver-fees-waiting-${stamp}.csv`, toCsv(
            ["Ready since", "Days", "Driver", "Phone", "Station", "Parcel", "Fee"],
            waiting.map((r) => [r.readyAt ? new Date(r.readyAt).toLocaleDateString() : "", ageDays(r.readyAt), r.driverName, r.driverPhoneNumber, stationName(r.officeId), r.parcelId, r.amount])));
        if (tab === "missing") downloadCsv(`trips-missing-parcels-${stamp}.csv`, toCsv(
            ["Arrived", "Driver", "Vehicle", "From", "Declared", "Received", "Missing", "Received by", "Note"],
            missing.map((t) => [t.arrivedAt ? new Date(t.arrivedAt).toLocaleString() : "", t.driverName, t.vehicleNumber, t.origin, t.declaredCount, t.receivedCount, Math.max(0, (t.declaredCount ?? 0) - (t.receivedCount ?? 0)), t.receivedByName, t.note])));
    };

    const empty = (text: string) => <tr><td colSpan={12} className="px-4 py-10 text-center text-sm text-[#6b7280]">{text}</td></tr>;

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto border-b border-[#e5e7eb]" role="tablist">
                {TABS.map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium ${tab === id ? "border-[#ea690c] text-[#ea690c]" : "border-transparent text-[#6b7280] hover:text-neutral-800"}`}>{label}</button>
                ))}
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3">
                <label className="text-xs font-semibold text-neutral-700">Station
                    <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="mt-1 block h-9 min-w-[180px] rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal">
                        <option value="">All stations</option>
                        {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
                {usesDates && (<>
                    <label className="text-xs font-semibold text-neutral-700">From
                        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal" />
                    </label>
                    <label className="text-xs font-semibold text-neutral-700">To
                        <input type="date" value={to} min={from} max={localDate(Date.now())} onChange={(e) => e.target.value && setTo(e.target.value)} className="mt-1 block h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal" />
                    </label>
                </>)}
                {tab === "waiting" && (
                    <label className="text-xs font-semibold text-neutral-700">Ready for more than
                        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1 block h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm font-normal">
                            {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
                        </select>
                    </label>
                )}
                {tab === "cashups" && (
                    <label className="mb-2 flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#ea690c]" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />Not closed only</label>
                )}
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="border-[#d1d1d1]" onClick={() => setVersion((v) => v + 1)} aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
                    <Button size="sm" className="bg-[#ea690c] text-white hover:bg-[#d45d0a]" onClick={exportCsv} disabled={loading || !!error}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button>
                </div>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {tab === "cashups" && (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Tile label="Days with counter money" value={String(cs.days)} sub={`${cs.closed} closed`} />
                    <Tile label="Not closed" value={String(cs.open)} sub={cs.open ? "Ask the station to close these days" : "All days closed"} tone={cs.open ? "text-amber-600" : "text-green-700"} />
                    <Tile label="Net difference" value={signed(cs.difference)} sub={`${cs.shortDays} day${cs.shortDays === 1 ? "" : "s"} short · after corrections`} tone={diffTone(cs.difference)} />
                    <Tile label="Cash expected" value={money(cs.expectedCash)} sub={`${money(cs.momo)} by MoMo`} />
                </div>
                <ReportTable loading={loading}>
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Date</Th><Th>Station</Th><Th>Status</Th><Th right>Pickups</Th><Th right>Expected</Th><Th right>Counted</Th><Th right>Difference</Th><Th right>MoMo</Th><Th>Closed by</Th></tr></thead>
                    <tbody>
                        {shownCashups.length === 0 && !loading ? empty("No counter money in this period.") : shownCashups.map((r) => (
                            <tr key={`${r.officeId}-${r.date}`} className={`border-t border-[#f3f4f6] ${r.closed ? "" : "bg-amber-50/40"}`}>
                                <Td cls="whitespace-nowrap">{r.date}</Td>
                                <Td cls="font-medium">{stationName(r.officeId, r.officeName)}</Td>
                                <Td>{r.closed ? <span className="inline-flex items-center gap-1 text-green-700"><Lock className="h-3.5 w-3.5" />Closed</span> : <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Unlock className="h-3.5 w-3.5" />Not closed</span>}</Td>
                                <Td right>{r.collectionCount ?? "—"}</Td>
                                <Td right>{money(r.expectedCash)}</Td>
                                <Td right>{r.closed ? money(r.countedCash) : "—"}</Td>
                                <Td right cls={r.closed ? diffTone(r.difference) : ""}>
                                    {r.closed ? signed(r.difference) : "—"}
                                    {!!r.adjustmentTotal && <span className="block text-[11px] text-[#6b7280]">corrections {signed(r.adjustmentTotal)}</span>}
                                </Td>
                                <Td right>{money(r.expectedMomo)}</Td>
                                <Td cls="text-xs text-[#6b7280]">{r.closedByName ? `${r.closedByName}${r.closedAt ? ` · ${new Date(r.closedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}` : ""}{r.note && <span className="block italic">{r.note}</span>}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
            </>)}

            {tab === "payouts" && (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Tile label="Paid out to drivers" value={money(payTotals.net)} sub={`${payTotals.payouts} payout${payTotals.payouts === 1 ? "" : "s"}`} />
                    <Tile label="Fees" value={money(payTotals.gross)} sub={`− ${money(payTotals.deductions)} deductions, + ${money(payTotals.bonuses)} bonuses`} />
                    <Tile label="Cash / MoMo" value={`${money(payTotals.cash)}`} sub={`${money(payTotals.momo)} by MoMo`} />
                    <Tile label="Not confirmed by driver" value={String(payTotals.unconfirmed)} sub="Payouts without the SMS code" tone={payTotals.unconfirmed ? "text-amber-600" : "text-green-700"} />
                </div>
                <ReportTable loading={loading} title="By station">
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Station</Th><Th right>Payouts</Th><Th right>Fees</Th><Th right>Deductions</Th><Th right>Bonuses</Th><Th right>Paid out</Th><Th right>Cash</Th><Th right>MoMo</Th><Th right>Not confirmed</Th></tr></thead>
                    <tbody>
                        {(payouts?.byStation ?? []).length === 0 && !loading ? empty("No payouts in this period.") : (payouts?.byStation ?? []).map((r) => (
                            <tr key={r.officeId ?? r.officeName} className="border-t border-[#f3f4f6]">
                                <Td cls="font-medium">{stationName(r.officeId, r.officeName)}</Td><Td right>{r.payouts}</Td><Td right>{money(r.gross)}</Td><Td right>{money(r.deductions)}</Td><Td right>{money(r.bonuses)}</Td>
                                <Td right cls="font-semibold">{money(r.net)}</Td><Td right>{money(r.cash)}</Td><Td right>{money(r.momo)}</Td><Td right cls={r.unconfirmed ? "text-amber-600 font-semibold" : ""}>{r.unconfirmed}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
                <ReportTable loading={loading} title="By driver">
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Driver</Th><Th>Station</Th><Th right>Payouts</Th><Th right>Fees</Th><Th right>Deductions</Th><Th right>Paid out</Th><Th right>Not confirmed</Th></tr></thead>
                    <tbody>
                        {(payouts?.byDriver ?? []).length === 0 && !loading ? empty("No payouts in this period.") : [...(payouts?.byDriver ?? [])].sort((a, b) => b.net - a.net).map((r) => (
                            <tr key={`${r.driverId}-${r.officeId}`} className="border-t border-[#f3f4f6]">
                                <Td cls="font-medium">{r.driverName ?? r.driverId}</Td><Td cls="text-[#6b7280]">{stationName(r.officeId, r.officeName)}</Td><Td right>{r.payouts}</Td><Td right>{money(r.gross)}</Td><Td right>{money(r.deductions)}</Td>
                                <Td right cls="font-semibold">{money(r.net)}</Td><Td right cls={r.unconfirmed ? "text-amber-600 font-semibold" : ""}>{r.unconfirmed}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
            </>)}

            {tab === "pod" && (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <Tile label="Owed to senders" value={money(podTotal)} sub="Item values collected at the counter, not yet paid on" tone={podTotal ? "text-[#ea690c]" : "text-green-700"} />
                    <Tile label="Parcels" value={String(pod.length)} />
                    <Tile label="Oldest" value={pod[0]?.pickedUpAt ? `${ageDays(pod[0].pickedUpAt)} days` : "—"} sub={pod[0]?.parcelId} tone={(ageDays(pod[0]?.pickedUpAt) ?? 0) > 7 ? "text-red-600" : "text-neutral-900"} />
                </div>
                <ReportTable loading={loading}>
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Collected</Th><Th>Station</Th><Th>Parcel</Th><Th>Receiver</Th><Th>Paid by</Th><Th right>Item value owed</Th></tr></thead>
                    <tbody>
                        {pod.length === 0 && !loading ? empty("Nothing owed: every POD item value collected has been paid on.") : pod.map((r) => (
                            <tr key={r.id ?? r.parcelId} className="border-t border-[#f3f4f6]">
                                <Td cls="whitespace-nowrap">{r.pickedUpAt ? new Date(r.pickedUpAt).toLocaleDateString() : r.businessDate}<span className="block text-[11px] text-[#9a9a9a]">{ageDays(r.pickedUpAt) ?? ""} days ago</span></Td>
                                <Td>{stationName(r.officeId)}</Td><Td cls="font-mono text-xs font-semibold">{r.parcelId}</Td><Td>{r.receiverName}</Td>
                                <Td>{r.paymentMethod === "MOMO" ? "MoMo" : r.paymentMethod === "CASH" ? "Cash" : "—"}</Td><Td right cls="font-semibold">{money(podAmountOf(r))}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
                <p className="text-xs text-[#6b7280]">The sender or vendor is paid outside the app for now; once they're paid, the backend marks the item value as paid out and it drops off this list.</p>
            </>)}

            {tab === "waiting" && (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <Tile label="Fees waiting" value={money(waitingTotal)} sub={`ready for more than ${days} days`} tone={waitingTotal ? "text-amber-600" : "text-green-700"} />
                    <Tile label="Parcels" value={String(waiting.length)} />
                    <Tile label="Drivers" value={String(new Set(waiting.map((w) => w.driverId ?? w.driverPhoneNumber)).size)} sub="Pay them from Driver Payments" />
                </div>
                <ReportTable loading={loading}>
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Ready since</Th><Th>Driver</Th><Th>Station</Th><Th>Parcel</Th><Th right>Fee</Th></tr></thead>
                    <tbody>
                        {waiting.length === 0 && !loading ? empty(`No driver fees have been ready for more than ${days} days.`) : waiting.map((r) => (
                            <tr key={r.id} className="border-t border-[#f3f4f6]">
                                <Td cls="whitespace-nowrap">{r.readyAt ? new Date(r.readyAt).toLocaleDateString() : "—"}<span className="block text-[11px] font-semibold text-red-600">{ageDays(r.readyAt) ?? ""} days</span></Td>
                                <Td cls="font-medium">{r.driverName}<span className="block text-xs font-normal text-[#6b7280]">{r.driverPhoneNumber}</span></Td>
                                <Td>{stationName(r.officeId)}</Td><Td cls="font-mono text-xs font-semibold">{r.parcelId}</Td><Td right cls="font-semibold">{money(r.amount)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
            </>)}

            {tab === "missing" && (<>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <Tile label="Trips short" value={String(missing.length)} tone={missing.length ? "text-red-600" : "text-green-700"} />
                    <Tile label="Parcels missing" value={String(missingCount)} sub="declared by the driver but not received" tone={missingCount ? "text-red-600" : "text-green-700"} />
                    <Tile label="Drivers" value={String(new Set(missing.map((t) => t.driverId ?? t.driverName)).size)} />
                </div>
                <ReportTable loading={loading}>
                    <thead><tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-[#6b7280]"><Th>Arrived</Th><Th>Driver</Th><Th>Vehicle · from</Th><Th right>Declared</Th><Th right>Received</Th><Th right>Missing</Th><Th>Received by</Th></tr></thead>
                    <tbody>
                        {missing.length === 0 && !loading ? empty("Every trip in this period arrived with the parcels the driver declared.") : missing.map((t) => (
                            <tr key={t.tripId} className="border-t border-[#f3f4f6]">
                                <Td cls="whitespace-nowrap">{t.arrivedAt ? new Date(t.arrivedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</Td>
                                <Td cls="font-medium">{t.driverName}</Td><Td cls="text-[#6b7280]">{[t.vehicleNumber, t.origin].filter(Boolean).join(" · ")}</Td>
                                <Td right>{t.declaredCount}</Td><Td right>{t.receivedCount}</Td>
                                <Td right cls="font-semibold text-red-600"><span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{Math.max(0, (t.declaredCount ?? 0) - (t.receivedCount ?? 0))}</span></Td>
                                <Td cls="text-xs text-[#6b7280]">{t.receivedByName}{t.note && <span className="block italic">{t.note}</span>}</Td>
                            </tr>
                        ))}
                    </tbody>
                </ReportTable>
            </>)}
        </div>
    );
};

const ReportTable = ({ loading, title, children }: { loading: boolean; title?: string; children: ReactNode }) => (
    <div className={`overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition-opacity ${loading ? "opacity-60" : ""}`}>
        {title && <p className="border-b border-[#f0f0f0] px-4 py-2.5 text-sm font-semibold text-neutral-800">{title}</p>}
        {loading && <p className="flex items-center gap-2 px-4 py-2 text-xs text-[#6b7280]"><Loader className="h-3.5 w-3.5 animate-spin" />Loading…</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">{children}</table></div>
    </div>
);
