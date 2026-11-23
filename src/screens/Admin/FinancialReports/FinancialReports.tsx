import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, Download, BarChart3, PieChart as PieChartIcon, Wallet, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import adminService, { RevenueDashboard, RiderLeaderboardEntry } from "../../../services/adminService";
import { useLocation } from "../../../contexts/LocationContext";
import { formatCurrency } from "../../../utils/dataHelpers";
import { breakdown, reportFilters, toCsv, ReportType } from "./financialReport";

const PIE_COLORS = ["#ea690c", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const FinancialReports = (): JSX.Element => {
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [officeId, setOfficeId] = useState("");
    const [reportType, setReportType] = useState<ReportType>("station");
    const [chartType, setChartType] = useState<"bar" | "pie">("bar");
    const [revenue, setRevenue] = useState<RevenueDashboard | null>(null);
    const [riders, setRiders] = useState<RiderLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadedAt, setLoadedAt] = useState<Date | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const { stations, refreshLocations } = useLocation();

    useEffect(() => {
        if (stations.length === 0) refreshLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filters = useMemo(() => reportFilters(dateRange.from, dateRange.to, officeId), [dateRange, officeId]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([adminService.getRevenueDashboard(filters), adminService.getRiderPerformanceDashboard(filters)]).then(([rev, perf]) => {
            if (cancelled) return;
            if (rev.success && rev.data) {
                setRevenue(rev.data);
                setLoadedAt(new Date());
            } else {
                setError(rev.message || "Failed to load revenue figures.");
            }
            setRiders(perf.success ? perf.data?.riderLeaderboard ?? [] : []);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [filters, reloadKey]);

    const table = useMemo(() => breakdown(reportType, revenue, riders), [reportType, revenue, riders]);
    const stationsRevenue = revenue?.revenueByStation ?? [];
    const stationTotal = stationsRevenue.reduce((s, x) => s + n(x.revenue), 0);
    const maxStation = Math.max(1, ...stationsRevenue.map((s) => n(s.revenue)));

    const totalRevenue = n(revenue?.totalRevenue);
    const driverPayments = n(revenue?.driverPayments);
    const netRevenue = totalRevenue - driverPayments;
    const margin = totalRevenue > 0 ? Math.round((netRevenue / totalRevenue) * 100) : 0;
    const totalParcels = stationsRevenue.reduce((s, x) => s + n(x.parcels), 0);
    const pod = n(revenue?.revenueByType?.pod);
    const nonPod = n(revenue?.revenueByType?.nonPod);
    const podShare = pod + nonPod > 0 ? Math.round((pod / (pod + nonPod)) * 100) : 0;
    const hasDates = filters.startDate !== undefined;
    const stationName = stations.find((s) => s.id === officeId)?.name;

    const handleExport = () => {
        const blob = new Blob([toCsv(table)], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const period = hasDates ? `${dateRange.from}_to_${dateRange.to}` : "last-30-days";
        a.download = `financial-report-${reportType}-${period}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatCell = (v: string | number, i: number) => {
        if (typeof v === "string") return v;
        if (table.plainColumns.includes(i)) return v.toLocaleString();
        if (table.percentColumns.includes(i)) return `${v}%`;
        return formatCurrency(v);
    };

    let pieStart = 0;
    const pieGradient = stationsRevenue
        .map((s, i) => {
            const share = stationTotal ? (n(s.revenue) / stationTotal) * 100 : 0;
            const seg = `${PIE_COLORS[i % PIE_COLORS.length]} ${pieStart}% ${pieStart + share}%`;
            pieStart += share;
            return seg;
        })
        .join(", ");

    return (
        <div className="w-full bg-gray-50 min-h-screen">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <main className="flex-1 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-neutral-800">Financial Reports</h1>
                            <p className="text-sm text-[#5d5d5d] mt-2">
                                {stationName ? `${stationName}: revenue and payment analysis` : "System-wide revenue and payment analysis"}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setReloadKey((k) => k + 1)}
                                variant="outline"
                                disabled={loading}
                                aria-label="Refresh figures"
                                className="border border-[#d1d1d1]"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                            </Button>
                            <Button
                                onClick={handleExport}
                                disabled={!revenue || table.rows.length === 0}
                                className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 flex items-center gap-2"
                            >
                                <Download size={18} />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Date Range & Filter Controls */}
                    <Card className="border border-[#d1d1d1] bg-white">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <Label htmlFor="fr-from" className="block text-sm font-semibold text-neutral-800 mb-2">From Date</Label>
                                    <Input
                                        id="fr-from"
                                        type="date"
                                        value={dateRange.from}
                                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                        className="border border-[#d1d1d1]"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="fr-to" className="block text-sm font-semibold text-neutral-800 mb-2">To Date</Label>
                                    <Input
                                        id="fr-to"
                                        type="date"
                                        value={dateRange.to}
                                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                        className="border border-[#d1d1d1]"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="fr-station" className="block text-sm font-semibold text-neutral-800 mb-2">Station</Label>
                                    <select
                                        id="fr-station"
                                        value={officeId}
                                        onChange={(e) => setOfficeId(e.target.value)}
                                        className="w-full border border-[#d1d1d1] rounded px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="">All stations</option>
                                        {stations.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="fr-type" className="block text-sm font-semibold text-neutral-800 mb-2">Report Type</Label>
                                    <select
                                        id="fr-type"
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value as ReportType)}
                                        className="w-full border border-[#d1d1d1] rounded px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="station">By Station</option>
                                        <option value="driver">By Rider</option>
                                        <option value="daily">By Day</option>
                                        <option value="payment">By Payment Method</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={() => {
                                            setDateRange({ from: "", to: "" });
                                            setOfficeId("");
                                        }}
                                        variant="outline"
                                        className="w-full border border-[#d1d1d1]"
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </div>
                            {(dateRange.from === "") !== (dateRange.to === "") && (
                                <p className="text-xs text-[#5d5d5d] mt-3">Pick both dates to filter. Until then the report shows the last 30 days.</p>
                            )}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span>{error}</span>
                            <button onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">Try again</button>
                        </div>
                    )}

                    {!revenue && loading && (
                        <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading financial figures…
                        </div>
                    )}

                    {revenue && (
                        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
                            {/* Key Metrics Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="border border-[#d1d1d1] bg-gradient-to-br from-green-50 to-green-100">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-[#5d5d5d]">Total Revenue</p>
                                                <h3 className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</h3>
                                                <p className="text-xs text-green-600">{formatCurrency(n(revenue.avgPerParcel))} per parcel</p>
                                            </div>
                                            <div className="p-3 bg-green-200 rounded-lg">
                                                <DollarSign className="w-8 h-8 text-green-700" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-[#d1d1d1] bg-gradient-to-br from-blue-50 to-blue-100">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-[#5d5d5d]">Collected</p>
                                                <h3 className="text-2xl font-bold text-blue-700">{formatCurrency(n(revenue.collected))}</h3>
                                                <p className="text-xs text-blue-600">{n(revenue.collectionRate)}% of revenue</p>
                                            </div>
                                            <div className="p-3 bg-blue-200 rounded-lg">
                                                <Wallet className="w-8 h-8 text-blue-700" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-[#d1d1d1] bg-gradient-to-br from-orange-50 to-orange-100">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-[#5d5d5d]">Outstanding</p>
                                                <h3 className="text-2xl font-bold text-orange-700">{formatCurrency(n(revenue.outstanding))}</h3>
                                                <p className="text-xs text-orange-600">Delivered, not yet reconciled</p>
                                            </div>
                                            <div className="p-3 bg-orange-200 rounded-lg">
                                                <TrendingDown className="w-8 h-8 text-orange-700" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-[#d1d1d1] bg-gradient-to-br from-purple-50 to-purple-100">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-[#5d5d5d]">Net Revenue</p>
                                                <h3 className="text-2xl font-bold text-purple-700">{formatCurrency(netRevenue)}</h3>
                                                <p className="text-xs text-purple-600">After {formatCurrency(driverPayments)} driver payments</p>
                                            </div>
                                            <div className="p-3 bg-purple-200 rounded-lg">
                                                <BarChart3 className="w-8 h-8 text-purple-700" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Performance Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border border-[#d1d1d1] bg-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-[#5d5d5d]">Collection Rate</p>
                                                <h3 className="text-3xl font-bold text-[#ea690c]">{n(revenue.collectionRate)}%</h3>
                                                <p className="text-xs text-[#5d5d5d] mt-2">Collected out of revenue</p>
                                            </div>
                                            <div className="w-16 h-16 rounded-full border-4 border-[#ea690c] flex items-center justify-center">
                                                <span className="text-sm font-bold text-[#ea690c]">{Math.round(n(revenue.collectionRate))}%</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-[#d1d1d1] bg-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-[#5d5d5d]">POD Revenue</p>
                                                <h3 className="text-3xl font-bold text-blue-600">{podShare}%</h3>
                                                <p className="text-xs text-[#5d5d5d] mt-2">
                                                    {formatCurrency(pod)} POD · {formatCurrency(nonPod)} non-POD
                                                </p>
                                            </div>
                                            <div
                                                className="w-16 h-16 rounded-full"
                                                aria-hidden="true"
                                                style={{ background: `conic-gradient(#3b82f6 0% ${podShare}%, #dbeafe ${podShare}% 100%)` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-[#d1d1d1] bg-white">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-[#5d5d5d]">Margin After Driver Payments</p>
                                                <h3 className="text-3xl font-bold text-green-600">{margin}%</h3>
                                                <p className="text-xs text-[#5d5d5d] mt-2">Net revenue out of total revenue</p>
                                            </div>
                                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                                <TrendingUp className="w-7 h-7 text-green-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Chart Visualization Section */}
                            <Card className="border border-[#d1d1d1] bg-white shadow-sm overflow-hidden">
                                <CardContent className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-bold text-neutral-800">Revenue by Station</h2>
                                        <div className="flex gap-2">
                                            <Button variant={chartType === "bar" ? "default" : "outline"} size="sm" onClick={() => setChartType("bar")} className="flex items-center gap-1">
                                                <BarChart3 size={16} />
                                                Bar
                                            </Button>
                                            <Button variant={chartType === "pie" ? "default" : "outline"} size="sm" onClick={() => setChartType("pie")} className="flex items-center gap-1">
                                                <PieChartIcon size={16} />
                                                Pie
                                            </Button>
                                        </div>
                                    </div>

                                    {stationsRevenue.length === 0 || stationTotal === 0 ? (
                                        <p className="h-40 flex items-center justify-center text-sm text-neutral-500">No revenue in this period.</p>
                                    ) : chartType === "bar" ? (
                                        <div className="bg-gray-50 rounded-lg p-4 sm:p-8 overflow-x-auto">
                                            <div className="flex items-end justify-around gap-4 h-64 min-w-[480px]">
                                                {stationsRevenue.map((station) => (
                                                    <div key={station.officeId} className="flex flex-col items-center justify-end gap-2 flex-1 h-full">
                                                        <div
                                                            className="w-full bg-gradient-to-t from-[#ea690c] to-orange-400 rounded-t transition-all"
                                                            style={{ height: `${(n(station.revenue) / maxStation) * 80}%`, minHeight: "4px" }}
                                                            title={`${station.stationName}: ${formatCurrency(n(station.revenue))}`}
                                                        />
                                                        <span className="text-xs text-neutral-700 text-center truncate w-full">{station.stationName}</span>
                                                        <span className="text-xs font-semibold text-neutral-800">{formatCurrency(n(station.revenue))}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 py-4">
                                            <div className="relative w-56 h-56 shrink-0">
                                                <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${pieGradient})` }} />
                                                <div className="absolute inset-10 rounded-full bg-white flex items-center justify-center">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-[#ea690c]">{stationsRevenue.length}</p>
                                                        <p className="text-xs text-[#5d5d5d]">Stations</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3 min-w-[220px]">
                                                {stationsRevenue.map((station, index) => (
                                                    <div key={station.officeId} className="flex items-center gap-2 text-sm">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                        <span className="text-neutral-700">{station.stationName}</span>
                                                        <span className="font-semibold text-neutral-800 ml-auto pl-4">
                                                            {Math.round((n(station.revenue) / stationTotal) * 100)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Detailed breakdown table */}
                            <Card className="border border-[#d1d1d1] bg-white shadow-sm overflow-hidden">
                                <CardContent className="p-4 sm:p-6">
                                    <h2 className="text-lg font-bold text-neutral-800 mb-4">
                                        {reportType === "station" ? "Station" : reportType === "driver" ? "Rider" : reportType === "daily" ? "Daily" : "Payment Method"} Financial Breakdown
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-[#d1d1d1]">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-[#d1d1d1]">
                                                    {table.headers.map((h, i) => (
                                                        <th
                                                            key={h}
                                                            className={`py-3 px-3 sm:py-4 sm:px-6 text-xs font-semibold text-neutral-700 uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-[#d1d1d1]">
                                                {table.rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={table.headers.length} className="py-12 text-center">
                                                            <p className="text-sm text-neutral-500">No figures for this period</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    table.rows.map((row, index) => (
                                                        <tr key={`${row[0]}-${index}`} className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                                            {row.map((v, i) => (
                                                                <td
                                                                    key={i}
                                                                    className={`py-3 px-3 sm:py-4 sm:px-6 whitespace-nowrap text-xs sm:text-sm tabular-nums ${i === 0 ? "text-left font-semibold text-neutral-800" : "text-right text-neutral-700"}`}
                                                                >
                                                                    {formatCell(v, i)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Summary Footer */}
                            <Card className="border border-[#d1d1d1] bg-gradient-to-r from-neutral-50 to-gray-100">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-[#5d5d5d] uppercase tracking-wide">Reporting Period</p>
                                            <p className="text-sm font-semibold text-neutral-800 mt-1">
                                                {hasDates ? `${dateRange.from} to ${dateRange.to}` : "Last 30 days"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#5d5d5d] uppercase tracking-wide">Stations</p>
                                            <p className="text-sm font-semibold text-neutral-800 mt-1">{stationName ?? `${stationsRevenue.length} stations`}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#5d5d5d] uppercase tracking-wide">Last Updated</p>
                                            <p className="text-sm font-semibold text-neutral-800 mt-1">{loadedAt ? loadedAt.toLocaleString() : "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[#5d5d5d] uppercase tracking-wide">Parcels</p>
                                            <p className="text-sm font-semibold text-neutral-800 mt-1">{totalParcels.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
