import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Eye, Printer, ChevronDown, ChevronUp,
  Package, CheckSquare, AlertCircle, Pencil,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { statusConfig, formatCurrency, type PartnerParcel, type PartnerParcelStatus } from "./partnerData";
import { ParcelDetailModal } from "./ParcelDetailModal";
import { EditParcelModal } from "./EditParcelModal";
import { isPartnerParcelEditable } from "./partnerFormUtils";
import { getVendorSessionProfile } from "./vendorSession";
import vendorService, { mapApiStatus, mapStatusToApi, mapVendorItemToPartner } from "../../services/vendorService";

// ─── Manifest print ────────────────────────────────────────────────────────────
function printManifest(stationName: string, parcels: PartnerParcel[], senderName: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const totalAmount = parcels.reduce((s, p) => s + p.itemCost + p.deliveryFee, 0);
  const podCount    = parcels.filter(p => p.pod).length;
  const date        = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const time        = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const rows = parcels.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="mono">${p.trackingId}</td>
      <td>${p.receiverName}<br/><span class="sub">${p.receiverPhone}${p.receiverAltPhone ? ` / ${p.receiverAltPhone}` : ""}</span></td>
      <td>${p.receiverAddress || "—"}</td>
      <td>${p.description || "—"}</td>
      <td class="center">${p.pod ? "YES" : "NO"}</td>
      <td class="right">GHC ${p.deliveryFee.toFixed(2)}</td>
      <td class="right">GHC ${p.pod ? p.itemCost.toFixed(2) : "—"}</td>
      <td class="right bold">GHC ${(p.itemCost + p.deliveryFee).toFixed(2)}</td>
    </tr>
  `).join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manifest — ${stationName}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 12mm; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 12px; }
        .logo-block { display: flex; align-items: center; gap: 12px; }
        .logo { height: 52px; width: 52px; object-fit: contain; }
        .brand { font-size: 18px; font-weight: bold; }
        .brand-sub { font-size: 11px; color: #555; }
        .doc-title { text-align: right; }
        .doc-title h2 { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .doc-title p { font-size: 11px; color: #555; margin-top: 2px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .meta-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
        .meta-box label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; display: block; margin-bottom: 3px; }
        .meta-box span { font-size: 13px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        thead tr { background: #111; color: white; }
        th { padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .mono { font-family: monospace; font-weight: bold; color: #c2410c; }
        .sub { font-size: 10px; color: #666; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .totals { border-top: 2px solid #111; padding-top: 8px; display: flex; justify-content: flex-end; gap: 24px; }
        .totals div { text-align: right; }
        .totals label { font-size: 10px; color: #666; display: block; }
        .totals span { font-size: 14px; font-weight: bold; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 16px; }
        .sig-line { border-bottom: 1px solid #111; height: 30px; margin-bottom: 4px; }
        .sig-label { font-size: 10px; color: #666; }
        .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; text-align: center; font-size: 10px; color: #888; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 landscape; margin: 8mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-block">
          <img src="/logo-1.png" alt="M&M" class="logo" crossorigin="anonymous" />
          <div>
            <div class="brand">Mealex &amp; Mailex (M&amp;M)</div>
            <div class="brand-sub">Parcel Delivery System</div>
          </div>
        </div>
        <div class="doc-title">
          <h2>Parcel Manifest</h2>
          <p>Generated: ${date} at ${time}</p>
        </div>
      </div>

      <div class="meta">
        <div class="meta-box"><label>Destination Station</label><span>${stationName}</span></div>
        <div class="meta-box"><label>Sender / Partner</label><span>${senderName || "—"}</span></div>
        <div class="meta-box"><label>Total Parcels</label><span>${parcels.length}</span></div>
        <div class="meta-box"><label>POD Parcels</label><span>${podCount}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tracking ID</th>
            <th>Receiver</th>
            <th>Address</th>
            <th>Description</th>
            <th class="center">POD</th>
            <th class="right">Del. Fee</th>
            <th class="right">Item Cost</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div><label>Total Parcels</label><span>${parcels.length}</span></div>
        <div><label>POD Parcels</label><span>${podCount}</span></div>
        <div><label>Total Amount</label><span>GHC ${totalAmount.toFixed(2)}</span></div>
      </div>

      <div class="signatures">
        <div><div class="sig-line"></div><div class="sig-label">Partner Representative Signature &amp; Date</div></div>
        <div><div class="sig-line"></div><div class="sig-label">M&amp;M Station Officer Signature &amp; Date</div></div>
      </div>

      <div class="footer">
        This manifest is an official record of parcels handed over to M&amp;M Parcel Delivery. Keep a copy for your records.
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

// ─── Station group ──────────────────────────────────────────────────────────
function StationGroup({
  stationName, parcels, checkedIds, onToggleOne, onToggleAll, onView, onEdit, senderName,
}: {
  stationName: string;
  parcels: PartnerParcel[];
  checkedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], check: boolean) => void;
  onView: (p: PartnerParcel) => void;
  onEdit: (p: PartnerParcel) => void;
  senderName: string;
}) {
  const [open, setOpen] = useState(true);
  const ids = parcels.map(p => p.id);
  const allChecked = ids.every(id => checkedIds.has(id));
  const someChecked = ids.some(id => checkedIds.has(id));
  const selectedParcels = parcels.filter(p => checkedIds.has(p.id));
  const totalAmount = parcels.reduce((s, p) => s + p.itemCost + p.deliveryFee, 0);

  return (
    <Card className="border border-[#d1d1d1] bg-white shadow-sm overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
            onChange={e => onToggleAll(ids, e.target.checked)}
            className="w-4 h-4 accent-[#ea690c] cursor-pointer"
          />
          <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 hover:text-[#ea690c] transition-colors">
            <Package className="w-4 h-4 text-[#ea690c]" />
            <span className="text-sm font-bold text-neutral-800">{stationName}</span>
            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{parcels.length}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">
            Total: <span className="font-bold text-neutral-800">{formatCurrency(totalAmount)}</span>
          </span>
          {someChecked && (
            <Button
              onClick={() => printManifest(stationName, selectedParcels, senderName)}
              size="sm"
              className="flex items-center gap-1.5 bg-[#ea690c] text-white hover:bg-[#d45e0a] h-7 px-3 text-xs"
            >
              <Printer className="w-3 h-3" />
              Print Manifest ({selectedParcels.length})
            </Button>
          )}
          {!someChecked && (
            <Button
              onClick={() => printManifest(stationName, parcels, senderName)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 border-[#ea690c] text-[#ea690c] hover:bg-orange-50 h-7 px-3 text-xs"
            >
              <Printer className="w-3 h-3" />
              Print All
            </Button>
          )}
        </div>
      </div>

      {/* Parcel rows */}
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-gray-50">
            <thead className="bg-white">
              <tr>
                <th className="w-8 px-4 py-2.5" />
                {["Tracking ID", "Receiver", "Description", "Amount", "Status", "Submitted", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parcels.map(p => {
                const s = statusConfig[p.status];
                const checked = checkedIds.has(p.id);
                return (
                  <tr key={p.id} className={`transition-colors ${checked ? "bg-orange-50/40" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-2.5 w-8">
                      <input type="checkbox" checked={checked} onChange={() => onToggleOne(p.id)}
                        className="w-3.5 h-3.5 accent-[#ea690c] cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-[#ea690c] bg-orange-50 px-2 py-0.5 rounded">{p.trackingId}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-semibold text-neutral-800">{p.receiverName}</p>
                      <p className="text-xs text-gray-500">{p.receiverPhone}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[140px] truncate">{p.description || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-semibold text-neutral-800">{formatCurrency(p.itemCost + p.deliveryFee)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge className={`${s.color} flex items-center gap-1 w-fit text-xs font-semibold`}>
                        {s.icon}{s.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-400">
                      {new Date(p.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button onClick={() => onView(p)} variant="outline" size="sm"
                          className="h-7 px-2 text-xs border-[#ea690c] text-[#ea690c] hover:bg-orange-50">
                          <Eye className="w-3 h-3" />
                        </Button>
                        {isPartnerParcelEditable(p.status) && (
                          <Button onClick={() => onEdit(p)} variant="outline" size="sm"
                            className="h-7 px-2 text-xs border-gray-300 text-gray-600 hover:bg-gray-50">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Group total footer */}
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-500">
                  {parcels.length} parcel{parcels.length !== 1 ? "s" : ""} ·{" "}
                  {parcels.filter(p => p.pod).length} POD ·{" "}
                  {someChecked ? `${selectedParcels.length} selected` : "none selected"}
                </td>
                <td className="px-4 py-2 text-sm font-bold text-[#ea690c] whitespace-nowrap">{formatCurrency(totalAmount)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export const TrackParcelsPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartnerParcelStatus | "">("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [viewParcel, setViewParcel] = useState<PartnerParcel | null>(null);
  const [editParcel, setEditParcel] = useState<PartnerParcel | null>(null);
  const [parcels, setParcels] = useState<PartnerParcel[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<PartnerParcelStatus, number>>({
    pending: 0, received: 0, delivered: 0, collected: 0, failed: 0, reversed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const senderName = getVendorSessionProfile().name;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await vendorService.getDashboard({
      search: debouncedSearch || undefined,
      status: statusFilter ? mapStatusToApi(statusFilter) : undefined,
    });

    if (!result.success || !result.data) {
      setError(result.message);
      setParcels([]);
      setLoading(false);
      return;
    }

    const mapped: PartnerParcel[] = [];
    (result.data.stations || []).forEach((group) => {
      (group.parcels || []).forEach((item) => {
        mapped.push(mapVendorItemToPartner(item, group.officeName, group.officeId));
      });
    });
    setParcels(mapped);

    const counts: Record<PartnerParcelStatus, number> = {
      pending: 0, received: 0, delivered: 0, collected: 0, failed: 0, reversed: 0,
    };
    Object.entries(result.data.statusSummary || {}).forEach(([key, value]) => {
      const localStatus = mapApiStatus(key as Parameters<typeof mapApiStatus>[0]);
      counts[localStatus] = (counts[localStatus] || 0) + Number(value || 0);
    });
    setStatusCounts(counts);
    setLoading(false);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const grouped = useMemo(() => {
    const map = new Map<string, PartnerParcel[]>();
    parcels.forEach(p => {
      if (!map.has(p.station)) map.set(p.station, []);
      map.get(p.station)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [parcels]);

  const toggleOne = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[], check: boolean) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => check ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const allIds = parcels.map(p => p.id);
  const allChecked = allIds.length > 0 && allIds.every(id => checkedIds.has(id));
  const selectedParcels = parcels.filter(p => checkedIds.has(p.id));

  const printRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-5 pb-10">

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by tracking ID, name or phone..."
            className="pl-9 border border-[#d1d1d1]" />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PartnerParcelStatus | "")}
          className="px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
          <option value="">All Statuses</option>
          {(Object.keys(statusConfig) as PartnerParcelStatus[]).map(s => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {(Object.entries(statusConfig) as [PartnerParcelStatus, typeof statusConfig[PartnerParcelStatus]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(prev => prev === key ? "" : key)}
            className={`${cfg.color} rounded-xl px-3 py-2.5 text-center border transition-all ${
              statusFilter === key ? "border-black/20 scale-95 shadow-inner" : "border-black/5 hover:scale-[0.97]"
            }`}
          >
            <p className="text-2xl font-bold">{statusCounts[key] ?? 0}</p>
            <p className="text-xs font-semibold mt-0.5">{cfg.label}</p>
          </button>
        ))}
      </div>

      {checkedIds.size > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-[#ea690c] rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#ea690c]" />
            <span className="text-sm font-semibold text-[#ea690c]">
              {checkedIds.size} parcel{checkedIds.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const byStation = new Map<string, PartnerParcel[]>();
                selectedParcels.forEach(p => {
                  if (!byStation.has(p.station)) byStation.set(p.station, []);
                  byStation.get(p.station)!.push(p);
                });
                byStation.forEach((ps, station) => printManifest(station, ps, senderName));
              }}
              className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#d45e0a] h-8 text-xs px-4"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Selected Manifest{selectedParcels.some((_, i, arr) => arr.map(p => p.station).filter((v, j) => arr.map(p => p.station).indexOf(v) === j).length > 1) ? "s" : ""}
            </Button>
            <Button onClick={() => setCheckedIds(new Set())} variant="outline"
              className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50 h-8 text-xs px-3">
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={allChecked} onChange={e => toggleAll(allIds, e.target.checked)}
            className="w-4 h-4 accent-[#ea690c]" />
          <span className="text-xs font-semibold text-gray-500">Select all {parcels.length} parcels</span>
        </label>
        <p className="text-xs text-gray-400">
          {grouped.length} station{grouped.length !== 1 ? "s" : ""} · {parcels.length} parcel{parcels.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <Card className="border border-[#d1d1d1] bg-white shadow-sm">
          <CardContent className="py-14 text-center">
            <div className="w-8 h-8 border-2 border-[#ea690c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading parcels...</p>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border border-[#d1d1d1] bg-white shadow-sm">
          <CardContent className="py-14 text-center">
            <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No parcels found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" ref={printRef}>
          {grouped.map(([station, stationParcels]) => (
            <StationGroup
              key={station}
              stationName={station}
              parcels={stationParcels}
              checkedIds={checkedIds}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              onView={setViewParcel}
              onEdit={setEditParcel}
              senderName={senderName}
            />
          ))}
        </div>
      )}

      {viewParcel && (
        <ParcelDetailModal
          parcel={viewParcel}
          onClose={() => setViewParcel(null)}
          onEdit={(p) => { setViewParcel(null); setEditParcel(p); }}
        />
      )}
      {editParcel && (
        <EditParcelModal
          parcel={editParcel}
          onClose={() => setEditParcel(null)}
          onSaved={() => { setEditParcel(null); loadDashboard(); }}
        />
      )}
    </div>
  );
};
