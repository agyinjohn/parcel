import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Filter, ChevronDown, ChevronUp, Eye, History, AlertCircle, Pencil, Calendar } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { statusConfig, formatCurrency, type PartnerParcel, type PartnerParcelStatus } from "./partnerData";
import { ParcelDetailModal } from "./ParcelDetailModal";
import { EditParcelModal } from "./EditParcelModal";
import { isPartnerParcelEditable } from "./partnerFormUtils";
import { useVendorStations } from "./useVendorStations";
import vendorService, { mapApiParcelToPartner, mapStatusToApi } from "../../services/vendorService";

export const HistoryPage = () => {
  const { stations } = useVendorStations();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartnerParcelStatus | "">("");
  const [stationFilter, setStationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewParcel, setViewParcel] = useState<PartnerParcel | null>(null);
  const [editParcel, setEditParcel] = useState<PartnerParcel | null>(null);
  const [parcels, setParcels] = useState<PartnerParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadParcels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await vendorService.listParcels({
      search: debouncedSearch || undefined,
      status: statusFilter ? mapStatusToApi(statusFilter) : undefined,
      toOfficeId: stationFilter || undefined,
      size: 500,
    });

    if (!result.success) {
      setError(result.message);
      setParcels([]);
      setLoading(false);
      return;
    }

    const mapped = (result.data?.content || []).map(mapApiParcelToPartner);
    setParcels(mapped.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    setLoading(false);
  }, [debouncedSearch, statusFilter, stationFilter]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return parcels;

    return parcels.filter(p => {
      const submitted = new Date(p.submittedAt);
      if (Number.isNaN(submitted.getTime())) return false;

      const day = new Date(submitted.getFullYear(), submitted.getMonth(), submitted.getDate());

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (day < from) return false;
      }

      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (day > to) return false;
      }

      return true;
    });
  }, [parcels, dateFrom, dateTo]);

  const today = new Date().toISOString().split("T")[0];

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setStationFilter("");
    setDateFrom("");
    setDateTo("");
    setShowFilters(false);
  };
  const hasFilters = search || statusFilter || stationFilter || dateFrom || dateTo;

  return (
    <div className="space-y-4 pb-10">

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, name or phone..."
            className="pl-9 border border-[#d1d1d1]" />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || hasFilters ? "bg-[#ea690c] text-white border-[#ea690c]" : "border-[#d1d1d1] text-gray-600 hover:bg-gray-50"}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasFilters && <span className="bg-white text-[#ea690c] text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{[statusFilter, stationFilter, dateFrom || dateTo].filter(Boolean).length}</span>}
          {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
            Clear all
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {showFilters && (
        <Card className="border border-[#d1d1d1] bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">Status</Label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PartnerParcelStatus | "")}
                  className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                  <option value="">All Statuses</option>
                  {(Object.keys(statusConfig) as PartnerParcelStatus[]).map(s => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">Station</Label>
                <select value={stationFilter} onChange={e => setStationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                  <option value="">All Stations</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">From date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="pl-9 border border-[#d1d1d1]"
                    max={dateTo || today}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">To date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="pl-9 border border-[#d1d1d1]"
                    min={dateFrom}
                    max={today}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-500 font-medium">
        {filtered.length} parcel{filtered.length !== 1 ? "s" : ""} found
        {hasFilters && " (filtered)"}
      </p>

      <Card className="border border-[#d1d1d1] bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Tracking ID", "Receiver", "Station", "Description", "Total", "POD", "Status", "Submitted", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <div className="w-8 h-8 border-2 border-[#ea690c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Loading history...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No parcels found</p>
                      {hasFilters && <button onClick={clearFilters} className="mt-2 text-xs text-[#ea690c] hover:underline">Clear filters</button>}
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const s = statusConfig[p.status];
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-[#ea690c] bg-orange-50 px-2 py-0.5 rounded">{p.trackingId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-neutral-800">{p.receiverName}</p>
                          <p className="text-xs text-gray-500">{p.receiverPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.station}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{p.description || "—"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-800 whitespace-nowrap">{formatCurrency(p.itemCost + p.deliveryFee)}</td>
                        <td className="px-4 py-3">
                          <Badge className={p.pod ? "bg-orange-100 text-orange-700 text-xs font-semibold" : "bg-gray-100 text-gray-500 text-xs"}>
                            {p.pod ? "POD" : "No"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${s.color} flex items-center gap-1 w-fit text-xs font-semibold`}>
                            {s.icon}{s.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(p.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button onClick={() => setViewParcel(p)} variant="outline" size="sm"
                              className="h-7 w-7 p-0 border-[#ea690c] text-[#ea690c] hover:bg-orange-50">
                              <Eye className="w-3 h-3" />
                            </Button>
                            {isPartnerParcelEditable(p.status) && (
                              <Button onClick={() => setEditParcel(p)} variant="outline" size="sm"
                                className="h-7 w-7 p-0 border-gray-300 text-gray-600 hover:bg-gray-50">
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
          onSaved={() => { setEditParcel(null); loadParcels(); }}
        />
      )}
    </div>
  );
};
