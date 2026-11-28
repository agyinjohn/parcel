import { useEffect, useState } from "react";
import { CheckCircle2, Loader, Mail, MapPin, Package, Phone, RefreshCw, XCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/toast";
import { useLocation as useLocations } from "../../../contexts/LocationContext";
import adminReports, { type PartnerApplication, type PartnerApplicationStatus } from "../../../services/adminReportsService";

const FILTERS: [PartnerApplicationStatus | "", string][] = [["NEW", "New"], ["CONTACTED", "Contacted"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"], ["", "All"]];
const STATUS_STYLE: Record<PartnerApplicationStatus, string> = {
    NEW: "bg-orange-50 text-[#ea690c] border-orange-200",
    CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-gray-100 text-gray-600 border-gray-200",
};
const VOLUME: Record<number, string> = { 5: "Fewer than 10", 30: "10–50", 100: "50–200", 250: "More than 200" };

/** Admin: "Become a partner" requests from the public form. Approving can create the partner's login. */
export const PartnerRequests = (): JSX.Element => {
    const { stations } = useLocations();
    const { showToast } = useToast();
    const [filter, setFilter] = useState<PartnerApplicationStatus | "">("NEW");
    const [rows, setRows] = useState<PartnerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [open, setOpen] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [createVendor, setCreateVendor] = useState(true);
    const [officeIds, setOfficeIds] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setLoading(true);
        adminReports.partnerApplications(filter || undefined).then((r) => {
            setLoading(false);
            setError(r.success ? null : r.message ?? "Couldn't load partner requests.");
            setRows([...(r.data ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        });
    }, [filter, version]);

    const start = (a: PartnerApplication) => { setOpen(a.id); setNote(a.adminNote ?? ""); setCreateVendor(true); setOfficeIds([]); };
    const act = async (a: PartnerApplication, status: "CONTACTED" | "APPROVED" | "REJECTED") => {
        if (status === "APPROVED" && createVendor && officeIds.length === 0) { showToast("Choose the station(s) this partner sends parcels to", "error"); return; }
        setBusy(true);
        const r = await adminReports.reviewPartnerApplication(a.id, {
            status, ...(note.trim() ? { note: note.trim() } : {}),
            ...(status === "APPROVED" ? { createVendor, ...(createVendor ? { officeIds } : {}) } : {}),
        });
        setBusy(false);
        if (!r.success) { showToast(r.message || "Couldn't update it", "error"); return; }
        showToast(status === "APPROVED" ? (createVendor ? `Approved. ${a.businessName} can now sign in with ${a.phoneNumber}.` : "Approved") : status === "CONTACTED" ? "Marked as contacted" : "Request rejected", "success");
        setOpen(null);
        setVersion((v) => v + 1);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map(([v, l]) => (
                    <button key={l} onClick={() => setFilter(v)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${filter === v ? "border-[#ea690c] bg-[#ea690c] text-white" : "border-[#d1d1d1] bg-white text-neutral-700 hover:bg-gray-50"}`}>{l}</button>
                ))}
                <Button variant="outline" size="sm" className="ml-auto border-[#d1d1d1]" onClick={() => setVersion((v) => v + 1)} aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
            </div>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {loading && rows.length === 0 && <p className="flex items-center gap-2 py-8 text-sm text-[#6b7280]"><Loader className="h-4 w-4 animate-spin" />Loading…</p>}
            {!loading && rows.length === 0 && !error && <p className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-10 text-center text-sm text-[#6b7280]">No {filter ? filter.toLowerCase() : ""} partner requests.</p>}

            <div className="space-y-3">
                {rows.map((a) => (
                    <div key={a.id} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                        <div className="flex flex-wrap items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-neutral-900">{a.businessName}</p>
                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</span>
                                </div>
                                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#4b5563]">
                                    <span>{a.contactName}</span>
                                    <a href={`tel:${a.phoneNumber}`} className="inline-flex items-center gap-1 hover:text-[#ea690c]"><Phone className="h-3.5 w-3.5" />{a.phoneNumber}</a>
                                    {a.email && <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 hover:text-[#ea690c]"><Mail className="h-3.5 w-3.5" />{a.email}</a>}
                                    {a.area && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.area}</span>}
                                    {a.parcelsPerWeek != null && <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{VOLUME[a.parcelsPerWeek] ?? a.parcelsPerWeek} parcels a week</span>}
                                </p>
                                {a.message && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-neutral-700">"{a.message}"</p>}
                                <p className="mt-2 text-xs text-[#9a9a9a]">
                                    {a.createdAt ? `Received ${new Date(a.createdAt).toLocaleString()}` : ""}
                                    {a.handledByName ? ` · ${a.status.toLowerCase()} by ${a.handledByName}${a.handledAt ? ` on ${new Date(a.handledAt).toLocaleDateString()}` : ""}` : ""}
                                    {a.vendorUserId ? " · partner login created" : ""}
                                </p>
                                {a.adminNote && open !== a.id && <p className="mt-1 text-xs italic text-[#6b7280]">Note: {a.adminNote}</p>}
                            </div>
                            {open !== a.id && a.status !== "APPROVED" && a.status !== "REJECTED" && (
                                <Button size="sm" className="bg-[#ea690c] text-white hover:bg-[#d45d0a]" onClick={() => start(a)}>Follow up</Button>
                            )}
                        </div>

                        {open === a.id && (
                            <div className="mt-4 space-y-3 border-t border-[#f0f0f0] pt-4">
                                <label className="block text-xs font-medium text-neutral-700">Note
                                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Called on Monday; sends about 40 parcels a week to Accra" className="mt-1 w-full rounded-lg border border-[#d1d1d1] px-3 py-2 text-sm" />
                                </label>
                                <label className="flex items-center gap-2 text-sm text-neutral-800">
                                    <input type="checkbox" checked={createVendor} onChange={(e) => setCreateVendor(e.target.checked)} className="h-4 w-4 accent-[#ea690c]" />
                                    When approving, create their partner login (they sign in with {a.phoneNumber})
                                </label>
                                {createVendor && (
                                    <div>
                                        <p className="mb-1 text-xs font-medium text-neutral-700">Stations they'll send parcels to</p>
                                        <div className="flex flex-wrap gap-2">
                                            {stations.map((s) => {
                                                const on = officeIds.includes(s.id);
                                                return <button key={s.id} type="button" onClick={() => setOfficeIds((l) => (on ? l.filter((x) => x !== s.id) : [...l, s.id]))} className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-[#ea690c] bg-orange-50 text-[#ea690c]" : "border-[#d1d1d1] text-neutral-700"}`}>{s.name}</button>;
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setOpen(null)} disabled={busy}>Cancel</Button>
                                    {a.status === "NEW" && <Button size="sm" variant="outline" onClick={() => act(a, "CONTACTED")} disabled={busy}><Phone className="mr-1.5 h-4 w-4" />Mark contacted</Button>}
                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => act(a, "REJECTED")} disabled={busy}><XCircle className="mr-1.5 h-4 w-4" />Reject</Button>
                                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => act(a, "APPROVED")} disabled={busy}>{busy ? <Loader className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}Approve</Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
