import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Clock,
  Star,
  Building2,
  CalendarIcon,
  Download,
  RefreshCw,
  Banknote,
  Wallet,
  CheckCircle2,
  XCircle,
  Bike,
  PhoneCall,
  MapPin,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useLocation } from "../../../contexts/LocationContext";
import { formatCurrency } from "../../../utils/dataHelpers";
import dummyDataGenerator from "../../../services/dummyDataGenerator";
import type {
  DashboardKPI,
  RevenueDataPoint,
  StationPerformance,
  RiderPerformance,
  StationEarningsPeriod,
} from "../../../services/dummyDataGenerator";
import { RiderDetailModal } from "./RiderDetailModal";
import { exportService } from "../../../services/exportService";

// MUI X Charts
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

// Inline sub-component: collapsible period row with per-rider breakdown
function EarningsPeriodRow({ period }: { period: StationEarningsPeriod }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-neutral-800">{period.periodLabel}</span>
        </div>
        <span className="text-xs text-gray-500">{period.parcels} parcels</span>
        <span className="text-sm font-bold text-[#ea690c] w-28 text-right">{formatCurrency(period.revenue)}</span>
        <span className="text-xs font-medium text-green-600 w-28 text-right">{formatCurrency(period.collected)} collected</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Per-Rider Breakdown</p>
          <div className="space-y-1.5">
            {period.riders.sort((a, b) => b.revenue - a.revenue).map((r) => (
              <div key={r.riderId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 truncate">{r.riderName}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#ea690c] h-1.5 rounded-full"
                    style={{ width: `${Math.round((r.revenue / period.revenue) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#ea690c] w-20 text-right">{formatCurrency(r.revenue)}</span>
                <span className="text-xs text-gray-400 w-16 text-right">{r.parcels} parcels</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const AdminFinancialDashboard = (): JSX.Element => {
  const { stations, loading: stationsLoading, refreshLocations } = useLocation();

  useEffect(() => {
    if (stations.length === 0) refreshLocations();
  }, []);

  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("30");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "operations" | "riders">("overview");
  const [earningsPeriod, setEarningsPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedRider, setSelectedRider] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!selectedOfficeId && stations.length > 0) {
      setSelectedOfficeId("all");
    }
  }, [stations, selectedOfficeId]);

  // Generate data based on filters
  const dashboardData = useMemo(() => {
    const stationId = selectedOfficeId === "all" ? undefined : selectedOfficeId;
    const days = parseInt(dateRange);

    return {
      kpis: dummyDataGenerator.generateKPIs(stationId),
      revenueTrend: dummyDataGenerator.generateRevenueTrend(days, stationId),
      revenueBreakdown: dummyDataGenerator.generateRevenueBreakdown(stationId),
      stationPerformance: dummyDataGenerator.generateStationPerformance(),
      riderPerformance: dummyDataGenerator.generateRiderPerformance(10, stationId),
      stationEarnings: dummyDataGenerator.generateStationEarningsByPeriod(earningsPeriod, stationId === undefined ? undefined : stationId),
      parcelStatus: dummyDataGenerator.generateParcelStatusDistribution(stationId),
      paymentTrend: dummyDataGenerator.generatePaymentMethodTrend(days, stationId),
      deliveryPerformance: dummyDataGenerator.generateDeliveryPerformance(days, stationId),
    };
  }, [selectedOfficeId, dateRange, earningsPeriod]);

  const selectedOfficeName =
    selectedOfficeId === "all"
      ? "All Stations"
      : stations.find((s) => s.id === selectedOfficeId)?.name || "All Stations";

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Financial_Report_${selectedOfficeName.replace(/\s+/g, '_')}_${timestamp}`;

    if (activeTab === 'overview') {
      const columns = [
        { header: 'Station', key: 'stationName', width: 20 },
        { header: 'Parcels', key: 'parcels', width: 12 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Delivery Rate', key: 'deliveryRate', width: 15 },
      ];
      const data = dashboardData.stationPerformance.map(s => ({
        stationName: s.stationName,
        parcels: s.parcels,
        revenue: formatCurrency(s.revenue),
        deliveryRate: `${s.deliveryRate}%`,
      }));
      const options = {
        title: 'Financial Overview Report',
        subtitle: `${selectedOfficeName} — ${dateRange} days`,
        columns,
        data,
        filename,
      };
      format === 'pdf' ? exportService.exportToPDF(options) : exportService.exportToExcel(options);
    } else if (activeTab === 'riders') {
      const columns = [
        { header: 'Rank', key: 'rank', width: 8 },
        { header: 'Rider Name', key: 'riderName', width: 20 },
        { header: 'Deliveries', key: 'deliveries', width: 12 },
        { header: 'Failed', key: 'failed', width: 10 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Outstanding', key: 'outstanding', width: 15 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Avg Time', key: 'avgDeliveryTime', width: 12 },
      ];
      const data = dashboardData.riderPerformance.map((r, i) => ({
        rank: i + 1,
        riderName: r.riderName,
        deliveries: r.deliveries,
        failed: r.failed,
        revenue: formatCurrency(r.revenue),
        outstanding: formatCurrency(r.outstanding),
        rating: r.rating,
        avgDeliveryTime: `${r.avgDeliveryTime}h`,
      }));
      const options = {
        title: 'Rider Performance Report',
        subtitle: `${selectedOfficeName} — ${dateRange} days`,
        columns,
        data,
        filename,
      };
      format === 'pdf' ? exportService.exportToPDF(options) : exportService.exportToExcel(options);
    } else {
      const columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Collected', key: 'collected', width: 15 },
        { header: 'Outstanding', key: 'outstanding', width: 15 },
      ];
      const data = dashboardData.revenueTrend.map(d => ({
        date: new Date(d.date).toLocaleDateString(),
        revenue: formatCurrency(d.revenue),
        collected: formatCurrency(d.collected),
        outstanding: formatCurrency(d.outstanding),
      }));
      const options = {
        title: `${activeTab === 'revenue' ? 'Revenue Analytics' : 'Operations'} Report`,
        subtitle: `${selectedOfficeName} — ${dateRange} days`,
        columns,
        data,
        filename,
      };
      format === 'pdf' ? exportService.exportToPDF(options) : exportService.exportToExcel(options);
    }
  };

  // KPI Cards Configuration
  const kpiCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(dashboardData.kpis.totalRevenue),
      icon: DollarSign,
      color: "text-[#ea690c]",
      bg: "bg-orange-50",
      trend: "+12.5%",
      trendUp: true,
    },

    {
      label: "Total Parcels",
      value: dashboardData.kpis.totalParcels.toLocaleString(),
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: "+15.7%",
      trendUp: true,
    },
    {
      label: "Success Rate",
      value: `${dashboardData.kpis.successRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: "+2.1%",
      trendUp: true,
    },
    {
      label: "Active Riders",
      value: dashboardData.kpis.activeRiders,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      trend: "+3",
      trendUp: true,
    },
    {
      label: "Avg Delivery Time",
      value: `${dashboardData.kpis.avgDeliveryTime}h`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "-0.3h",
      trendUp: true,
    },
    {
      label: "Customer Satisfaction",
      value: `${dashboardData.kpis.customerSatisfaction}%`,
      icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      trend: "+1.8%",
      trendUp: true,
    },
  ];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue Analytics" },
    { key: "operations", label: "Operations" },
    { key: "riders", label: "Rider Performance" },
  ] as const;

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-gray-100 tracking-tight">Financial Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedOfficeName} — Comprehensive performance insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              className="border-gray-300 active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => handleExport('pdf')} className="bg-[#ea690c] hover:bg-[#d45e0a] active:scale-95 transition-transform">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button onClick={() => handleExport('excel')} variant="outline" className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50 active:scale-95 transition-transform">
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* Filters */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Station
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <select
                    value={selectedOfficeId}
                    onChange={(e) => setSelectedOfficeId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                  >
                    <option value="all">All Stations</option>
                    {stationsLoading ? (
                      <option value="">Loading...</option>
                    ) : (
                      stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Date Range
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as "7" | "30" | "90")}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((card, index) => {
            const Icon = card.icon;
            const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;
            const gradientMap: Record<string, string> = {
              'bg-orange-50': 'bg-gradient-to-br from-orange-50 to-orange-100/50',
              'bg-green-50': 'bg-gradient-to-br from-green-50 to-green-100/50',
              'bg-red-50': 'bg-gradient-to-br from-red-50 to-red-100/50',
              'bg-blue-50': 'bg-gradient-to-br from-blue-50 to-blue-100/50',
              'bg-purple-50': 'bg-gradient-to-br from-purple-50 to-purple-100/50',
              'bg-indigo-50': 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
              'bg-amber-50': 'bg-gradient-to-br from-amber-50 to-amber-100/50',
              'bg-yellow-50': 'bg-gradient-to-br from-yellow-50 to-yellow-100/50',
            };
            const gradient = gradientMap[card.bg] || card.bg;
            return (
              <div key={card.label} className="animate-slide-up" style={{ animationDelay: `${index * 60}ms` }}>
                <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1.5 hover:scale-[1.02] transition-all duration-500 ease-out cursor-pointer">
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      <Icon className={`w-5 h-5 ${card.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    <p className={`text-xl font-bold ${card.color} mb-1 tracking-tight`}>{card.value}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{card.label}</p>
                    <div className="flex items-center gap-1">
                      <TrendIcon className={`w-3 h-3 ${card.trendUp ? "text-green-600" : "text-red-600"}`} />
                      <span className={`text-xs font-semibold ${card.trendUp ? "text-green-600" : "text-red-600"}`}>
                        {card.trend}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-[#ea690c] border-b-2 border-[#ea690c]"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">

            {/* Financial Summary Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Revenue", value: formatCurrency(dashboardData.kpis.totalRevenue), icon: DollarSign, color: "text-[#ea690c]", bg: "bg-orange-50", border: "border-orange-200" },
                { label: "Collected", value: formatCurrency(dashboardData.kpis.totalCollected), icon: Banknote, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
                { label: "Outstanding", value: formatCurrency(dashboardData.kpis.outstanding), icon: Wallet, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
                { label: "Driver Payments Owed", value: formatCurrency(dashboardData.kpis.totalRevenue * 0.35), icon: Bike, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
              ].map((item) => (
                <Card key={item.label} className={`border ${item.border} bg-white shadow-sm`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color} tracking-tight`}>{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-neutral-800">Revenue vs Collected</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#ea690c] inline-block rounded" />Revenue</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#10b981] inline-block rounded" />Collected</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Daily trend over selected period</p>
                  <LineChart
                    xAxis={[{
                      data: dashboardData.revenueTrend.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "point",
                      tickLabelStyle: { fontSize: 11 },
                      tickMinStep: Math.ceil(dashboardData.revenueTrend.length / 7),
                    }]}
                    yAxis={[{ valueFormatter: (v) => `GHC ${(v / 1000).toFixed(0)}k` }]}
                    series={[
                      { data: dashboardData.revenueTrend.map((d) => d.revenue), label: "Revenue", color: "#ea690c", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                      { data: dashboardData.revenueTrend.map((d) => d.collected), label: "Collected", color: "#10b981", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                    ]}
                    height={260}
                    margin={{ top: 10, right: 10, bottom: 30, left: 65 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{
                      '& .MuiAreaElement-root': { fillOpacity: 0.12 },
                      '& .MuiLineElement-root': { strokeWidth: 2.5 },
                    }}
                  />
                </CardContent>
              </Card>

              {/* Delivery Performance */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-neutral-800">Delivered vs Failed</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#3b82f6] inline-block rounded-sm" />Delivered</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444] inline-block rounded-sm" />Failed</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Daily delivery outcomes over selected period</p>
                  <BarChart
                    xAxis={[{
                      data: dashboardData.deliveryPerformance.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "band",
                      tickLabelStyle: { fontSize: 11 },
                      tickMinStep: Math.ceil(dashboardData.deliveryPerformance.length / 7),
                    }]}
                    series={[
                      { data: dashboardData.deliveryPerformance.map((d) => d.delivered), label: "Delivered", color: "#3b82f6", valueFormatter: (v) => `${v} parcels` },
                      { data: dashboardData.deliveryPerformance.map((d) => d.failed), label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v} parcels` },
                    ]}
                    height={260}
                    margin={{ top: 10, right: 10, bottom: 30, left: 45 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{
                      '& .MuiBarElement-root': { rx: 4, transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } },
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Parcel Pipeline + Station Table Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Parcel Pipeline */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Parcel Pipeline</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Registered", icon: Package, color: "text-gray-600", bg: "bg-gray-100", bar: "bg-gray-400" },
                      { label: "Contacted", icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-50", bar: "bg-blue-400" },
                      { label: "Ready for Delivery", icon: MapPin, color: "text-yellow-600", bg: "bg-yellow-50", bar: "bg-yellow-400" },
                      { label: "Assigned", icon: Bike, color: "text-purple-600", bg: "bg-purple-50", bar: "bg-purple-500" },
                      { label: "Out for Delivery", icon: ArrowRight, color: "text-indigo-600", bg: "bg-indigo-50", bar: "bg-indigo-500" },
                      { label: "Delivered", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", bar: "bg-green-500" },
                      { label: "Failed", icon: XCircle, color: "text-red-500", bg: "bg-red-50", bar: "bg-red-400" },
                    ].map((stage) => {
                      const statusData = dashboardData.parcelStatus.find(
                        (s) => s.status.toLowerCase().includes(stage.label.toLowerCase().split(" ")[0])
                      );
                      const count = statusData?.count ?? Math.round(Math.random() * 80 + 5);
                      const pct = statusData?.percentage ?? Math.round(Math.random() * 20 + 2);
                      return (
                        <div key={stage.label} className="flex items-center gap-3">
                          <div className={`w-7 h-7 ${stage.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-36 flex-shrink-0">{stage.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`${stage.bar} h-2 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 dark:text-gray-300 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Station Performance Table */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Station Snapshot</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase">Station</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Parcels</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {dashboardData.stationPerformance.map((s, i) => (
                          <tr key={s.stationId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  i === 0 ? "bg-yellow-100 text-yellow-700" :
                                  i === 1 ? "bg-gray-100 text-gray-600" :
                                  i === 2 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"
                                }`}>{i + 1}</div>
                                <span className="text-sm font-medium text-neutral-800 dark:text-gray-200">{s.stationName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right text-sm text-neutral-700 dark:text-gray-300">{s.parcels}</td>
                            <td className="py-2.5 text-right text-sm font-semibold text-[#ea690c]">{formatCurrency(s.revenue)}</td>
                            <td className="py-2.5 text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                s.deliveryRate >= 90 ? "bg-green-100 text-green-700" :
                                s.deliveryRate >= 80 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"
                              }`}>{s.deliveryRate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row: POD breakdown + Payment Methods + Top 3 Riders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* POD vs Non-POD */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Revenue by Type</h3>
                  <PieChart
                    series={[{
                      data: dashboardData.revenueBreakdown.byType.map((item, i) => ({
                        id: item.category, value: item.value,
                        label: `${item.category} (${item.percentage}%)`,
                        color: ["#ea690c", "#3b82f6"][i],
                      })),
                      innerRadius: 45, outerRadius: 75, paddingAngle: 2, cornerRadius: 4,
                      highlightScope: { faded: "global", highlighted: "item" },
                      faded: { innerRadius: 35, additionalRadius: -10, color: "gray" },
                    }]}
                    height={200}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2 mt-2">
                    {dashboardData.revenueBreakdown.byType.map((item, i) => (
                      <div key={item.category} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#ea690c", "#3b82f6"][i] }} />
                          <span className="text-gray-600">{item.category}</span>
                        </div>
                        <span className="font-bold text-neutral-800">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Payment Methods</h3>
                  <PieChart
                    series={[{
                      data: dashboardData.revenueBreakdown.byPayment.map((item, i) => ({
                        id: item.category, value: item.value,
                        label: `${item.category} (${item.percentage}%)`,
                        color: ["#10b981", "#8b5cf6", "#6b7280"][i],
                      })),
                      innerRadius: 45, outerRadius: 75, paddingAngle: 2, cornerRadius: 4,
                      highlightScope: { faded: "global", highlighted: "item" },
                      faded: { innerRadius: 35, additionalRadius: -10, color: "gray" },
                    }]}
                    height={200}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2 mt-2">
                    {dashboardData.revenueBreakdown.byPayment.map((item, i) => (
                      <div key={item.category} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#10b981", "#8b5cf6", "#6b7280"][i] }} />
                          <span className="text-gray-600">{item.category}</span>
                        </div>
                        <span className="font-bold text-neutral-800">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top 3 Riders */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Top Riders</h3>
                  <div className="space-y-3">
                    {dashboardData.riderPerformance.slice(0, 3).map((rider, i) => (
                      <div key={rider.riderId} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-600"
                        }`}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{rider.riderName}</p>
                          <p className="text-xs text-gray-500">{rider.deliveries} deliveries</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-[#ea690c]">{formatCurrency(rider.revenue)}</p>
                          <div className="flex items-center justify-end gap-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-semibold text-gray-600">{rider.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Delivery vs Pickup</span>
                    </div>
                    {[
                      { label: "Home Delivery", pct: 75, color: "bg-indigo-500" },
                      { label: "Pickup", pct: 25, color: "bg-amber-400" },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-24">{m.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`${m.color} h-1.5 rounded-full`} style={{ width: `${m.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-neutral-700">{m.pct}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6 animate-fade-in">

            {/* Revenue KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Revenue", value: formatCurrency(dashboardData.kpis.totalRevenue), color: "text-[#ea690c]", bg: "bg-orange-50", border: "border-orange-200", icon: DollarSign },
                { label: "Collected", value: formatCurrency(dashboardData.kpis.totalCollected), color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: Banknote },
                { label: "Outstanding", value: formatCurrency(dashboardData.kpis.outstanding), color: "text-red-500", bg: "bg-red-50", border: "border-red-200", icon: Wallet },
                {
                  label: "Collection Rate",
                  value: `${Math.round((dashboardData.kpis.totalCollected / dashboardData.kpis.totalRevenue) * 100)}%`,
                  color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: TrendingUp,
                },
                {
                  label: "Avg per Parcel",
                  value: formatCurrency(Math.round(dashboardData.kpis.totalRevenue / dashboardData.kpis.totalParcels)),
                  color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: Package,
                },
                {
                  label: "Driver Payments",
                  value: formatCurrency(Math.round(dashboardData.kpis.totalRevenue * 0.35)),
                  color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: Bike,
                },
              ].map((k) => (
                <Card key={k.label} className={`border ${k.border} bg-white shadow-sm`}>
                  <CardContent className="p-4">
                    <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                      <k.icon className={`w-4 h-4 ${k.color}`} />
                    </div>
                    <p className={`text-lg font-bold ${k.color} tracking-tight`}>{k.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue vs Collected — full width detailed chart */}
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-base font-bold text-neutral-800">Revenue vs Collected vs Outstanding</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Daily trend — the gap between revenue and collected is outstanding balance</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs flex-shrink-0">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#ea690c] inline-block rounded" />Revenue</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#10b981] inline-block rounded" />Collected</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#ef4444] inline-block rounded" />Outstanding</span>
                  </div>
                </div>
                <LineChart
                  xAxis={[{
                    data: dashboardData.revenueTrend.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                    scaleType: "point",
                    tickLabelStyle: { fontSize: 11 },
                    tickMinStep: Math.ceil(dashboardData.revenueTrend.length / 8),
                  }]}
                  yAxis={[{ valueFormatter: (v) => `GHC ${(v / 1000).toFixed(0)}k` }]}
                  series={[
                    { data: dashboardData.revenueTrend.map((d) => d.revenue), label: "Revenue", color: "#ea690c", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                    { data: dashboardData.revenueTrend.map((d) => d.collected), label: "Collected", color: "#10b981", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                    { data: dashboardData.revenueTrend.map((d) => d.outstanding), label: "Outstanding", color: "#ef4444", curve: "catmullRom", showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                  ]}
                  height={300}
                  margin={{ top: 10, right: 10, bottom: 30, left: 70 }}
                  slotProps={{ legend: { hidden: true } }}
                  sx={{
                    '& .MuiAreaElement-root': { fillOpacity: 0.1 },
                    '& .MuiLineElement-root': { strokeWidth: 2.5 },
                  }}
                />
              </CardContent>
            </Card>

            {/* Station Revenue + Payment Method side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Station Revenue — all stations: stacked bars | single station: detail panel */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  {selectedOfficeId === "all" ? (
                    <>
                      <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Revenue by Station</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Collected vs outstanding per station</p>
                      <div className="space-y-4">
                        {dashboardData.stationPerformance.map((s, i) => {
                          const collectedPct = Math.round((s.revenue * (0.7 + i * 0.04)) / s.revenue * 100);
                          const outstandingPct = 100 - collectedPct;
                          const maxRevenue = dashboardData.stationPerformance[0].revenue;
                          const barWidth = Math.round((s.revenue / maxRevenue) * 100);
                          return (
                            <div key={s.stationId}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                                    i === 1 ? "bg-gray-100 text-gray-600" :
                                    i === 2 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"
                                  }`}>{i + 1}</div>
                                  <span className="text-sm font-semibold text-neutral-800">{s.stationName}</span>
                                </div>
                                <span className="text-sm font-bold text-[#ea690c]">{formatCurrency(s.revenue)}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div className="h-3 flex rounded-full overflow-hidden" style={{ width: `${barWidth}%` }}>
                                  <div className="bg-green-500 h-3" style={{ width: `${collectedPct}%` }} />
                                  <div className="bg-red-400 h-3" style={{ width: `${outstandingPct}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] text-green-600">{collectedPct}% collected</span>
                                <span className="text-[10px] text-red-500">{outstandingPct}% outstanding</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{s.parcels} parcels · {s.deliveryRate}% rate</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm inline-block" />Collected</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" />Outstanding</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">{selectedOfficeName} — Station Detail</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Performance breakdown for this station</p>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                          { label: "Total Parcels", value: dashboardData.kpis.totalParcels.toLocaleString(), color: "text-blue-600", bg: "bg-blue-50" },
                          { label: "Delivered", value: dashboardData.kpis.deliveredParcels.toLocaleString(), color: "text-green-600", bg: "bg-green-50" },
                          { label: "Failed", value: dashboardData.kpis.failedParcels.toLocaleString(), color: "text-red-500", bg: "bg-red-50" },
                          { label: "Active Riders", value: String(dashboardData.kpis.activeRiders), color: "text-purple-600", bg: "bg-purple-50" },
                        ].map((item) => (
                          <div key={item.label} className={`${item.bg} rounded-xl p-3`}>
                            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                          </div>
                        ))}
                      </div>
                      {/* Collection rate bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-600">Collection Rate</span>
                          <span className="font-bold text-[#ea690c]">
                            {Math.round((dashboardData.kpis.totalCollected / dashboardData.kpis.totalRevenue) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-[#ea690c] to-orange-400 transition-all duration-700"
                            style={{ width: `${Math.round((dashboardData.kpis.totalCollected / dashboardData.kpis.totalRevenue) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="text-green-600">{formatCurrency(dashboardData.kpis.totalCollected)} collected</span>
                          <span className="text-red-500">{formatCurrency(dashboardData.kpis.outstanding)} outstanding</span>
                        </div>
                      </div>
                      {/* Top riders for this station */}
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Riders at this Station</p>
                      <div className="space-y-2">
                        {dashboardData.riderPerformance.slice(0, 4).map((r, i) => (
                          <div key={r.riderId} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              i === 0 ? "bg-yellow-100 text-yellow-700" :
                              i === 1 ? "bg-gray-100 text-gray-600" :
                              i === 2 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"
                            }`}>{i + 1}</div>
                            <span className="text-sm font-medium text-neutral-800 flex-1 truncate">{r.riderName}</span>
                            <span className="text-xs text-gray-500">{r.deliveries} deliveries</span>
                            <span className="text-sm font-bold text-[#ea690c]">{formatCurrency(r.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method Trend */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800">Payment Method Trend</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Cash vs MoMo vs Other over time</p>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" />Cash</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] inline-block" />MoMo</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6b7280] inline-block" />Other</span>
                    </div>
                  </div>
                  <LineChart
                    xAxis={[{
                      data: dashboardData.paymentTrend.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "point",
                      tickLabelStyle: { fontSize: 10 },
                      tickMinStep: Math.ceil(dashboardData.paymentTrend.length / 7),
                    }]}
                    yAxis={[{ valueFormatter: (v) => `GHC ${(v / 1000).toFixed(0)}k` }]}
                    series={[
                      { data: dashboardData.paymentTrend.map((d) => d.cash), label: "Cash", color: "#10b981", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                      { data: dashboardData.paymentTrend.map((d) => d.momo), label: "MoMo", color: "#8b5cf6", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                      { data: dashboardData.paymentTrend.map((d) => d.other), label: "Other", color: "#6b7280", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                    ]}
                    height={280}
                    margin={{ top: 10, right: 10, bottom: 30, left: 65 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.1 }, '& .MuiLineElement-root': { strokeWidth: 2 } }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Bottom row: POD split + Payment split + Day-of-week revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* POD vs Non-POD */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Revenue by Type</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">POD vs Non-POD split</p>
                  <PieChart
                    series={[{
                      data: dashboardData.revenueBreakdown.byType.map((item, i) => ({
                        id: item.category, value: item.value,
                        label: item.category,
                        color: ["#ea690c", "#3b82f6"][i],
                      })),
                      innerRadius: 50, outerRadius: 80, paddingAngle: 3, cornerRadius: 5,
                      highlightScope: { faded: "global", highlighted: "item" },
                      faded: { innerRadius: 40, additionalRadius: -10, color: "gray" },
                    }]}
                    height={190}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2.5 mt-1">
                    {dashboardData.revenueBreakdown.byType.map((item, i) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#ea690c", "#3b82f6"][i] }} />
                          <span className="text-xs text-gray-600">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-neutral-800">{item.percentage}%</span>
                          <span className="text-xs text-gray-400 ml-2">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Split */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Payment Methods</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Cash vs MoMo vs Other</p>
                  <PieChart
                    series={[{
                      data: dashboardData.revenueBreakdown.byPayment.map((item, i) => ({
                        id: item.category, value: item.value,
                        label: item.category,
                        color: ["#10b981", "#8b5cf6", "#6b7280"][i],
                      })),
                      innerRadius: 50, outerRadius: 80, paddingAngle: 3, cornerRadius: 5,
                      highlightScope: { faded: "global", highlighted: "item" },
                      faded: { innerRadius: 40, additionalRadius: -10, color: "gray" },
                    }]}
                    height={190}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2.5 mt-1">
                    {dashboardData.revenueBreakdown.byPayment.map((item, i) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#10b981", "#8b5cf6", "#6b7280"][i] }} />
                          <span className="text-xs text-gray-600">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-neutral-800">{item.percentage}%</span>
                          <span className="text-xs text-gray-400 ml-2">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Day of Week */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Revenue by Day of Week</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Average daily revenue pattern</p>
                  {(() => {
                    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const dayRevenue = days.map((day, i) => ({
                      day,
                      // Derive from revenueTrend: average revenue for each day-of-week
                      revenue: Math.round(
                        dashboardData.revenueTrend
                          .filter((d) => new Date(d.date).getDay() === (i + 1) % 7)
                          .reduce((s, d, _, arr) => s + d.revenue / arr.length, 0)
                      ),
                    }));
                    const maxRev = Math.max(...dayRevenue.map((d) => d.revenue), 1);
                    return (
                      <div className="space-y-2.5">
                        {dayRevenue.map((d, i) => (
                          <div key={d.day} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-500 w-8">{d.day}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-3 rounded-full transition-all duration-700"
                                style={{
                                  width: `${(d.revenue / maxRev) * 100}%`,
                                  background: i === dayRevenue.findIndex((x) => x.revenue === maxRev)
                                    ? "#ea690c"
                                    : i >= 5 ? "#d1d5db" : "#fb923c",
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-neutral-700 w-20 text-right">{formatCurrency(d.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "operations" && (
          <div className="space-y-6 animate-fade-in">

            {/* Ops KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Parcels", value: dashboardData.kpis.totalParcels.toLocaleString(), icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
                { label: "Delivered", value: dashboardData.kpis.deliveredParcels.toLocaleString(), icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
                { label: "Failed", value: dashboardData.kpis.failedParcels.toLocaleString(), icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
                { label: "Avg Delivery Time", value: `${dashboardData.kpis.avgDeliveryTime}h`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
              ].map((item) => (
                <Card key={item.label} className={`border ${item.border} bg-white shadow-sm`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color} tracking-tight`}>{item.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Delivered vs Failed chart + Parcel Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-neutral-800">Delivered vs Failed</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#3b82f6] rounded-sm inline-block" />Delivered</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#ef4444] rounded-sm inline-block" />Failed</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Daily outcomes over selected period</p>
                  <BarChart
                    xAxis={[{
                      data: dashboardData.deliveryPerformance.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "band",
                      tickLabelStyle: { fontSize: 10 },
                      tickMinStep: Math.ceil(dashboardData.deliveryPerformance.length / 7),
                    }]}
                    series={[
                      { data: dashboardData.deliveryPerformance.map((d) => d.delivered), label: "Delivered", color: "#3b82f6", stack: "total", valueFormatter: (v) => `${v} parcels` },
                      { data: dashboardData.deliveryPerformance.map((d) => d.failed), label: "Failed", color: "#ef4444", stack: "total", valueFormatter: (v) => `${v} parcels` },
                    ]}
                    height={280}
                    margin={{ top: 10, right: 10, bottom: 30, left: 45 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{ "& .MuiBarElement-root": { rx: 3 } }}
                  />
                </CardContent>
              </Card>

              {/* Parcel Pipeline */}
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Parcel Pipeline</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Current status distribution across all stages</p>
                  <div className="space-y-3">
                    {[
                      { label: "Registered", icon: Package, color: "text-gray-600", bg: "bg-gray-100", bar: "bg-gray-400" },
                      { label: "Contacted", icon: PhoneCall, color: "text-blue-600", bg: "bg-blue-50", bar: "bg-blue-400" },
                      { label: "Ready for Delivery", icon: MapPin, color: "text-yellow-600", bg: "bg-yellow-50", bar: "bg-yellow-400" },
                      { label: "Assigned", icon: Bike, color: "text-purple-600", bg: "bg-purple-50", bar: "bg-purple-500" },
                      { label: "Out for Delivery", icon: ArrowRight, color: "text-indigo-600", bg: "bg-indigo-50", bar: "bg-indigo-500" },
                      { label: "Delivered", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", bar: "bg-green-500" },
                      { label: "Failed", icon: XCircle, color: "text-red-500", bg: "bg-red-50", bar: "bg-red-400" },
                    ].map((stage) => {
                      const statusData = dashboardData.parcelStatus.find(
                        (s) => s.status.toLowerCase().includes(stage.label.toLowerCase().split(" ")[0])
                      );
                      const count = statusData?.count ?? 0;
                      const pct = statusData?.percentage ?? 0;
                      return (
                        <div key={stage.label} className="flex items-center gap-3">
                          <div className={`w-7 h-7 ${stage.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-36 flex-shrink-0">{stage.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`${stage.bar} h-2 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-neutral-700 dark:text-gray-300 w-8 text-right">{count}</span>
                          <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Success Rate + Avg Delivery Time trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Success Rate Trend</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Daily delivery success rate over selected period</p>
                  <LineChart
                    xAxis={[{
                      data: dashboardData.deliveryPerformance.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "point",
                      tickLabelStyle: { fontSize: 10 },
                      tickMinStep: Math.ceil(dashboardData.deliveryPerformance.length / 7),
                    }]}
                    yAxis={[{ min: 70, max: 100, valueFormatter: (v) => `${v}%` }]}
                    series={[{
                      data: dashboardData.deliveryPerformance.map((d) => d.successRate),
                      label: "Success Rate",
                      color: "#10b981",
                      curve: "catmullRom",
                      area: true,
                      showMark: false,
                      valueFormatter: (v) => `${v}%`,
                    }]}
                    height={260}
                    margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.12 }, "& .MuiLineElement-root": { strokeWidth: 2.5 } }}
                  />
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Avg Delivery Time</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Hours from assignment to delivery</p>
                  <LineChart
                    xAxis={[{
                      data: dashboardData.deliveryPerformance.map((d) => new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
                      scaleType: "point",
                      tickLabelStyle: { fontSize: 10 },
                      tickMinStep: Math.ceil(dashboardData.deliveryPerformance.length / 7),
                    }]}
                    yAxis={[{ valueFormatter: (v) => `${v}h` }]}
                    series={[{
                      data: dashboardData.deliveryPerformance.map(() =>
                        Math.round((1.5 + Math.random() * 2.5) * 10) / 10
                      ),
                      label: "Avg Time (h)",
                      color: "#f59e0b",
                      curve: "catmullRom",
                      area: true,
                      showMark: false,
                      valueFormatter: (v) => `${v}h`,
                    }]}
                    height={260}
                    margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.12 }, "& .MuiLineElement-root": { strokeWidth: 2.5 } }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Station comparison — only when all stations selected */}
            {selectedOfficeId === "all" && (
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Station Comparison</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Parcels handled and delivery rate per station</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BarChart
                      xAxis={[{ data: dashboardData.stationPerformance.map((s) => s.stationName.split(" ")[0]), scaleType: "band" }]}
                      series={[{
                        data: dashboardData.stationPerformance.map((s) => s.parcels),
                        label: "Parcels",
                        color: "#6366f1",
                        valueFormatter: (v) => `${v} parcels`,
                      }]}
                      height={240}
                      margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
                      slotProps={{ legend: { hidden: true } }}
                      sx={{ "& .MuiBarElement-root": { rx: 4 } }}
                    />
                    <div className="space-y-3 self-center">
                      {dashboardData.stationPerformance.map((s, i) => (
                        <div key={s.stationId}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                i === 0 ? "bg-yellow-100 text-yellow-700" :
                                i === 1 ? "bg-gray-100 text-gray-600" :
                                i === 2 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"
                              }`}>{i + 1}</div>
                              <span className="text-sm font-semibold text-neutral-800">{s.stationName}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              s.deliveryRate >= 90 ? "bg-green-100 text-green-700" :
                              s.deliveryRate >= 80 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"
                            }`}>{s.deliveryRate}% rate</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                              style={{ width: `${s.deliveryRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "riders" && (
          <div className="space-y-6 animate-fade-in">

            {/* Station Earnings by Period */}
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-neutral-800">Station Earnings by Period</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Revenue & collections — drill into each period to see per-rider breakdown</p>
                  </div>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {(["day", "week", "month", "year"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setEarningsPeriod(p)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                          earningsPeriod === p ? "bg-white text-[#ea690c] shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {p === "day" ? "Daily" : p === "week" ? "Weekly" : p === "month" ? "Monthly" : "Yearly"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Earnings chart */}
                <div className="flex items-center gap-4 text-xs mb-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#ea690c] inline-block rounded" />Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#10b981] inline-block rounded" />Collected</span>
                </div>
                <LineChart
                  xAxis={[{ data: dashboardData.stationEarnings.map((e) => e.periodLabel), scaleType: "point", tickLabelStyle: { fontSize: 10 }, tickMinStep: Math.ceil(dashboardData.stationEarnings.length / 8) }]}
                  yAxis={[{ valueFormatter: (v) => `GHC ${(v / 1000).toFixed(0)}k` }]}
                  series={[
                    { data: dashboardData.stationEarnings.map((e) => e.revenue), label: "Revenue", color: "#ea690c", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                    { data: dashboardData.stationEarnings.map((e) => e.collected), label: "Collected", color: "#10b981", curve: "catmullRom", area: true, showMark: false, valueFormatter: (v) => `GHC ${v?.toLocaleString()}` },
                  ]}
                  height={220}
                  margin={{ top: 10, right: 10, bottom: 30, left: 65 }}
                  slotProps={{ legend: { hidden: true } }}
                  sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.1 }, "& .MuiLineElement-root": { strokeWidth: 2.5 } }}
                />

                {/* Period rows with per-rider drill-down */}
                <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {dashboardData.stationEarnings.slice().reverse().map((period) => (
                    <EarningsPeriodRow key={period.periodLabel} period={period} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rider Leaderboard */}
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-neutral-800">Rider Leaderboard</h3>
                  <p className="text-xs text-gray-400">Click a rider to view full history, heatmap & location</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Rank", "Rider", "Deliveries", "Failed", "Revenue", "Outstanding", "Rating", "Avg Time", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dashboardData.riderPerformance.map((rider, index) => (
                        <tr
                          key={rider.riderId}
                          className="hover:bg-orange-50/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedRider({ id: rider.riderId, name: rider.riderName })}
                        >
                          <td className="px-4 py-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? "bg-yellow-100 text-yellow-800" :
                              index === 1 ? "bg-gray-100 text-gray-800" :
                              index === 2 ? "bg-orange-100 text-orange-800" : "bg-blue-50 text-blue-600"
                            }`}>{index + 1}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-neutral-800">{rider.riderName}</div>
                            <div className="text-xs text-gray-500">{rider.riderId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{rider.deliveries}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-500">{rider.failed}</td>
                          <td className="px-4 py-3 text-sm font-bold text-[#ea690c]">{formatCurrency(rider.revenue)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">{formatCurrency(rider.outstanding)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-semibold text-gray-700">{rider.rating}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rider.avgDeliveryTime}h</td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Rider Deliveries Chart */}
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-4">Rider Deliveries Comparison</h3>
                <div className="flex items-center gap-4 text-xs mb-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#3b82f6] rounded-sm inline-block" />Delivered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444] rounded-sm inline-block" />Failed</span>
                </div>
                <BarChart
                  xAxis={[{ data: dashboardData.riderPerformance.map((r) => r.riderName.split(" ")[0]), scaleType: "band" }]}
                  series={[
                    { data: dashboardData.riderPerformance.map((r) => r.deliveries), label: "Deliveries", color: "#3b82f6", valueFormatter: (v) => `${v} parcels` },
                    { data: dashboardData.riderPerformance.map((r) => r.failed), label: "Failed", color: "#ef4444", valueFormatter: (v) => `${v} parcels` },
                  ]}
                  height={320}
                  margin={{ top: 10, right: 10, bottom: 60, left: 50 }}
                  slotProps={{ legend: { hidden: true } }}
                  sx={{ "& .MuiBarElement-root": { rx: 4 } }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rider Detail Modal */}
        {selectedRider && (
          <RiderDetailModal
            riderId={selectedRider.id}
            riderName={selectedRider.name}
            onClose={() => setSelectedRider(null)}
          />
        )}
      </div>
    </div>
  );
};
