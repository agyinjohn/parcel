import { useEffect, useMemo, useState } from "react";
import { Loader, Pencil, HandCoins, ChevronDown, ChevronRight, PauseCircle, PlayCircle, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { formatCurrency } from "../../utils/dataHelpers";
import driverPayments, { type DriverPayout, type FeeLine, type Statement } from "../../services/driverPaymentsService";
import { AdjustmentForm, DriverForm, Modal, PayDialog, ReceiptDialog } from "./dialogs";
import { payoutTotals, prettyPhone, statementMismatches } from "./payoutMath";

const STATE_CHIP: Record<FeeLine["state"], string> = {
    READY: "bg-green-50 text-green-700",
    WAITING: "bg-amber-50 text-amber-700",
    PAID: "bg-gray-100 text-gray-600",
    ON_HOLD: "bg-red-50 text-red-600",
    NOT_PAYABLE: "bg-blue-50 text-blue-700",
};
const STATE_LABEL: Record<FeeLine["state"], string> = { READY: "Ready", WAITING: "Waiting", PAID: "Paid", ON_HOLD: "On hold", NOT_PAYABLE: "Not payable" };

const initials = (n: string) => n.split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const when = (t?: number) => {
    if (!t) return "";
    const d = new Date(t);
    const today = new Date();
    const same = d.toDateString() === today.toDateString();
    return same ? `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

interface Props {
    driverId: string;
    canManage: boolean;
    station?: string;
    /** Called after anything that changes balances, so the list and totals refresh. */
    onChanged: () => void;
}

/** A driver's statement: balances, trips with their fee lines, and the pay bar. */
export const DriverStatement = ({ driverId, canManage, station, onChanged }: Props) => {
    const { showToast } = useToast();
    const [st, setSt] = useState<Statement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [open, setOpen] = useState<Set<string>>(new Set());
    const [paying, setPaying] = useState(false);
    const [receipt, setReceipt] = useState<DriverPayout | null>(null);
    const [editing, setEditing] = useState(false);
    const [adjusting, setAdjusting] = useState(false);
    const [holdLine, setHoldLine] = useState<FeeLine | null>(null);
    const [holdReason, setHoldReason] = useState("");
    // Paid history is limited to keep the statement light; unpaid fees always come back, however old.
    const [historyDays, setHistoryDays] = useState<number | null>(60);

    useEffect(() => {
        let stale = false;
        setLoading(true);
        driverPayments.statement(driverId, historyDays ? Date.now() - historyDays * 864e5 : undefined).then((r) => {
            if (stale) return;
            setLoading(false);
            if (r.success && r.data) {
                setSt(r.data);
                setError(null);
                // Pre-select every ready line; open trips that have something to act on.
                const ready = r.data.trips.flatMap((t) => (t.lines ?? []).filter((l) => l.state === "READY").map((l) => l.id));
                setSelected(new Set(ready));
                setOpen(new Set(r.data.trips.filter((t) => !t.fullyPaid).slice(0, 2).map((t) => t.tripId)));
            } else setError(r.message || "Couldn't load the statement.");
        });
        return () => { stale = true; };
    }, [driverId, version, historyDays]);

    const allLines = useMemo(() => (st?.trips ?? []).flatMap((t) => (t.lines ?? []).map((l) => ({ ...l, tripId: t.tripId }))), [st]);
    const chosen = allLines.filter((l) => selected.has(l.id) && l.state === "READY");
    const chosenTrips = new Set(chosen.map((l) => l.tripId)).size;
    const total = payoutTotals(chosen, []).gross;
    const reload = () => { setVersion((v) => v + 1); onChanged(); };

    const toggle = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

    const doHold = async () => {
        if (!holdLine || !holdReason.trim()) return;
        const r = await driverPayments.hold(holdLine.id, holdReason.trim());
        if (r.success) { showToast("Fee put on hold", "success"); setHoldLine(null); setHoldReason(""); reload(); } else showToast(r.message || "Couldn't put it on hold", "error");
    };
    const doRelease = async (l: FeeLine) => {
        const r = await driverPayments.release(l.id);
        if (r.success) { showToast("Hold released", "success"); reload(); } else showToast(r.message || "Couldn't release it", "error");
    };

    if (loading && !st) return <div className="flex h-64 items-center justify-center gap-2 text-sm text-neutral-500"><Loader className="h-4 w-4 animate-spin" />Loading statement…</div>;
    if (error || !st) return <div className="p-6 text-sm text-red-600">{error}</div>;
    const { driver, balances, trips } = st;
    const blocked = driver.status === "BLOCKED";

    return (
        <div className={`flex h-full flex-col transition-opacity ${loading ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#ececec] px-5 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] to-[#c2410c] text-sm font-bold text-white">{initials(driver.name)}</div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-neutral-900">{driver.name}{blocked && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 align-middle">Blocked</span>}</h2>
                    <p className="flex flex-wrap gap-x-3 text-xs text-[#6b7280]">
                        {(driver.phoneNumbers ?? []).map((p) => <span key={p}>{prettyPhone(p)}</span>)}
                        {driver.momoNumber && <span>MoMo: {prettyPhone(driver.momoNumber)}{driver.momoNetwork ? ` (${driver.momoNetwork})` : ""}</span>}
                        {(driver.vehicles ?? []).length > 0 && <span>Vehicles: {driver.vehicles!.join(", ")}</span>}
                    </p>
                </div>
                {canManage && <Button variant="outline" size="sm" className="border-[#d1d1d1]" onClick={() => setAdjusting(true)}><HandCoins className="mr-1.5 h-4 w-4" />Advance / adjust</Button>}
                <Button variant="outline" size="sm" className="border-[#d1d1d1]" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-4 w-4" />Edit driver</Button>
            </div>

            <div className="grid grid-cols-2 border-b border-[#ececec] sm:grid-cols-4">
                {[
                    ["Ready to pay", balances.readyAmount, "text-green-700", `${balances.readyCount} parcels`],
                    ["Waiting on customers", balances.waitingAmount, "text-amber-700", `${balances.waitingCount} parcels`],
                    ["On hold", balances.onHoldAmount, "text-red-600", `${balances.onHoldCount} parcels`],
                    ["Paid (30 days)", balances.paidLast30Days, "text-neutral-900", ""],
                ].map(([label, v, cls, sub]) => (
                    <div key={label as string} className="border-r border-[#ececec] px-5 py-3 last:border-r-0">
                        <p className="text-[11px] text-[#6b7280]">{label}</p>
                        <p className={`text-lg font-bold tabular-nums ${cls}`}>{formatCurrency(v as number)}</p>
                        {sub && <p className="text-[11px] text-[#9a9a9a]">{sub}</p>}
                    </div>
                ))}
            </div>

            {(() => {
                const problems = statementMismatches(balances, trips);
                return problems.length > 0 ? (
                    <div role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-5 py-2.5 text-xs text-red-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span><b>These figures don't add up, so don't pay until it's checked.</b> {problems.join(". ")}. Refresh; if it stays, report it to the admin.</span>
                    </div>
                ) : null;
            })()}

            {st.openAdjustments.length > 0 && (
                <div className="border-b border-[#ececec] bg-amber-50/60 px-5 py-2.5 text-xs text-amber-900">
                    <b>Open:</b> {st.openAdjustments.map((a) => `${a.type === "ADVANCE" ? "advance" : a.type.toLowerCase()} ${formatCurrency(a.amount - (a.repaidAmount || 0))}${a.reason ? ` (${a.reason})` : ""}`).join(" · ")}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {trips.length === 0 && <p className="p-6 text-sm text-[#6b7280]">No trips for this driver yet.</p>}
                {trips.map((t) => {
                    const lines = t.lines ?? [];
                    const ready = lines.filter((l) => l.state === "READY");
                    const allOn = ready.length > 0 && ready.every((l) => selected.has(l.id));
                    const isOpen = open.has(t.tripId);
                    const short = t.declaredCount != null && t.receivedCount != null && t.receivedCount < t.declaredCount;
                    return (
                        <div key={t.tripId} className="border-b border-[#ececec]">
                            <div className="flex items-center gap-3 bg-[#fafafa] px-5 py-2.5">
                                <input type="checkbox" aria-label={`Select ready parcels on trip ${when(t.arrivedAt)}`} className="h-4 w-4 accent-[#ea690c]" disabled={!canManage || ready.length === 0 || blocked} checked={allOn} onChange={(e) => toggle(ready.map((l) => l.id), e.target.checked)} />
                                <button onClick={() => setOpen((s) => { const n = new Set(s); isOpen ? n.delete(t.tripId) : n.add(t.tripId); return n; })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
                                    <span className="text-sm font-semibold text-neutral-800 whitespace-nowrap">Trip · {when(t.arrivedAt)}</span>
                                    <span className="truncate text-xs text-[#6b7280]">
                                        {[t.vehicleNumber, t.origin && `${t.origin} → here`, t.receivedByName && `received by ${t.receivedByName}`, `${t.receivedCount ?? lines.length} parcels${t.declaredCount != null ? ` (${t.declaredCount} declared)` : ""}`].filter(Boolean).join(" · ")}
                                    </span>
                                    {(t.flagged || short) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-label="Fewer parcels received than declared" />}
                                </button>
                                <span className="text-sm whitespace-nowrap tabular-nums">
                                    {t.fullyPaid ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Paid</span> : <><b>{formatCurrency(t.readyAmount ?? 0)}</b> <span className="text-xs text-[#6b7280]">ready</span></>}
                                </span>
                            </div>
                            {isOpen && (
                                <table className="w-full text-sm">
                                    <tbody>
                                        {lines.map((l) => (
                                            <tr key={l.id} className="border-t border-[#f3f4f6]">
                                                <td className="w-10 py-2 pl-5"><input type="checkbox" aria-label={`Select ${l.parcelId}`} className="h-4 w-4 accent-[#ea690c]" disabled={!canManage || l.state !== "READY" || blocked} checked={selected.has(l.id) && l.state === "READY"} onChange={(e) => toggle([l.id], e.target.checked)} /></td>
                                                <td className="py-2 font-mono text-xs font-semibold text-neutral-700">{l.parcelId}</td>
                                                <td className="py-2 text-neutral-700">{l.receiverName || "-"}</td>
                                                <td className="py-2">
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_CHIP[l.state]}`}>
                                                        {STATE_LABEL[l.state]}{l.state === "READY" && l.readyReason ? ` · ${l.readyReason.toLowerCase().replace("_", " ")}` : ""}{l.state === "WAITING" && l.shelfName ? ` · shelf ${l.shelfName}` : ""}{l.state === "ON_HOLD" && l.holdReason ? ` · ${l.holdReason}` : ""}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-right tabular-nums">{(l.amount || 0).toFixed(2)}</td>
                                                <td className="w-10 py-2 pr-4 text-right">
                                                    {canManage && (l.state === "READY" || l.state === "WAITING") && (
                                                        <button onClick={() => setHoldLine(l)} title="Put on hold" aria-label={`Put ${l.parcelId} on hold`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><PauseCircle className="h-4 w-4" /></button>
                                                    )}
                                                    {canManage && l.state === "ON_HOLD" && (
                                                        <button onClick={() => doRelease(l)} title="Release hold" aria-label={`Release ${l.parcelId}`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-700"><PlayCircle className="h-4 w-4" /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                })}
                {historyDays !== null && (
                    <div className="px-5 pt-2">
                        <button onClick={() => setHistoryDays(null)} className="text-xs font-medium text-[#ea690c] hover:underline">
                            Showing paid trips from the last {historyDays} days (unpaid ones always show). Show older paid trips
                        </button>
                    </div>
                )}
                {st.payouts.length > 0 && (
                    <div className="px-5 py-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">Recent payouts</p>
                        {st.payouts.slice(0, 5).map((p) => (
                            <button key={p.id} onClick={() => setReceipt(p)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50">
                                <span>{p.receiptNo ?? p.id} · {new Date(p.paidAt ?? 0).toLocaleDateString()} · {p.paymentMethod === "MOMO" ? "MoMo" : "Cash"}{p.reversed ? " · reversed" : !p.confirmed ? " · not confirmed" : ""}</span>
                                <span className={`tabular-nums ${p.reversed ? "line-through text-gray-400" : "font-semibold"}`}>{formatCurrency(p.netAmount)}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t-2 border-[#ea690c] bg-white px-5 py-3">
                <div>
                    <p className="text-xs text-[#6b7280]">Selected: {chosen.length} parcel{chosen.length === 1 ? "" : "s"} from {chosenTrips} trip{chosenTrips === 1 ? "" : "s"}</p>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
                </div>
                <p className="min-w-[180px] flex-1 text-xs text-[#6b7280]">
                    {!canManage ? "Only a manager can pay drivers." : blocked ? "This driver is blocked. Edit the driver to unblock." : "Only parcels whose customers have paid can be selected. Add deductions in the next step."}
                </p>
                <Button className="bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50" disabled={!canManage || blocked || chosen.length === 0} onClick={() => setPaying(true)}>
                    Pay {formatCurrency(total)} →
                </Button>
            </div>

            {paying && (
                <PayDialog driver={driver} lines={chosen} tripCount={chosenTrips} openAdvances={st.openAdjustments} onClose={() => setPaying(false)}
                    onPaid={(p) => { setPaying(false); setReceipt(p); reload(); }}
                    onStale={() => { setPaying(false); setSelected(new Set()); reload(); }} />
            )}
            {receipt && <ReceiptDialog payout={receipt} station={station} canManage={canManage} onClose={() => setReceipt(null)} onChanged={reload} />}
            {editing && <DriverForm driver={driver} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
            {adjusting && <AdjustmentForm driver={driver} onClose={() => setAdjusting(false)} onSaved={() => { setAdjusting(false); reload(); }} />}
            {holdLine && (
                <Modal title={`Hold ${holdLine.parcelId}`} sub="The fee won't be paid until the hold is released." onClose={() => setHoldLine(null)}
                    footer={<>
                        <Button variant="outline" className="flex-1" onClick={() => setHoldLine(null)}>Cancel</Button>
                        <Button className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={!holdReason.trim()} onClick={doHold}>Put on hold</Button>
                    </>}>
                    <Input aria-label="Reason for the hold" autoFocus value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="e.g. damaged on arrival" className="border-[#d1d1d1]" />
                </Modal>
            )}
        </div>
    );
};
