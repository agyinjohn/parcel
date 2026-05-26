import { useState, useMemo, useRef } from "react";
import {
  X, MapPin, Phone, Star, Package, CheckCircle2, XCircle,
  DollarSign, Calendar, ChevronRight, ChevronDown, Bike,
  Clock, AlertTriangle, TrendingUp, Navigation, Flame, Zap, Filter,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/dataHelpers";
import dummyDataGenerator from "../../../services/dummyDataGenerator";
import type { RiderFullProfile, RiderDeliveryRecord, RiderHistoryGroup } from "../../../services/dummyDataGenerator";
import { BarChart } from "@mui/x-charts/BarChart";

interface Props {
  riderId: string;
  riderName: string;
  onClose: () => void;
}

type HistoryPeriod = "day" | "week" | "month";
type HeatmapMode = "count" | "revenue";

const HEATMAP_HOURS = Array.from({ length: 14 }, (_, i) => 6 + i); // 6am–7pm
const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Interpolate between two hex colours at ratio t (0–1) */
function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl2})`;
}

/** Map intensity 0–1 through a 4-stop gradient */
function heatColor(intensity: number): string {
  if (intensity === 0) return "#f3f4f6"; // gray-100
  if (intensity < 0.25) return lerpColor("#fff7ed", "#fed7aa", intensity / 0.25); // orange-50 → orange-200
  if (intensity < 0.6) return lerpColor("#fed7aa", "#f97316", (intensity - 0.25) / 0.35); // orange-200 → orange-500
  return lerpColor("#f97316", "#c2410c", (intensity - 0.6) / 0.4); // orange-500 → orange-800
}

function DeliveryRecordRow({ record }: { record: RiderDeliveryRecord }) {
  const [open, setOpen] = useState(false);
  const isFailed = record.status === "delivery-failed";
  return (
    <div className={`border rounded-lg overflow-hidden ${isFailed ? "border-red-200 bg-red-50/30" : "border-gray-100 bg-white"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        {isFailed
          ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
        <span className="text-xs font-mono text-gray-400 w-36 flex-shrink-0">{record.parcelId}</span>
        <span className="text-sm font-medium text-neutral-800 flex-1 truncate">{record.recipientName}</span>
        <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{record.timeSlot}</span>
        <span className={`text-sm font-bold w-24 text-right flex-shrink-0 ${isFailed ? "text-red-500" : "text-[#ea690c]"}`}>
          {isFailed ? "—" : formatCurrency(record.amountCollected)}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div><span className="text-gray-400 block">Item</span><span className="font-medium text-neutral-700">{record.itemDescription}</span></div>
          <div><span className="text-gray-400 block">Item Value</span><span className="font-medium text-neutral-700">{formatCurrency(record.itemValue)}</span></div>
          <div><span className="text-gray-400 block">Delivery Fee</span><span className="font-medium text-neutral-700">{formatCurrency(record.deliveryFee)}</span></div>
          <div><span className="text-gray-400 block">Phone</span><span className="font-medium text-neutral-700">{record.recipientPhone}</span></div>
          <div><span className="text-gray-400 block">Address</span><span className="font-medium text-neutral-700">{record.deliveryAddress}</span></div>
          <div><span className="text-gray-400 block">Payment</span><span className="font-medium text-neutral-700">{record.paymentMethod}</span></div>
          {isFailed && (
            <div className="col-span-full">
              <span className="text-gray-400 block">Failure Reason</span>
              <span className="font-semibold text-red-600">{record.failureReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

function DrillDownView({
  group,
  onBack,
}: {
  group: RiderHistoryGroup;
  onBack: () => void;
}) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "delivered" | "failed">("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? group.records
        : group.records.filter((r) => r.status === (filter === "failed" ? "delivery-failed" : "delivered")),
    [group.records, filter]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRecords = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const failed = group.records.filter((r) => r.status === "delivery-failed");
  const successRate = group.records.length > 0
    ? Math.round((group.deliveries / group.records.length) * 100)
    : 0;

  // Reset page when filter changes
  const handleFilter = (f: typeof filter) => { setFilter(f); setPage(0); };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#ea690c] transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div>
          <span className="text-sm font-bold text-neutral-800">{group.label}</span>
          <span className="text-xs text-gray-400 ml-2">{group.dateRange}</span>
        </div>
      </div>

      {/* Mini KPI strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: group.records.length, color: "text-neutral-700" },
          { label: "Delivered", value: group.deliveries, color: "text-green-600" },
          { label: "Failed", value: group.failed, color: "text-red-500" },
          { label: "Revenue", value: formatCurrency(group.revenue), color: "text-[#ea690c]" },
        ].map((k) => (
          <div key={k.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{k.label}</p>
            <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Success rate bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24 flex-shrink-0">Success rate</span>
        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{
              width: `${successRate}%`,
              background: successRate >= 90 ? "#16a34a" : successRate >= 75 ? "#ea690c" : "#ef4444",
            }}
          />
        </div>
        <span className="text-xs font-bold text-neutral-700 w-10 text-right">{successRate}%</span>
      </div>

      {/* Failed alert */}
      {failed.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 font-medium flex-1">
            {failed.length} failed {failed.length === 1 ? "delivery" : "deliveries"} this period
          </span>
          <button
            onClick={() => handleFilter(filter === "failed" ? "all" : "failed")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              filter === "failed"
                ? "bg-red-500 text-white"
                : "bg-red-100 text-red-600 hover:bg-red-200"
            }`}
          >
            {filter === "failed" ? "Show all" : "View failed"}
          </button>
        </div>
      )}

      {/* Filter tabs + record count */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "delivered", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                filter === f ? "bg-white text-[#ea690c] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? `All (${group.records.length})` : f === "delivered" ? `Delivered (${group.deliveries})` : `Failed (${group.failed})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
        </span>
      </div>

      {/* Records list */}
      <div className="space-y-1.5">
        {pageRecords.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">No records</div>
        ) : (
          pageRecords.map((r) => <DeliveryRecordRow key={r.parcelId} record={r} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#ea690c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-6 h-6 rounded-md text-xs font-bold transition-colors ${
                  i === page ? "bg-[#ea690c] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#ea690c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export function RiderDetailModal({ riderId, riderName, onClose }: Props) {
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("week");
  const [activeSection, setActiveSection] = useState<"history" | "heatmap" | "location">("history");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("count");
  const [drillGroup, setDrillGroup] = useState<RiderHistoryGroup | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const profile: RiderFullProfile = useMemo(
    () => dummyDataGenerator.generateRiderFullProfile(riderId, riderName),
    [riderId, riderName]
  );

  const allGroups = historyPeriod === "day"
    ? profile.historyByDay
    : historyPeriod === "week"
    ? profile.historyByWeek
    : profile.historyByMonth;

  // Filter groups by date range
  const groups = useMemo(() => {
    if (!dateFrom && !dateTo) return allGroups;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return allGroups.map((g) => {
      const filteredRecords = g.records.filter((r) => {
        const d = new Date(r.date);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      return {
        ...g,
        records: filteredRecords,
        deliveries: filteredRecords.filter((r) => r.status === "delivered").length,
        failed: filteredRecords.filter((r) => r.status === "delivery-failed").length,
        revenue: filteredRecords.reduce((s, r) => s + r.amountCollected, 0),
      };
    }).filter((g) => g.records.length > 0);
  }, [allGroups, dateFrom, dateTo]);

  const maxHeatCount = Math.max(...profile.heatmapData.map((d) => d.count), 1);
  const maxHeatRevenue = Math.max(...profile.heatmapData.map((d) => d.revenue), 1);

  // Derived heatmap stats
  const heatStats = useMemo(() => {
    const peakCell = profile.heatmapData.reduce((best, c) =>
      (heatmapMode === "count" ? c.count : c.revenue) > (heatmapMode === "count" ? best.count : best.revenue) ? c : best
    );
    const dayTotals = HEATMAP_DAYS.map((day) => ({
      day,
      total: profile.heatmapData.filter((d) => d.day === day).reduce((s, d) => s + (heatmapMode === "count" ? d.count : d.revenue), 0),
    })).sort((a, b) => b.total - a.total);
    const hourTotals = HEATMAP_HOURS.map((hour) => ({
      hour,
      total: profile.heatmapData.filter((d) => d.hour === hour).reduce((s, d) => s + (heatmapMode === "count" ? d.count : d.revenue), 0),
    })).sort((a, b) => b.total - a.total);
    const activeHours = profile.heatmapData.filter((d) => d.count > 0).length;
    return { peakCell, dayTotals, hourTotals, activeHours };
  }, [profile.heatmapData, heatmapMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center shadow-sm">
              <Bike className="w-7 h-7 text-[#ea690c]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-800">{profile.riderName}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />{profile.phone}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{profile.stationName}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />Since {new Date(profile.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-6 border-b border-gray-100">
          {[
            { label: "Total Deliveries", value: profile.totalDeliveries.toLocaleString(), icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Failed", value: profile.totalFailed.toLocaleString(), icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
            { label: "Total Revenue", value: formatCurrency(profile.totalRevenue), icon: DollarSign, color: "text-[#ea690c]", bg: "bg-orange-50" },
            { label: "Outstanding", value: formatCurrency(profile.totalOutstanding), icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Rating", value: `${profile.rating} ★`, icon: Star, color: "text-yellow-600", bg: "bg-yellow-50" },
          ].map((k) => (
            <Card key={k.label} className="border border-gray-100 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">{k.label}</p>
                  <p className={`text-sm font-bold ${k.color} truncate`}>{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
          {(["history", "heatmap", "location"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg capitalize transition-colors ${
                activeSection === s
                  ? "bg-white text-[#ea690c] border-b-2 border-[#ea690c]"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s === "history" ? "Delivery History" : s === "heatmap" ? "Activity Heatmap" : "Live Location"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">

          {/* HISTORY SECTION */}
          {activeSection === "history" && (
            <>
              {drillGroup ? (
                <DrillDownView group={drillGroup} onBack={() => setDrillGroup(null)} />
              ) : (
                <>
                  {/* Period toggle + date filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-neutral-800 mr-auto">Delivery History</h3>
                    {/* Date range inputs */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setDrillGroup(null); }}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c] text-gray-700"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setDrillGroup(null); }}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c] text-gray-700"
                      />
                      {(dateFrom || dateTo) && (
                        <button
                          onClick={() => { setDateFrom(""); setDateTo(""); setDrillGroup(null); }}
                          className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-1"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                      {(["day", "week", "month"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => { setHistoryPeriod(p); setDrillGroup(null); }}
                          className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                            historyPeriod === p ? "bg-white text-[#ea690c] shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Active filter badge */}
                  {(dateFrom || dateTo) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                      <Filter className="w-3 h-3 text-[#ea690c]" />
                      <span className="text-xs text-[#ea690c] font-medium">
                        Filtered: {dateFrom || "start"} → {dateTo || "today"}
                        {groups.length === 0 && " · No results"}
                      </span>
                    </div>
                  )}

                  {/* Summary chart — always shows aggregated view, never individual records */}
                  <Card className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 text-xs mb-2">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#3b82f6] rounded-sm inline-block" />Delivered</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444] rounded-sm inline-block" />Failed</span>
                      </div>
                      <BarChart
                        xAxis={[{ data: groups.map((g) => g.label), scaleType: "band", tickLabelStyle: { fontSize: 10 } }]}
                        series={[
                          { data: groups.map((g) => g.deliveries), label: "Delivered", color: "#3b82f6", valueFormatter: (v) => `${v} parcels` },
                          { data: groups.map((g) => g.failed), label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v} parcels` },
                        ]}
                        height={180}
                        margin={{ top: 8, right: 8, bottom: 28, left: 35 }}
                        slotProps={{ legend: { hidden: true } }}
                        sx={{ "& .MuiBarElement-root": { rx: 3 } }}
                        onAxisClick={(_, d) => {
                          if (d?.dataIndex != null) setDrillGroup(groups[d.dataIndex]);
                        }}
                      />
                      <p className="text-[10px] text-gray-400 text-center mt-1">Click a bar to drill into that period</p>
                    </CardContent>
                  </Card>

                  {/* Period summary totals */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Total Deliveries", value: groups.reduce((s, g) => s + g.deliveries, 0), color: "text-blue-600" },
                      { label: "Total Failed", value: groups.reduce((s, g) => s + g.failed, 0), color: "text-red-500" },
                      { label: "Revenue", value: formatCurrency(groups.reduce((s, g) => s + g.revenue, 0)), color: "text-[#ea690c]" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Period list — click to drill in */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Click a period to view individual deliveries</p>
                    {groups.map((g) => {
                      const rate = g.records.length > 0 ? Math.round((g.deliveries / g.records.length) * 100) : 0;
                      return (
                        <button
                          key={g.label}
                          onClick={() => setDrillGroup(g)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-neutral-800">{g.label}</span>
                              <span className="text-xs text-gray-400">{g.dateRange}</span>
                              {g.failed > 0 && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                  {g.failed} failed
                                </span>
                              )}
                            </div>
                            {/* Mini inline bar */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${rate}%`,
                                    background: rate >= 90 ? "#16a34a" : rate >= 75 ? "#ea690c" : "#ef4444",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 w-8 text-right">{rate}%</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-[#ea690c]">{formatCurrency(g.revenue)}</p>
                            <p className="text-xs text-gray-500">{g.deliveries} delivered</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#ea690c] transition-colors flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* HEATMAP SECTION */}
          {activeSection === "heatmap" && (
            <div className="space-y-5">

              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#ea690c]" /> Activity Heatmap
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Delivery frequency by day of week × hour of day</p>
                </div>
                {/* Mode toggle */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
                  {(["count", "revenue"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setHeatmapMode(m)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        heatmapMode === m ? "bg-white text-[#ea690c] shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {m === "count" ? "Deliveries" : "Revenue"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary stat pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Peak slot", value: `${heatStats.peakCell.day} ${heatStats.peakCell.hour}:00`, icon: Zap, color: "text-[#ea690c]" },
                  { label: "Busiest day", value: heatStats.dayTotals[0].day, icon: TrendingUp, color: "text-blue-600" },
                  { label: "Peak hour", value: `${heatStats.hourTotals[0].hour}:00`, icon: Clock, color: "text-purple-600" },
                  { label: "Active slots", value: `${heatStats.activeHours} / ${HEATMAP_DAYS.length * HEATMAP_HOURS.length}`, icon: Flame, color: "text-green-600" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-xs text-gray-500">{s.label}:</span>
                    <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Main heatmap grid */}
              <Card className="border border-gray-100 shadow-sm">
                <CardContent className="p-5 overflow-x-auto">
                  <div className="min-w-[640px]">

                    {/* Hour axis labels */}
                    <div className="flex mb-2" style={{ paddingLeft: 44 }}>
                      {HEATMAP_HOURS.map((h) => (
                        <div key={h} className="flex-1 text-center text-[10px] text-gray-400 font-medium leading-none">
                          {h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                        </div>
                      ))}
                    </div>

                    {/* Grid rows */}
                    {HEATMAP_DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-0 mb-1.5">
                        <span className="text-xs font-semibold text-gray-500 w-11 flex-shrink-0 text-right pr-2">{day}</span>
                        <div className="flex flex-1 gap-1">
                          {HEATMAP_HOURS.map((hour) => {
                            const cell = profile.heatmapData.find((d) => d.day === day && d.hour === hour);
                            const rawVal = heatmapMode === "count" ? (cell?.count ?? 0) : (cell?.revenue ?? 0);
                            const maxVal = heatmapMode === "count" ? maxHeatCount : maxHeatRevenue;
                            const intensity = rawVal / maxVal;
                            const isPeak = heatStats.peakCell.day === day && heatStats.peakCell.hour === hour;
                            const bg = heatColor(intensity);
                            const textColor = intensity > 0.55 ? "#fff" : "#7c2d12";
                            return (
                              <div
                                key={hour}
                                className="group relative flex-1 aspect-square rounded-md cursor-default transition-all duration-150 hover:scale-110 hover:z-10 hover:shadow-md"
                                style={{
                                  backgroundColor: bg,
                                  outline: isPeak ? "2px solid #ea690c" : undefined,
                                  outlineOffset: isPeak ? "1px" : undefined,
                                }}
                              >
                                {/* Count label — only show if fits */}
                                {rawVal > 0 && (
                                  <span
                                    className="absolute inset-0 flex items-center justify-center text-[10px] font-bold select-none"
                                    style={{ color: textColor }}
                                  >
                                    {heatmapMode === "count" ? rawVal : rawVal >= 1000 ? `${(rawVal / 1000).toFixed(1)}k` : rawVal}
                                  </span>
                                )}
                                {/* Hover tooltip */}
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <div className="bg-neutral-900 text-white rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl">
                                    <p className="font-semibold">{day} {hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`}</p>
                                    <p className="text-gray-300">{cell?.count ?? 0} deliveries</p>
                                    <p className="text-orange-300">{formatCurrency(cell?.revenue ?? 0)}</p>
                                    {isPeak && <p className="text-yellow-300 font-bold">★ Peak slot</p>}
                                  </div>
                                  <div className="w-2 h-2 bg-neutral-900 rotate-45 mx-auto -mt-1" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Gradient legend */}
                    <div className="flex items-center gap-3 mt-4 justify-end">
                      <span className="text-[10px] text-gray-400">Low</span>
                      <div
                        className="h-3 w-40 rounded-full"
                        style={{ background: "linear-gradient(to right, #f3f4f6, #fff7ed, #fed7aa, #f97316, #c2410c)" }}
                      />
                      <span className="text-[10px] text-gray-400">High</span>
                      <span className="text-[10px] text-gray-400 ml-2 border border-[#ea690c] rounded px-1.5 py-0.5 text-[#ea690c] font-semibold">★ Peak</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Side panels: Busiest Days + Peak Hours */}
              <div className="grid grid-cols-2 gap-4">

                {/* Busiest Days */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#ea690c]" /> Busiest Days
                    </p>
                    {heatStats.dayTotals.map((d, i) => {
                      const maxTotal = heatStats.dayTotals[0].total;
                      const pct = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
                      return (
                        <div key={d.day} className="flex items-center gap-2 mb-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            i === 0 ? "bg-orange-100 text-orange-700" :
                            i === 1 ? "bg-orange-50 text-orange-500" : "bg-gray-100 text-gray-500"
                          }`}>{i + 1}</div>
                          <span className="text-xs font-medium text-gray-600 w-8">{d.day}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: i === 0 ? "#ea690c" : i === 1 ? "#fb923c" : "#d1d5db" }}
                            />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 w-16 text-right">
                            {heatmapMode === "count" ? d.total : formatCurrency(d.total)}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Peak Hours */}
                <Card className="border border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> Peak Hours
                    </p>
                    {heatStats.hourTotals.slice(0, 6).map((h, i) => {
                      const maxTotal = heatStats.hourTotals[0].total;
                      const pct = maxTotal > 0 ? (h.total / maxTotal) * 100 : 0;
                      const label = h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? "12pm" : `${h.hour - 12}pm`;
                      return (
                        <div key={h.hour} className="flex items-center gap-2 mb-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            i === 0 ? "bg-blue-100 text-blue-700" :
                            i === 1 ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-500"
                          }`}>{i + 1}</div>
                          <span className="text-xs font-medium text-gray-600 w-10">{label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: i === 0 ? "#3b82f6" : i === 1 ? "#60a5fa" : "#d1d5db" }}
                            />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 w-16 text-right">
                            {heatmapMode === "count" ? h.total : formatCurrency(h.total)}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* LOCATION SECTION */}
          {activeSection === "location" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-800">Live Location</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last updated {profile.currentLocation.lastSeen}</p>
              </div>

              {/* Location card */}
              <Card className="border border-gray-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-neutral-800">{profile.currentLocation.address}</span>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Live</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Coordinates: {profile.currentLocation.lat.toFixed(5)}, {profile.currentLocation.lng.toFixed(5)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Last seen: {profile.currentLocation.lastSeen}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map placeholder */}
              <div className="relative w-full h-72 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl overflow-hidden border border-blue-200 flex items-center justify-center">
                {/* Fake map grid */}
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                {/* Fake roads */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-white/60" />
                  <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-white/40" />
                  <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-white/60" />
                  <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-white/40" />
                </div>
                {/* Rider pin */}
                <div className="relative flex flex-col items-center">
                  <div className="w-12 h-12 bg-[#ea690c] rounded-full flex items-center justify-center shadow-lg shadow-orange-400/50 animate-pulse">
                    <Bike className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-2 bg-white rounded-lg px-3 py-1.5 shadow-md text-center">
                    <p className="text-xs font-bold text-neutral-800">{profile.riderName}</p>
                    <p className="text-xs text-gray-500">{profile.currentLocation.address}</p>
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-600 font-medium">
                  Map integration ready — connect Google Maps / Mapbox
                </div>
              </div>

              {/* Status info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Status", value: profile.status === "active" ? "On Duty" : "Off Duty", color: profile.status === "active" ? "text-green-600" : "text-gray-500" },
                  { label: "Last Seen", value: profile.currentLocation.lastSeen, color: "text-blue-600" },
                  { label: "Station", value: profile.stationName, color: "text-[#ea690c]" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
