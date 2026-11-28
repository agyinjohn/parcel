import { useCallback, useEffect, useMemo, useState } from "react";
import {
    PackageIcon, SearchIcon, XIcon, MapPinIcon, ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon,
    ChevronDownIcon, ChevronRightIcon, Loader, RefreshCw, Phone, AlertTriangle, Navigation,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { formatCurrency, formatPhoneNumber } from "../../utils/dataHelpers";
import frontdeskService from "../../services/frontdeskService";
import riderService from "../../services/riderService";
import { STATUS_LABEL, groupActive, sinceAssigned, type ActiveParcel, type ActiveRider, type ActiveStatus } from "./activeDeliveries";

const STATUS_CHIP: Record<ActiveStatus, string> = {
    ASSIGNED: "bg-amber-50 text-amber-800 ring-amber-200",
    ACCEPTED: "bg-blue-50 text-blue-800 ring-blue-200",
    PICKED_UP: "bg-green-50 text-green-800 ring-green-200",
};
const FAIL_REASONS = ["Customer not reachable", "Customer not available", "Wrong or incomplete address", "Customer refused the parcel", "Customer asked to reschedule", "Other"];
const initials = (n: string) => n.split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

/**
 * Active Deliveries (managers): every parcel still out with a rider, grouped by rider, with the
 * rider's real progress and what they should bring back. Managers can close a parcel as delivered
 * or failed on the rider's behalf (PUT /api-rider/manager/assignments/{id}/status).
 */
export const ActiveDeliveries = (): JSX.Element => {
    const { showToast } = useToast();
    const [riders, setRiders] = useState<ActiveRider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadedAt, setLoadedAt] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<ActiveStatus | "all">("all");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [delivering, setDelivering] = useState<ActiveParcel | null>(null);
    const [failing, setFailing] = useState<ActiveParcel | null>(null);
    const [method, setMethod] = useState<"cash" | "momo" | "">("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await frontdeskService.getActiveAssignments();
        setLoading(false);
        if (res.success) {
            setRiders(groupActive(res.data ?? []));
            setError(null);
            setLoadedAt(Date.now());
        } else setError(res.message || "Couldn't load active deliveries.");
    }, []);
    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return riders
            .map((r) => ({
                ...r,
                parcels: r.parcels.filter((p) =>
                    (status === "all" || p.status === status) &&
                    (!q || p.parcelId.toLowerCase().includes(q) || p.receiverName?.toLowerCase().includes(q) || p.receiverPhone?.includes(q) || r.name.toLowerCase().includes(q))),
            }))
            .filter((r) => r.parcels.length > 0);
    }, [riders, search, status]);

    const totals = useMemo(() => {
        const all = riders.flatMap((r) => r.parcels);
        return {
            parcels: all.length,
            riders: riders.length,
            waiting: all.filter((p) => p.status === "ASSIGNED").length,
            out: all.filter((p) => p.status === "PICKED_UP").length,
            stale: all.filter((p) => sinceAssigned(p.assignedAt).stale).length,
            toCollect: Math.round(all.reduce((s, p) => s + p.toCollect, 0) * 100) / 100,
        };
    }, [riders]);

    const closeDialogs = () => { setDelivering(null); setFailing(null); setMethod(""); setReason(""); setNote(""); };

    const markDelivered = async () => {
        if (!delivering || !method) return;
        setBusy(true);
        const res = await riderService.updateManagerAssignmentStatus(delivering.assignmentId, "DELIVERED", undefined, undefined, method, delivering.parcelId);
        setBusy(false);
        if (res.success) { showToast(`${delivering.parcelId} marked delivered (${method === "cash" ? "cash" : "MoMo"})`, "success"); closeDialogs(); load(); }
        else showToast(res.message || "Couldn't mark it delivered", "error");
    };
    const markFailed = async () => {
        if (!failing || !reason || (reason === "Other" && !note.trim())) return;
        setBusy(true);
        const text = reason === "Other" ? note.trim() : note.trim() ? `${reason}: ${note.trim()}` : reason;
        const res = await riderService.updateManagerAssignmentStatus(failing.assignmentId, "RETURNED", undefined, text, undefined, failing.parcelId);
        setBusy(false);
        if (res.success) { showToast(`${failing.parcelId} marked as not delivered`, "success"); closeDialogs(); load(); }
        else showToast(res.message || "Couldn't record the failed delivery", "error");
    };

    const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    return (
        <div className="w-full">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        ["Parcels out", String(totals.parcels), `with ${totals.riders} rider${totals.riders === 1 ? "" : "s"}`, "text-neutral-900"],
                        ["Waiting for rider", String(totals.waiting), "assigned, not yet accepted", "text-amber-700"],
                        ["Out for delivery", String(totals.out), totals.stale ? `${totals.stale} out for over a day` : "picked up by the rider", totals.stale ? "text-red-600" : "text-green-700"],
                        ["To collect", formatCurrency(totals.toCollect), "riders should bring back", "text-[#ea690c]"],
                    ].map(([label, v, sub, cls]) => (
                        <div key={label} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6b7280]">{label}</p>
                            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${cls}`}>{v}</p>
                            <p className="text-xs text-[#6b7280]">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Search and filter */}
                <Card className="border border-[#e5e7eb] bg-white">
                    <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parcel ID, recipient, phone or rider" className="border-[#d1d1d1] pl-9 pr-9" />
                            {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neutral-800"><XIcon className="h-4 w-4" /></button>}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {([["all", "All"], ["ASSIGNED", "Waiting for rider"], ["ACCEPTED", "Accepted"], ["PICKED_UP", "Out for delivery"]] as const).map(([v, l]) => (
                                <button key={v} onClick={() => setStatus(v)} aria-pressed={status === v}
                                    className={`rounded-full border px-3 py-1 text-xs ${status === v ? "border-orange-200 bg-orange-50 font-semibold text-[#ea690c]" : "border-[#e5e7eb] text-neutral-600 hover:bg-gray-50"}`}>{l}</button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-[#d1d1d1]" aria-label="Refresh">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </CardContent>
                </Card>
                {loadedAt && <p className="-mt-3 text-xs text-[#9a9a9a]">Updated {new Date(loadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}

                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error} <button onClick={load} className="font-semibold underline">Try again</button></div>}

                {loading && riders.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-neutral-500"><Loader className="h-5 w-5 animate-spin" />Loading active deliveries…</div>
                ) : !error && filtered.length === 0 ? (
                    <Card className="border border-[#e5e7eb] bg-white"><CardContent className="py-14 text-center">
                        <PackageIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <p className="font-medium text-neutral-700">{riders.length === 0 ? "No parcels are out with riders" : "Nothing matches your search"}</p>
                        <p className="mt-1 text-sm text-[#6b7280]">{riders.length === 0 ? "Assign parcels to riders in Package Assignments to see them here." : "Try a different search or status."}</p>
                    </CardContent></Card>
                ) : (
                    filtered.map((r) => {
                        const open = !collapsed.has(r.riderId);
                        const oldest = sinceAssigned(r.oldestAssignedAt);
                        return (
                            <Card key={r.riderId} className="overflow-hidden border border-[#e5e7eb] bg-white">
                                <button onClick={() => toggle(r.riderId)} className="flex w-full flex-wrap items-center gap-4 px-4 py-3 text-left hover:bg-gray-50" aria-expanded={open}>
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">{initials(r.name)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-neutral-900">{r.name}</span>
                                        <span className="block text-xs text-[#6b7280]">{r.phone ? formatPhoneNumber(r.phone) : ""}{oldest.text ? ` · oldest assigned ${oldest.text}` : ""}</span>
                                    </span>
                                    <span className="flex gap-4 text-center">
                                        {([["ASSIGNED", "Waiting", "text-amber-700"], ["ACCEPTED", "Accepted", "text-blue-700"], ["PICKED_UP", "Out", "text-green-700"]] as const).map(([k, l, c]) => (
                                            <span key={k}><span className="block text-[11px] text-[#6b7280]">{l}</span><span className={`block text-lg font-bold tabular-nums ${c}`}>{r.counts[k]}</span></span>
                                        ))}
                                        <span><span className="block text-[11px] text-[#6b7280]">To collect</span><span className="block text-lg font-bold tabular-nums text-[#ea690c]">{formatCurrency(r.toCollect)}</span></span>
                                    </span>
                                    {open ? <ChevronDownIcon className="h-5 w-5 text-gray-400" /> : <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
                                </button>
                                {open && (
                                    <div className="divide-y divide-[#f1f2f4] border-t border-[#ececec]">
                                        {r.parcels.map((p) => {
                                            const since = sinceAssigned(p.assignedAt);
                                            return (
                                                <div key={p.key} className="grid grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-mono text-xs font-semibold text-neutral-700">{p.parcelId}</span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_CHIP[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                                                            {since.text && (
                                                                <span className={`inline-flex items-center gap-1 text-[11px] ${since.stale ? "font-semibold text-red-600" : "text-[#9a9a9a]"}`}>
                                                                    {since.stale ? <AlertTriangle className="h-3 w-3" /> : <ClockIcon className="h-3 w-3" />}assigned {since.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="flex items-center gap-1.5 text-sm text-neutral-800"><UserIcon className="h-3.5 w-3.5 text-gray-400" />{p.receiverName || "Unknown recipient"}
                                                            {p.receiverPhone && <a href={`tel:${p.receiverPhone}`} className="ml-1 inline-flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#ea690c]"><Phone className="h-3 w-3" />{formatPhoneNumber(p.receiverPhone)}</a>}
                                                        </p>
                                                        <p className="flex items-start gap-1.5 text-xs text-[#6b7280]">
                                                            <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                                            <span>
                                                                {p.locationName && <span className="font-medium text-neutral-700">{p.locationName}{p.receiverAddress ? " · " : ""}</span>}
                                                                {p.receiverAddress || (!p.locationName ? "No address" : "")}
                                                                {p.lat != null && p.lng != null && (
                                                                    <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-[#ea690c] hover:underline"><Navigation className="h-3 w-3" />Map</a>
                                                                )}
                                                            </span>
                                                        </p>
                                                        {p.description && <p className="text-xs text-[#9a9a9a]">Item: {p.description}</p>}
                                                    </div>
                                                    <div className="rounded-lg border border-[#ececec] bg-[#fafafa] px-3 py-2 text-xs">
                                                        {p.charges.map((c) => <div key={c.label} className="flex justify-between"><span className="text-[#6b7280]">{c.label}</span><span className="tabular-nums">{c.amount.toFixed(2)}</span></div>)}
                                                        {p.podAmount > 0 && <div className="flex justify-between"><span className="text-[#6b7280]">Item value (POD)</span><span className="tabular-nums">{p.podAmount.toFixed(2)}</span></div>}
                                                        <div className="mt-1 flex justify-between border-t border-[#e5e7eb] pt-1 text-sm font-bold"><span>To collect</span><span className="tabular-nums text-[#ea690c]">{formatCurrency(p.toCollect)}</span></div>
                                                    </div>
                                                    <div className="flex gap-2 lg:flex-col">
                                                        <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => { setDelivering(p); setMethod(""); }}>
                                                            <CheckCircleIcon className="mr-1.5 h-4 w-4" />Delivered
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setFailing(p); setReason(""); setNote(""); }}>
                                                            <XCircleIcon className="mr-1.5 h-4 w-4" />Not delivered
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {delivering && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm delivery">
                    <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-lg"><CardContent className="space-y-4 p-6">
                        <div className="flex items-start justify-between">
                            <div><h3 className="text-lg font-bold text-neutral-800">Mark as delivered</h3><p className="text-xs text-[#6b7280]">{delivering.parcelId} · {delivering.receiverName}</p></div>
                            <button onClick={closeDialogs} aria-label="Close" className="text-gray-400 hover:text-neutral-800"><XIcon className="h-5 w-5" /></button>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-[#6b7280]">The rider should hand in</p><p className="text-2xl font-bold text-[#ea690c]">{formatCurrency(delivering.toCollect)}</p></div>
                        <div>
                            <p className="mb-1.5 text-sm font-semibold text-neutral-800">How did the customer pay?</p>
                            <div className="grid grid-cols-2 gap-2">
                                {([["cash", "Cash"], ["momo", "Mobile money"]] as const).map(([v, l]) => (
                                    <button key={v} type="button" aria-pressed={method === v} onClick={() => setMethod(v)}
                                        className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold ${method === v ? "border-[#ea690c] bg-orange-50" : "border-[#e5e7eb] text-neutral-600"}`}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-[#6b7280]">Use this when the rider can't update the app. The money is reconciled with the rider as usual.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={closeDialogs}>Cancel</Button>
                            <Button className="flex-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50" disabled={!method || busy} onClick={markDelivered}>{busy ? "Saving…" : "Confirm delivery"}</Button>
                        </div>
                    </CardContent></Card>
                </div>
            )}

            {failing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Delivery failed">
                    <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-lg"><CardContent className="space-y-4 p-6">
                        <div className="flex items-start justify-between">
                            <div><h3 className="text-lg font-bold text-neutral-800">Not delivered</h3><p className="text-xs text-[#6b7280]">{failing.parcelId} · {failing.receiverName}</p></div>
                            <button onClick={closeDialogs} aria-label="Close" className="text-gray-400 hover:text-neutral-800"><XIcon className="h-5 w-5" /></button>
                        </div>
                        <div>
                            <label htmlFor="fail-reason" className="mb-1 block text-sm font-semibold text-neutral-800">Reason</label>
                            <select id="fail-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-md border border-[#d1d1d1] px-3 text-sm">
                                <option value="">Choose a reason…</option>
                                {FAIL_REASONS.map((x) => <option key={x}>{x}</option>)}
                            </select>
                        </div>
                        <Input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "Other" ? "What happened? (required)" : "Note (optional)"} className="border-[#d1d1d1]" />
                        <p className="text-xs text-[#6b7280]">The parcel comes back to the station as returned, so it can be called and reassigned.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={closeDialogs}>Cancel</Button>
                            <Button className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50" disabled={!reason || (reason === "Other" && !note.trim()) || busy} onClick={markFailed}>{busy ? "Saving…" : "Mark not delivered"}</Button>
                        </div>
                    </CardContent></Card>
                </div>
            )}
        </div>
    );
};
