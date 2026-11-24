import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Loader, RefreshCw, Smartphone, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { useStation } from "../../contexts/StationContext";
import frontdeskService, { type CashUpRecord } from "../../services/frontdeskService";
import { cashUpTotals, type CounterCollection } from "../../utils/counterPickup";
import { formatCurrency, formatPhoneNumber } from "../../utils/dataHelpers";

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * End-of-day counter cash-up: every parcel collected at the counter, what was paid and how,
 * and the manager's count of the cash drawer. Backend: handoff Part L.
 */
export const CounterCashUp = (): JSX.Element => {
    const { showToast } = useToast();
    const { userOfficeName } = useStation();
    const [date, setDate] = useState(todayLocal);
    const [rows, setRows] = useState<CounterCollection[]>([]);
    const [closed, setClosed] = useState<CashUpRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [counted, setCounted] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [list, cu] = await Promise.all([frontdeskService.getCounterCollections(date), frontdeskService.getCashUp(date)]);
        if (list.success) setRows([...(list.data ?? [])].sort((a, b) => a.pickedUpAt - b.pickedUpAt));
        else {
            setRows([]);
            setError(list.message || "Couldn't load the counter collections.");
        }
        setClosed(cu.success ? cu.data ?? null : null);
        setCounted("");
        setNote("");
        setLoading(false);
    }, [date]);

    useEffect(() => { load(); }, [load]);

    const t = useMemo(() => cashUpTotals(rows), [rows]);
    const countedNum = counted.trim() === "" ? null : Number(counted);
    const countedValid = countedNum !== null && Number.isFinite(countedNum) && countedNum >= 0;
    const drawerDiff = countedValid ? round2((countedNum as number) - t.cash) : 0;
    const isToday = date === todayLocal();
    const canClose = countedValid && (drawerDiff === 0 || note.trim().length > 0) && !saving;

    const closeDay = async () => {
        if (!canClose) return;
        setSaving(true);
        const res = await frontdeskService.submitCashUp({
            date,
            expectedCash: t.cash,
            countedCash: round2(countedNum as number),
            expectedMomo: t.momo,
            varianceAmount: drawerDiff,
            ...(note.trim() ? { note: note.trim() } : {}),
        });
        setSaving(false);
        if (res.success) {
            showToast("Cash-up saved", "success");
            load();
        } else showToast(res.message || "Couldn't save the cash-up", "error");
    };

    const tile = (label: string, value: string, sub?: string, tone = "text-neutral-900") => (
        <div className="rounded-xl border border-[#e3e3e3] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
        </div>
    );

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Counter Cash-up</h1>
                        <p className="mt-1 text-sm text-[#7d7d7d]">
                            {userOfficeName ? `${userOfficeName} · ` : ""}Payments taken when customers collect parcels at the counter.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            id="cashup-date"
                            aria-label="Day"
                            type="date"
                            value={date}
                            max={todayLocal()}
                            onChange={(e) => e.target.value && setDate(e.target.value)}
                            className="w-[160px] border-[#d1d1d1]"
                        />
                        <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh" className="border-[#d1d1d1]">
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error} If this keeps happening, the backend may not have the counter cash-up yet (handoff Part L).
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {tile("Pickups", String(t.count))}
                    {tile("Amount due", formatCurrency(t.due))}
                    {tile("Received", formatCurrency(t.paid))}
                    {tile("Cash", formatCurrency(t.cash), "Should be in the drawer")}
                    {tile("Mobile money", formatCurrency(t.momo), "Check against the MoMo account")}
                    {tile("Short / over", formatCurrency(t.variance), t.short ? `${t.short} pickup${t.short === 1 ? "" : "s"} paid less` : "All paid in full", t.variance < 0 ? "text-red-600" : t.variance > 0 ? "text-amber-600" : "text-green-700")}
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
                    <Card className="border border-[#e3e3e3] bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-100 bg-gray-50 text-left text-[11px] uppercase tracking-wider text-neutral-500">
                                            <th className="px-4 py-3 font-semibold">Time</th>
                                            <th className="px-4 py-3 font-semibold">Parcel</th>
                                            <th className="px-4 py-3 font-semibold">Collected by</th>
                                            <th className="px-4 py-3 text-right font-semibold">Due</th>
                                            <th className="px-4 py-3 text-right font-semibold">Received</th>
                                            <th className="px-4 py-3 font-semibold">Method</th>
                                            <th className="px-4 py-3 font-semibold">Difference</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && rows.length === 0 && (
                                            <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500"><Loader className="inline w-4 h-4 animate-spin mr-2" />Loading…</td></tr>
                                        )}
                                        {!loading && rows.length === 0 && (
                                            <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">No parcels were collected at the counter on this day.</td></tr>
                                        )}
                                        {rows.map((r) => (
                                            <tr key={r.parcelId} className="border-b border-neutral-50 last:border-0 align-top">
                                                <td className="px-4 py-3 whitespace-nowrap text-neutral-600 tabular-nums">
                                                    {new Date(r.pickedUpAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    {r.recordedByName && <p className="text-[11px] text-neutral-400 font-sans">by {r.recordedByName}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-mono text-xs font-semibold text-neutral-700">{r.parcelId}</p>
                                                    {r.receiverName && <p className="text-xs text-neutral-500">{r.receiverName}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-neutral-700">
                                                    {r.collectedByName || "-"}
                                                    {r.collectedByPhone && <p className="text-xs text-neutral-400">{formatPhoneNumber(r.collectedByPhone)}</p>}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(r.amountDue)}</td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums font-semibold">{formatCurrency(r.amountPaid)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {r.paymentMethod === "MOMO" ? (
                                                        <span className="inline-flex items-center gap-1 text-neutral-700"><Smartphone className="w-3.5 h-3.5" /> MoMo</span>
                                                    ) : r.paymentMethod === "CASH" ? (
                                                        <span className="inline-flex items-center gap-1 text-neutral-700"><Banknote className="w-3.5 h-3.5" /> Cash</span>
                                                    ) : <span className="text-neutral-400">None</span>}
                                                    {r.momoReference && <p className="text-[11px] text-neutral-400 font-mono">{r.momoReference}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.varianceAmount ? (
                                                        <>
                                                            <p className={`whitespace-nowrap font-semibold tabular-nums ${r.varianceAmount < 0 ? "text-red-600" : "text-amber-600"}`}>
                                                                {r.varianceAmount > 0 ? "+" : ""}{formatCurrency(r.varianceAmount)}
                                                            </p>
                                                            <p className="text-xs text-neutral-500">{r.varianceReason || "No reason given"}{r.varianceNote ? `: ${r.varianceNote}` : ""}</p>
                                                        </>
                                                    ) : <span className="text-neutral-400">None</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Close the day */}
                    <Card className="border border-[#e3e3e3] bg-white self-start">
                        <CardContent className="p-5 space-y-4">
                            {closed ? (
                                <>
                                    <div className="flex items-center gap-2 text-green-700">
                                        <Lock className="w-4 h-4" />
                                        <p className="font-semibold">Day closed</p>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                                        <dt className="text-neutral-500">Cash expected</dt><dd className="text-right tabular-nums">{formatCurrency(closed.expectedCash)}</dd>
                                        <dt className="text-neutral-500">Cash counted</dt><dd className="text-right tabular-nums">{formatCurrency(closed.countedCash)}</dd>
                                        <dt className="text-neutral-500">Difference</dt>
                                        <dd className={`text-right tabular-nums font-semibold ${closed.varianceAmount < 0 ? "text-red-600" : closed.varianceAmount > 0 ? "text-amber-600" : "text-green-700"}`}>{formatCurrency(closed.varianceAmount)}</dd>
                                        <dt className="text-neutral-500">Mobile money</dt><dd className="text-right tabular-nums">{formatCurrency(closed.expectedMomo)}</dd>
                                    </dl>
                                    {closed.note && <p className="text-xs text-neutral-600 bg-gray-50 rounded-md p-2">{closed.note}</p>}
                                    <p className="text-xs text-neutral-400">
                                        {closed.closedByName ? `Closed by ${closed.closedByName}` : "Closed"}
                                        {closed.closedAt ? ` at ${new Date(closed.closedAt).toLocaleString()}` : ""}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="font-semibold text-neutral-800">Close the day</p>
                                        <p className="text-xs text-neutral-500 mt-0.5">
                                            Count the cash in the drawer and enter it. {isToday ? "Do this at the end of the day." : ""}
                                        </p>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-neutral-500">Cash expected</span>
                                        <span className="font-semibold tabular-nums">{formatCurrency(t.cash)}</span>
                                    </div>
                                    <div>
                                        <label htmlFor="cashup-counted" className="block text-xs font-semibold text-neutral-700 mb-1">Cash counted (GHC)</label>
                                        <Input
                                            id="cashup-counted"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            value={counted}
                                            onChange={(e) => setCounted(e.target.value)}
                                            placeholder={t.cash.toFixed(2)}
                                            className="border-[#d1d1d1] tabular-nums"
                                        />
                                    </div>
                                    {countedValid && (
                                        drawerDiff === 0 ? (
                                            <p className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle2 className="w-4 h-4" /> Drawer matches</p>
                                        ) : (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                                                <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    {drawerDiff < 0 ? `${formatCurrency(-drawerDiff)} short` : `${formatCurrency(drawerDiff)} over`}
                                                </p>
                                                <Input id="cashup-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain the difference (required)" className="border-amber-200 bg-white" />
                                            </div>
                                        )
                                    )}
                                    <Button onClick={closeDay} disabled={!canClose} className="w-full bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50">
                                        {saving ? <><Loader className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Close day"}
                                    </Button>
                                    <p className="text-[11px] text-neutral-400">Mobile money ({formatCurrency(t.momo)}) isn't counted here; check it against the MoMo statement.</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
