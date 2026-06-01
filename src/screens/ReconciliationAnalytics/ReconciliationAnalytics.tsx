import { useState, useEffect, useMemo } from "react";
import {
  Loader,
  PackageIcon,
  TrendingUp,
  Users,
  DollarSign,
  XCircle,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock,
  ChevronRightIcon as ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { RiderDetailData, RiderParcel } from "./RiderDetailModal";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { Card, CardContent } from "../../components/ui/card";
import { formatCurrency } from "../../utils/dataHelpers";
import frontdeskService from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";

interface DaySummary {
  day: number;
  label: string;
  delivered: number;
  failed: number;
  pending: number;
  amount: number;
  deliveryCost: number;
  inboundCost: number;
  dayOfWeek: number; // 0=Sun, 6=Sat
}

interface RiderStat {
  riderId: string;
  riderName: string;
  delivered: number;
  failed: number;
  totalAmount: number;
  deliveryCost: number;
  inboundCost: number;
  activeDays: Set<number>;
  parcels: RiderParcel[];
}

interface PaymentMethodCount {
  method: string;
  count: number;
}

interface ZoneStat {
  zone: string;
  count: number;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Extract a short zone label from a full address string */
function extractZone(address: string): string {
  if (!address) return "Unknown";
  // Take the first meaningful comma-separated segment, trimmed, max 25 chars
  const parts = address.split(",");
  const zone = parts[0].trim();
  return zone.length > 25 ? zone.substring(0, 25) + "…" : zone;
}

export const ReconciliationAnalytics = (): JSX.Element => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [riderStats, setRiderStats] = useState<RiderStat[]>([]);
  const [paymentCounts, setPaymentCounts] = useState<PaymentMethodCount[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStat[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const navigate = useNavigate();

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const navigateMonth = (direction: -1 | 1) => {
    setSelectedMonth((prev) => {
      const candidate = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      const today = new Date();
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return candidate > currentMonthStart ? currentMonthStart : candidate;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const datesToFetch: Date[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          date.setHours(0, 0, 0, 0);
          if (date <= today) datesToFetch.push(date);
        }

        const results = await Promise.all(
          datesToFetch.map((date) =>
            frontdeskService.getReconciliationsByDate(date.getTime()).then((res) => ({
              date,
              assignments:
                res.success && res.data
                  ? Array.isArray(res.data)
                    ? res.data
                    : res.data.content || []
                  : [],
            }))
          )
        );

        const summaries: DaySummary[] = [];
        const riderMap = new Map<string, RiderStat>();
        const paymentMap = new Map<string, number>();
        const zoneMap = new Map<string, number>();
        let pendingTotal = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          date.setHours(0, 0, 0, 0);
          const result = results.find((r) => r.date.getTime() === date.getTime());
          const assignments = result?.assignments || [];

          let delivered = 0, failed = 0, pending = 0,
            amount = 0, deliveryCost = 0, inboundCost = 0;

          assignments.forEach((assignment: any) => {
            const riderId = assignment.riderInfo?.riderId || assignment.riderId || "unknown";
            const riderName = assignment.riderInfo?.riderName || assignment.riderName || "Unknown";

            if (!riderMap.has(riderId)) {
              riderMap.set(riderId, {
                riderId,
                riderName,
                delivered: 0,
                failed: 0,
                totalAmount: 0,
                deliveryCost: 0,
                inboundCost: 0,
                activeDays: new Set(),
                parcels: [],
              });
            }
            const rider = riderMap.get(riderId)!;

            (assignment.parcels || []).forEach((parcel: any) => {
              const isDelivered = parcel.delivered && !parcel.cancelled;
              const isReturned = !!parcel.returned;

              if (isDelivered) {
                delivered++;
                amount += parcel.parcelAmount || 0;
                deliveryCost += parcel.deliveryCost || 0;
                inboundCost += parcel.inboundCost || 0;
                rider.delivered++;
                rider.totalAmount += parcel.parcelAmount || 0;
                rider.deliveryCost += parcel.deliveryCost || 0;
                rider.inboundCost += parcel.inboundCost || 0;
                rider.activeDays.add(d);

                const method = (parcel.paymentMethod || "N/A").toLowerCase();
                paymentMap.set(method, (paymentMap.get(method) || 0) + 1);

                if (parcel.receiverAddress) {
                  const zone = extractZone(parcel.receiverAddress);
                  zoneMap.set(zone, (zoneMap.get(zone) || 0) + 1);
                }
              } else if (isReturned) {
                failed++;
                rider.failed++;
                rider.activeDays.add(d);
              } else if (!parcel.cancelled) {
                pending++;
                pendingTotal++;
              }

              if (isDelivered || isReturned) {
                rider.parcels.push({
                  parcelId: parcel.parcelId,
                  parcelDescription: parcel.parcelDescription,
                  receiverName: parcel.receiverName,
                  receiverPhoneNumber: parcel.receiverPhoneNumber,
                  receiverAddress: parcel.receiverAddress,
                  parcelAmount: parcel.parcelAmount || 0,
                  deliveryCost: parcel.deliveryCost || 0,
                  inboundCost: parcel.inboundCost || 0,
                  paymentMethod: parcel.paymentMethod,
                  delivered: isDelivered,
                  returned: isReturned,
                  day: d,
                  dayOfWeek: date.getDay(),
                });
              }
            });
          });

          summaries.push({
            day: d,
            label: `${d}`,
            delivered,
            failed,
            pending,
            amount,
            deliveryCost,
            inboundCost,
            dayOfWeek: date.getDay(),
          });
        }

        setDaySummaries(summaries);
        setTotalPending(pendingTotal);
        setRiderStats(
          Array.from(riderMap.values()).sort((a, b) => b.delivered - a.delivered)
        );
        setPaymentCounts(
          Array.from(paymentMap.entries()).map(([method, count]) => ({ method, count }))
        );
        // Top 10 zones by delivery count
        setZoneStats(
          Array.from(zoneMap.entries())
            .map(([zone, count]) => ({ zone, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      } catch (err) {
        console.error(err);
        showToast("Failed to load analytics data.", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth.getFullYear(), selectedMonth.getMonth()]);

  const kpis = useMemo(() => {
    const totalDelivered = daySummaries.reduce((s, d) => s + d.delivered, 0);
    const totalFailed = daySummaries.reduce((s, d) => s + d.failed, 0);
    const totalAmount = daySummaries.reduce((s, d) => s + d.amount, 0);
    const totalDeliveryCost = daySummaries.reduce((s, d) => s + d.deliveryCost, 0);
    const totalInboundCost = daySummaries.reduce((s, d) => s + d.inboundCost, 0);
    const successRate =
      totalDelivered + totalFailed > 0
        ? ((totalDelivered / (totalDelivered + totalFailed)) * 100).toFixed(1)
        : "0.0";
    return { totalDelivered, totalFailed, totalAmount, totalDeliveryCost, totalInboundCost, successRate };
  }, [daySummaries]);

  // Day-of-week aggregation
  const dowData = useMemo(() => {
    const buckets = DOW_LABELS.map((label) => ({ label, delivered: 0, failed: 0 }));
    daySummaries.forEach((d) => {
      buckets[d.dayOfWeek].delivered += d.delivered;
      buckets[d.dayOfWeek].failed += d.failed;
    });
    return buckets;
  }, [daySummaries]);

  // Daily fee stacked data
  const chartData = daySummaries.filter((d) => d.delivered > 0 || d.failed > 0);

  const COLORS = ["#ea690c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

  const pieDeliveryData = [
    { id: 0, value: kpis.totalDelivered, label: "Delivered" },
    { id: 1, value: kpis.totalFailed, label: "Failed" },
    ...(totalPending > 0 ? [{ id: 2, value: totalPending, label: "Pending" }] : []),
  ];
  const pieDeliveryColors = ["#10b981", "#ef4444", "#f59e0b"];

  const piePaymentData = paymentCounts.map((p, i) => ({
    id: i,
    value: p.count,
    label: p.method.charAt(0).toUpperCase() + p.method.slice(1),
  }));

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-1">
              Reconciliation Analytics
            </h1>
            <p className="text-sm text-gray-500">
              Monthly delivery performance and financial overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-neutral-800 min-w-[140px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader className="w-10 h-10 text-[#ea690c] animate-spin" />
            <p className="text-neutral-600 font-medium">
              Loading analytics for {monthLabel}...
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: "Delivered", value: kpis.totalDelivered, icon: PackageIcon, color: "text-green-600", bg: "bg-green-50" },
                { label: "Failed", value: kpis.totalFailed, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
                { label: "Pending", value: totalPending, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
                { label: "Success Rate", value: `${kpis.successRate}%`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Total Amount", value: formatCurrency(kpis.totalAmount), icon: DollarSign, color: "text-[#ea690c]", bg: "bg-orange-50" },
                { label: "Delivery Fees", value: formatCurrency(kpis.totalDeliveryCost), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Active Riders", value: riderStats.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {chartData.length === 0 ? (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="py-16 flex flex-col items-center gap-3">
                  <PackageIcon className="w-12 h-12 text-gray-300" />
                  <p className="text-neutral-600 font-medium">
                    No reconciliation data for {monthLabel}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Bar Chart — Daily Deliveries vs Failed */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base font-bold text-neutral-800 mb-4">
                      Daily Deliveries vs Failed
                    </h2>
                    <BarChart
                      dataset={chartData}
                      xAxis={[{ scaleType: "band", dataKey: "label", label: "Day of Month" }]}
                      series={[
                        { dataKey: "delivered", label: "Delivered", color: "#10b981", valueFormatter: (v) => `${v} parcels` },
                        { dataKey: "failed", label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v} parcels` },
                      ]}
                      height={300}
                      margin={{ top: 10, bottom: 40, left: 40, right: 10 }}
                    />
                  </CardContent>
                </Card>

                {/* Line Chart — Daily Revenue */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base font-bold text-neutral-800 mb-4">
                      Daily Revenue Collected
                    </h2>
                    <LineChart
                      dataset={chartData}
                      xAxis={[{ scaleType: "band", dataKey: "label", label: "Day of Month" }]}
                      series={[
                        { dataKey: "amount", label: "Amount Collected", color: "#ea690c", valueFormatter: (v) => formatCurrency(v ?? 0) },
                        { dataKey: "deliveryCost", label: "Delivery Fees", color: "#3b82f6", valueFormatter: (v) => formatCurrency(v ?? 0) },
                        { dataKey: "inboundCost", label: "Inbound Fees", color: "#8b5cf6", valueFormatter: (v) => formatCurrency(v ?? 0) },
                      ]}
                      height={300}
                      margin={{ top: 10, bottom: 40, left: 70, right: 10 }}
                    />
                  </CardContent>
                </Card>

                {/* Stacked Bar — Daily Fee Breakdown */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base font-bold text-neutral-800 mb-1">
                      Daily Fee Breakdown
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">
                      Inbound vs delivery fees collected per day
                    </p>
                    <BarChart
                      dataset={chartData}
                      xAxis={[{ scaleType: "band", dataKey: "label", label: "Day of Month" }]}
                      series={[
                        { dataKey: "inboundCost", label: "Inbound Fees", color: "#8b5cf6", stack: "fees", valueFormatter: (v) => formatCurrency(v ?? 0) },
                        { dataKey: "deliveryCost", label: "Delivery Fees", color: "#3b82f6", stack: "fees", valueFormatter: (v) => formatCurrency(v ?? 0) },
                      ]}
                      height={280}
                      margin={{ top: 10, bottom: 40, left: 70, right: 10 }}
                    />
                  </CardContent>
                </Card>

                {/* Day of Week + Pie Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Best day of week */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base font-bold text-neutral-800 mb-1">
                        Deliveries by Day of Week
                      </h2>
                      <p className="text-xs text-gray-500 mb-4">
                        Which days are busiest this month
                      </p>
                      <BarChart
                        dataset={dowData}
                        xAxis={[{ scaleType: "band", dataKey: "label" }]}
                        series={[
                          { dataKey: "delivered", label: "Delivered", color: "#10b981", valueFormatter: (v) => `${v} parcels` },
                          { dataKey: "failed", label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v} parcels` },
                        ]}
                        height={260}
                        margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                      />
                    </CardContent>
                  </Card>

                  {/* Delivery outcome donut — now includes pending */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base font-bold text-neutral-800 mb-4">
                        Delivery Outcome
                      </h2>
                      {kpis.totalDelivered + kpis.totalFailed + totalPending > 0 ? (
                        <>
                          <PieChart
                            series={[{
                              data: pieDeliveryData,
                              innerRadius: 55,
                              outerRadius: 90,
                              paddingAngle: 3,
                              cornerRadius: 4,
                            }]}
                            colors={pieDeliveryColors}
                            height={220}
                          />
                          <div className="flex flex-wrap justify-center gap-4 mt-2">
                            {pieDeliveryData.map((item, i) => (
                              <div key={item.label} className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: pieDeliveryColors[i] }} />
                                <span className="text-gray-600">{item.label}</span>
                                <span className="font-semibold text-neutral-800">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Payment method + Top zones row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Payment method donut */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base font-bold text-neutral-800 mb-4">
                        Payment Methods
                      </h2>
                      {piePaymentData.length > 0 ? (
                        <>
                          <PieChart
                            series={[{
                              data: piePaymentData,
                              innerRadius: 55,
                              outerRadius: 90,
                              paddingAngle: 3,
                              cornerRadius: 4,
                            }]}
                            colors={COLORS}
                            height={220}
                          />
                          <div className="flex flex-wrap justify-center gap-4 mt-2">
                            {piePaymentData.map((item, i) => (
                              <div key={item.label} className="flex items-center gap-2 text-sm">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-gray-600">{item.label}</span>
                                <span className="font-semibold text-neutral-800">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No data</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top delivery zones */}
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base font-bold text-neutral-800 mb-1">
                        Top Delivery Zones
                      </h2>
                      <p className="text-xs text-gray-500 mb-4">
                        Most frequent delivery areas this month
                      </p>
                      {zoneStats.length > 0 ? (
                        <div className="space-y-2">
                          {zoneStats.map((zone, i) => {
                            const maxCount = zoneStats[0].count;
                            const pct = Math.round((zone.count / maxCount) * 100);
                            return (
                              <div key={zone.zone} className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-500 w-5 text-right shrink-0">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-medium text-neutral-700 truncate">{zone.zone}</span>
                                    <span className="text-xs font-bold text-[#ea690c] ml-2 shrink-0">{zone.count}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className="bg-[#ea690c] h-1.5 rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">No address data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Rider Leaderboard — now includes active days */}
                {riderStats.length > 0 && (
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <h2 className="text-base font-bold text-neutral-800 mb-4">
                        Rider Performance — {monthLabel}
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Rank", "Rider", "Active Days", "Delivered", "Failed", "Success Rate", "Amount", "Delivery Fees", "Inbound Fees", ""].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b-2 border-gray-200">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {riderStats.map((rider, index) => {
                              const total = rider.delivered + rider.failed;
                              const rate = total > 0 ? ((rider.delivered / total) * 100).toFixed(1) : "0.0";
                              return (
                                <tr
                                  key={rider.riderId}
                                  onClick={() => navigate("/rider-detail", { state: {
                                    riderId: rider.riderId,
                                    riderName: rider.riderName,
                                    delivered: rider.delivered,
                                    failed: rider.failed,
                                    totalAmount: rider.totalAmount,
                                    deliveryCost: rider.deliveryCost,
                                    inboundCost: rider.inboundCost,
                                    activeDays: rider.activeDays,
                                    parcels: rider.parcels,
                                    daysInMonth: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate(),
                                    monthLabel,
                                    year: selectedMonth.getFullYear(),
                                    month: selectedMonth.getMonth(),
                                  } as RiderDetailData })}
                                  className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors">
                                  <td className="px-4 py-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                      index === 0 ? "bg-yellow-100 text-yellow-700"
                                      : index === 1 ? "bg-gray-100 text-gray-700"
                                      : index === 2 ? "bg-orange-100 text-orange-700"
                                      : "bg-blue-50 text-blue-700"
                                    }`}>
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-neutral-800">{rider.riderName}</td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600">
                                      {rider.activeDays.size}
                                      <span className="text-xs font-normal text-gray-400">days</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{rider.delivered}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-red-500">{rider.failed}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                                      </div>
                                      <span className="text-xs font-medium text-neutral-700">{rate}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-[#ea690c]">{formatCurrency(rider.totalAmount)}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{formatCurrency(rider.deliveryCost)}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{formatCurrency(rider.inboundCost)}</td>
                                  <td className="px-4 py-3">
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
};
