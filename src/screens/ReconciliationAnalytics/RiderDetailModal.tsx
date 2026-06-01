import { useMemo } from "react";
import { X, PackageIcon, XCircle, TrendingUp, DollarSign, MapPinIcon, Phone } from "lucide-react";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatCurrency, formatPhoneNumber } from "../../utils/dataHelpers";

export interface RiderParcel {
  parcelId: string;
  parcelDescription?: string;
  receiverName?: string;
  receiverPhoneNumber?: string;
  receiverAddress?: string;
  parcelAmount: number;
  deliveryCost: number;
  inboundCost: number;
  paymentMethod?: string | null;
  delivered: boolean;
  returned: boolean;
  day: number; // day of month
  dayOfWeek: number; // 0=Sun
}

export interface RiderDetailData {
  riderId: string;
  riderName: string;
  delivered: number;
  failed: number;
  totalAmount: number;
  deliveryCost: number;
  inboundCost: number;
  activeDays: Set<number>;
  parcels: RiderParcel[];
  daysInMonth: number;
  monthLabel: string;
  year: number;
  month: number; // 0-based
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#ea690c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

function extractZone(address: string): string {
  if (!address) return "Unknown";
  const parts = address.split(",");
  const zone = parts[0].trim();
  return zone.length > 25 ? zone.substring(0, 25) + "…" : zone;
}

interface Props {
  rider: RiderDetailData;
  onClose: () => void;
}

export const RiderDetailModal = ({ rider, onClose }: Props): JSX.Element => {
  const successRate = rider.delivered + rider.failed > 0
    ? ((rider.delivered / (rider.delivered + rider.failed)) * 100).toFixed(1)
    : "0.0";

  const avgPerActiveDay = rider.activeDays.size > 0
    ? (rider.delivered / rider.activeDays.size).toFixed(1)
    : "0.0";

  // Daily bar chart data — only delivered parcels days
  const dailyData = useMemo(() => {
    const map = new Map<number, { label: string; delivered: number; failed: number; amount: number }>();
    rider.parcels.forEach((p) => {
      if (!map.has(p.day)) {
        map.set(p.day, { label: `${p.day}`, delivered: 0, failed: 0, amount: 0 });
      }
      const entry = map.get(p.day)!;
      if (p.delivered) { entry.delivered++; entry.amount += p.parcelAmount; }
      else if (p.returned) entry.failed++;
    });
    return Array.from(map.values()).sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }, [rider.parcels]);

  // Day-of-week breakdown
  const dowData = useMemo(() => {
    const buckets = DOW_LABELS.map((label) => ({ label, delivered: 0, failed: 0 }));
    rider.parcels.forEach((p) => {
      if (p.delivered) buckets[p.dayOfWeek].delivered++;
      else if (p.returned) buckets[p.dayOfWeek].failed++;
    });
    return buckets;
  }, [rider.parcels]);

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const map = new Map<string, number>();
    rider.parcels.filter((p) => p.delivered).forEach((p) => {
      const m = (p.paymentMethod || "N/A").toLowerCase();
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries()).map(([method, count], i) => ({
      id: i,
      value: count,
      label: method.charAt(0).toUpperCase() + method.slice(1),
    }));
  }, [rider.parcels]);

  // Top zones
  const zoneData = useMemo(() => {
    const map = new Map<string, number>();
    rider.parcels.filter((p) => p.delivered && p.receiverAddress).forEach((p) => {
      const z = extractZone(p.receiverAddress!);
      map.set(z, (map.get(z) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rider.parcels]);

  // Activity heatmap — calendar grid for the month
  const heatmapData = useMemo(() => {
    const dayMap = new Map<number, { delivered: number; failed: number }>();
    rider.parcels.forEach((p) => {
      if (!dayMap.has(p.day)) dayMap.set(p.day, { delivered: 0, failed: 0 });
      const e = dayMap.get(p.day)!;
      if (p.delivered) e.delivered++;
      else if (p.returned) e.failed++;
    });
    return dayMap;
  }, [rider.parcels]);

  const firstDayOfWeek = new Date(rider.year, rider.month, 1).getDay();

  const deliveredParcels = rider.parcels.filter((p) => p.delivered);
  const failedParcels = rider.parcels.filter((p) => p.returned);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-neutral-800">{rider.riderName}</h2>
            <p className="text-sm text-gray-500">{rider.monthLabel} · Rider Performance Report</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Delivered", value: rider.delivered, color: "text-green-600", bg: "bg-green-50", icon: PackageIcon },
              { label: "Failed", value: rider.failed, color: "text-red-600", bg: "bg-red-50", icon: XCircle },
              { label: "Success Rate", value: `${successRate}%`, color: "text-blue-600", bg: "bg-blue-50", icon: TrendingUp },
              { label: "Active Days", value: `${rider.activeDays.size} days`, color: "text-purple-600", bg: "bg-purple-50", icon: TrendingUp },
              { label: "Avg / Day", value: avgPerActiveDay, color: "text-[#ea690c]", bg: "bg-orange-50", icon: TrendingUp },
              { label: "Total Amount", value: formatCurrency(rider.totalAmount), color: "text-emerald-600", bg: "bg-emerald-50", icon: DollarSign },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <Card key={label} className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-3">
                  <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className={`text-base font-bold ${color} leading-tight`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Activity Heatmap */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-neutral-800 mb-1">Activity Heatmap</h3>
              <p className="text-xs text-gray-500 mb-4">Daily delivery activity for {rider.monthLabel}</p>
              <div className="overflow-x-auto">
                <div className="min-w-[360px]">
                  {/* Day labels */}
                  <div className="grid grid-cols-7 mb-1">
                    {DOW_LABELS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
                    ))}
                  </div>
                  {/* Calendar cells */}
                  {(() => {
                    const cells: JSX.Element[] = [];
                    // leading empty cells
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      cells.push(<div key={`e-${i}`} />);
                    }
                    for (let d = 1; d <= rider.daysInMonth; d++) {
                      const data = heatmapData.get(d);
                      const total = (data?.delivered || 0) + (data?.failed || 0);
                      const isActive = total > 0;
                      const allDelivered = data && data.failed === 0 && data.delivered > 0;
                      const hasFailed = data && data.failed > 0;

                      let cellClass = "border border-gray-100 bg-gray-50 text-gray-300";
                      if (isActive) {
                        if (allDelivered) cellClass = "border border-green-300 bg-green-100 text-green-800";
                        else if (hasFailed && data!.delivered === 0) cellClass = "border border-red-300 bg-red-100 text-red-700";
                        else cellClass = "border border-yellow-300 bg-yellow-100 text-yellow-800";
                      }

                      cells.push(
                        <div
                          key={d}
                          className={`rounded-md p-1 flex flex-col items-center justify-center min-h-[44px] ${cellClass}`}
                          title={data ? `Day ${d}: ${data.delivered} delivered, ${data.failed} failed` : `Day ${d}: no activity`}
                        >
                          <span className="text-[11px] font-semibold">{d}</span>
                          {data && total > 0 && (
                            <span className="text-[9px] font-bold leading-tight">{data.delivered}/{total}</span>
                          )}
                        </div>
                      );
                    }

                    // Build rows of 7
                    const rows: JSX.Element[][] = [];
                    let row: JSX.Element[] = [];
                    cells.forEach((cell, i) => {
                      row.push(cell);
                      if ((i + 1) % 7 === 0) { rows.push(row); row = []; }
                    });
                    if (row.length > 0) {
                      while (row.length < 7) row.push(<div key={`pad-${row.length}`} />);
                      rows.push(row);
                    }

                    return rows.map((r, i) => (
                      <div key={i} className="grid grid-cols-7 gap-1 mb-1">
                        {r}
                      </div>
                    ));
                  })()}
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />All delivered</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" />Mixed (some failed)</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />All failed</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />No activity</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily activity bar + Day of week */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-800 mb-1">Daily Activity</h3>
                <p className="text-xs text-gray-500 mb-3">Delivered vs failed per active day</p>
                {dailyData.length > 0 ? (
                  <BarChart
                    dataset={dailyData}
                    xAxis={[{ scaleType: "band", dataKey: "label", label: "Day" }]}
                    series={[
                      { dataKey: "delivered", label: "Delivered", color: "#10b981", valueFormatter: (v) => `${v}` },
                      { dataKey: "failed", label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v}` },
                    ]}
                    height={240}
                    margin={{ top: 10, bottom: 35, left: 35, right: 10 }}
                  />
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-800 mb-1">Best Days of Week</h3>
                <p className="text-xs text-gray-500 mb-3">Which days this rider performs best</p>
                <BarChart
                  dataset={dowData}
                  xAxis={[{ scaleType: "band", dataKey: "label" }]}
                  series={[
                    { dataKey: "delivered", label: "Delivered", color: "#10b981", valueFormatter: (v) => `${v}` },
                    { dataKey: "failed", label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v}` },
                  ]}
                  height={240}
                  margin={{ top: 10, bottom: 30, left: 35, right: 10 }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Payment method + Top zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-800 mb-4">Payment Methods</h3>
                {paymentData.length > 0 ? (
                  <>
                    <PieChart
                      series={[{ data: paymentData, innerRadius: 45, outerRadius: 80, paddingAngle: 3, cornerRadius: 4 }]}
                      colors={COLORS}
                      height={200}
                    />
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {paymentData.map((item, i) => (
                        <div key={item.label} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
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

            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-800 mb-1">Top Delivery Zones</h3>
                <p className="text-xs text-gray-500 mb-4">Most frequent areas for this rider</p>
                {zoneData.length > 0 ? (
                  <div className="space-y-2">
                    {zoneData.map((zone, i) => {
                      const pct = Math.round((zone.count / zoneData[0].count) * 100);
                      return (
                        <div key={zone.zone} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium text-neutral-700 truncate">{zone.zone}</span>
                              <span className="text-xs font-bold text-[#ea690c] ml-2 shrink-0">{zone.count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-[#ea690c] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No address data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delivered Parcels Table */}
          {deliveredParcels.length > 0 && (
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-800 mb-1">
                  Delivered Parcels
                  <span className="ml-2 text-xs font-normal text-gray-400">({deliveredParcels.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mb-4">All parcels successfully delivered this month</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Day", "Recipient", "Address", "Amount", "Del. Fee", "Inbound Fee", "Payment"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase border-b-2 border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deliveredParcels.map((p) => (
                        <tr key={p.parcelId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                            Day {p.day}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-neutral-800 text-xs">{p.receiverName || "N/A"}</div>
                            {p.receiverPhoneNumber && (
                              <a href={`tel:${p.receiverPhoneNumber}`} className="text-[11px] text-[#ea690c] hover:underline flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {formatPhoneNumber(p.receiverPhoneNumber)}
                              </a>
                            )}
                            {p.parcelDescription && (
                              <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{p.parcelDescription}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 max-w-[160px]">
                            {p.receiverAddress ? (
                              <div className="flex items-start gap-1">
                                <MapPinIcon className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                                <span className="text-xs text-neutral-600 truncate" title={p.receiverAddress}>{p.receiverAddress}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-bold text-[#ea690c] whitespace-nowrap">{formatCurrency(p.parcelAmount)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-emerald-600 whitespace-nowrap">{formatCurrency(p.deliveryCost)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-blue-600 whitespace-nowrap">{formatCurrency(p.inboundCost)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge className={`text-[10px] border ${
                              p.paymentMethod === "cash" ? "bg-green-100 text-green-800"
                              : p.paymentMethod === "momo" ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-700"
                            }`}>
                              {p.paymentMethod || "N/A"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Parcels Table */}
          {failedParcels.length > 0 && (
            <Card className="border border-red-200 bg-white shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-bold text-red-700 mb-1">
                  Failed / Returned Parcels
                  <span className="ml-2 text-xs font-normal text-red-400">({failedParcels.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mb-4">Parcels that were returned this month</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        {["Day", "Recipient", "Address", "Amount", "Del. Fee", "Inbound Fee"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-red-700 uppercase border-b-2 border-red-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {failedParcels.map((p) => (
                        <tr key={p.parcelId} className="border-b border-red-100 hover:bg-red-50/50 transition-colors">
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Day {p.day}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-neutral-800 text-xs">{p.receiverName || "N/A"}</div>
                            {p.receiverPhoneNumber && (
                              <a href={`tel:${p.receiverPhoneNumber}`} className="text-[11px] text-[#ea690c] hover:underline flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {formatPhoneNumber(p.receiverPhoneNumber)}
                              </a>
                            )}
                          </td>
                          <td className="px-3 py-2.5 max-w-[160px]">
                            {p.receiverAddress ? (
                              <div className="flex items-start gap-1">
                                <MapPinIcon className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                <span className="text-xs text-neutral-600 truncate" title={p.receiverAddress}>{p.receiverAddress}</span>
                              </div>
                            ) : <span className="text-xs text-gray-400">N/A</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-bold text-red-600 whitespace-nowrap">{formatCurrency(p.parcelAmount)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{formatCurrency(p.deliveryCost)}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">{formatCurrency(p.inboundCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};
