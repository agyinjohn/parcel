import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  Truck,
  Wallet,
  AlertCircle,
  Clock,
  Bike,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import adminService, { DashboardStats } from '../../../services/adminService';
import { useLocation } from '../../../contexts/LocationContext';

type Range = '7d' | '30d' | '90d';
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

const ghs = (n: number) => `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** % change against the previous period of the same length; null when there is nothing to compare. */
export const percentChange = (current: number, previous: number | undefined): number | null => {
  if (previous === undefined || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
};

/** "2026-11-20" -> "20 Nov"; anything else is shown as given. */
const shortDate = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const PIPELINE_STEPS: { key: keyof DashboardStats['parcelPipeline']; label: string; color: string }[] = [
  { key: 'registered', label: 'Registered', color: '#94a3b8' },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { key: 'readyForDelivery', label: 'Ready for delivery', color: '#8b5cf6' },
  { key: 'assigned', label: 'Assigned', color: '#f59e0b' },
  { key: 'outForDelivery', label: 'Out for delivery', color: '#ea690c' },
  { key: 'delivered', label: 'Delivered', color: '#10b981' },
  { key: 'failed', label: 'Failed', color: '#ef4444' },
];

const gradientMap: Record<string, string> = {
  'bg-blue-50': 'bg-gradient-to-br from-blue-50 to-blue-100/50',
  'bg-green-50': 'bg-gradient-to-br from-green-50 to-green-100/50',
  'bg-purple-50': 'bg-gradient-to-br from-purple-50 to-purple-100/50',
  'bg-orange-50': 'bg-gradient-to-br from-orange-50 to-orange-100/50',
  'bg-emerald-50': 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
  'bg-red-50': 'bg-gradient-to-br from-red-50 to-red-100/50',
  'bg-amber-50': 'bg-gradient-to-br from-amber-50 to-amber-100/50',
  'bg-indigo-50': 'bg-gradient-to-br from-indigo-50 to-indigo-100/50',
};

// Simple number animation hook replacement
const useCountUp = (endValue: number, duration: number = 1200) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setDisplayValue(Math.floor(endValue * progress));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, duration]);

  return displayValue;
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  rawValue?: number;
  change: number | null;
  icon: any;
  color: string;
  bgColor: string;
  prefix?: string;
  suffix?: string;
  rangeLabel?: string;
}> = ({ title, value, rawValue, change, icon: Icon, color, bgColor, prefix = '', suffix = '', rangeLabel = 'period' }) => {
  const animatedValue = useCountUp(rawValue || 0, 1200);
  const isPositive = (change ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const gradient = gradientMap[bgColor] || bgColor;

  return (
    <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      {/* Shine effect */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
            <p className={`text-3xl font-bold ${color} mb-1 tracking-tight`}>
              {rawValue ? `${prefix}${animatedValue.toLocaleString()}${suffix}` : value}
            </p>
            {change === null ? (
              <p className="text-xs text-gray-400 mt-2">No earlier figures to compare</p>
            ) : (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}%
                </span>
                <span className="text-xs text-gray-500">vs previous {rangeLabel}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
            <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform duration-300`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminStatistics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<Range>('30d');
  const [activeChart, setActiveChart] = useState<'revenue' | 'deliveries'>('revenue');
  const [officeId, setOfficeId] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [previous, setPrevious] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { stations, refreshLocations } = useLocation();

  useEffect(() => {
    if (stations.length === 0) refreshLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const span = RANGE_DAYS[timeRange] * DAY_MS;
    const endDate = Date.now();
    const startDate = endDate - span;
    const filters = { officeId: officeId || undefined };
    setLoading(true);
    setError(null);
    Promise.all([
      adminService.getDashboardStats({ ...filters, startDate, endDate }),
      // Same-length window just before, for the "vs previous" figures on the cards.
      adminService.getDashboardStats({ ...filters, startDate: startDate - span, endDate: startDate - 1 }),
    ]).then(([current, before]) => {
      if (cancelled) return;
      if (current.success && current.data) {
        setStats(current.data);
        setPrevious(before.success && before.data ? before.data : null);
      } else {
        setError(current.message || 'Failed to load dashboard figures.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [timeRange, officeId, reloadKey]);

  const num = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  const sumFailed = (d: DashboardStats | null) => (d?.deliveredVsFailed ?? []).reduce((s, x) => s + num(x.failed), 0);

  const revenueTrend = useMemo(
    () => (stats?.revenueVsCollected ?? []).map((d) => ({ date: shortDate(d.date), revenue: num(d.revenue), collected: num(d.collected) })),
    [stats],
  );
  const deliveryTrend = useMemo(
    () => (stats?.deliveredVsFailed ?? []).map((d) => ({ date: shortDate(d.date), delivered: num(d.delivered), failed: num(d.failed) })),
    [stats],
  );

  const rangeLabel = timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days';
  const prev = previous ?? undefined;
  const failedNow = sumFailed(stats);

  const statCards = stats
    ? [
        {
          title: 'Total Parcels',
          value: num(stats.totalParcels).toLocaleString(),
          rawValue: num(stats.totalParcels),
          change: percentChange(num(stats.totalParcels), prev && num(prev.totalParcels)),
          icon: Package,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          title: 'Total Revenue',
          value: ghs(num(stats.totalRevenue)),
          rawValue: num(stats.totalRevenue),
          change: percentChange(num(stats.totalRevenue), prev && num(prev.totalRevenue)),
          icon: DollarSign,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          prefix: 'GHS ',
        },
        {
          title: 'Collected',
          value: ghs(num(stats.collected)),
          rawValue: num(stats.collected),
          change: percentChange(num(stats.collected), prev && num(prev.collected)),
          icon: Wallet,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          prefix: 'GHS ',
        },
        {
          title: 'Outstanding',
          value: ghs(num(stats.outstanding)),
          rawValue: num(stats.outstanding),
          change: percentChange(num(stats.outstanding), prev && num(prev.outstanding)),
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          prefix: 'GHS ',
        },
        {
          title: 'Active Riders',
          value: num(stats.activeRiders).toString(),
          rawValue: num(stats.activeRiders),
          change: percentChange(num(stats.activeRiders), prev && num(prev.activeRiders)),
          icon: Users,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
        },
        {
          title: 'Delivery Success Rate',
          value: `${num(stats.successRate).toFixed(1)}%`,
          change: percentChange(num(stats.successRate), prev && num(prev.successRate)),
          icon: Truck,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        },
        {
          title: 'Failed Deliveries',
          value: failedNow.toString(),
          rawValue: failedNow,
          change: percentChange(failedNow, prev && sumFailed(previous)),
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        },
        {
          title: 'Driver Payments Owed',
          value: ghs(num(stats.driverPaymentsOwed)),
          rawValue: num(stats.driverPaymentsOwed),
          change: percentChange(num(stats.driverPaymentsOwed), prev && num(prev.driverPaymentsOwed)),
          icon: Bike,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          prefix: 'GHS ',
        },
      ]
    : [];

  const pipeline = stats?.parcelPipeline;
  const pipelineMax = pipeline ? Math.max(1, ...PIPELINE_STEPS.map((s) => num(pipeline[s.key]))) : 1;
  const topRiders = stats?.topRiders ?? [];
  const stationRows = stats?.stationSnapshot ?? [];

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <select
            id="dashboard-station"
            aria-label="Station"
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
          >
            <option value="">All stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${timeRange === range
                  ? 'bg-[#ea690c] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
              aria-label="Refresh figures"
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">
              Try again
            </button>
          </div>
        )}

        {!stats && loading && (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard…
          </div>
        )}

        {stats && (
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card, index) => (
                <div key={card.title} style={{ animation: `fadeInUp 0.6s ease-out ${index * 80}ms both` }}>
                  <StatCard {...card} rangeLabel={rangeLabel} />
                </div>
              ))}
            </div>

            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue & delivery trend */}
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-neutral-800">
                      {activeChart === 'revenue' ? 'Revenue vs Collected' : 'Delivered vs Failed'}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveChart('revenue')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${activeChart === 'revenue'
                          ? 'bg-[#ea690c] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        Revenue
                      </button>
                      <button
                        onClick={() => setActiveChart('deliveries')}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${activeChart === 'deliveries'
                          ? 'bg-[#ea690c] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        Deliveries
                      </button>
                    </div>
                  </div>
                  {(activeChart === 'revenue' ? revenueTrend : deliveryTrend).length === 0 ? (
                    <p className="h-[300px] flex items-center justify-center text-sm text-gray-500">No activity in this period.</p>
                  ) : activeChart === 'revenue' ? (
                    <BarChart
                      dataset={revenueTrend}
                      xAxis={[{ scaleType: 'band', dataKey: 'date' as const }]}
                      series={[
                        { dataKey: 'revenue', label: 'Revenue', color: '#ea690c', valueFormatter: (v: any) => ghs(v ?? 0) },
                        { dataKey: 'collected', label: 'Collected', color: '#10b981', valueFormatter: (v: any) => ghs(v ?? 0) },
                      ]}
                      height={300}
                      margin={{ top: 40, bottom: 30, left: 60, right: 10 }}
                    />
                  ) : (
                    <LineChart
                      dataset={deliveryTrend}
                      xAxis={[{ scaleType: 'band', dataKey: 'date' as const }]}
                      series={[
                        { dataKey: 'delivered' as const, label: 'Delivered', color: '#10b981', valueFormatter: (v: any) => `${v} delivered` },
                        { dataKey: 'failed' as const, label: 'Failed', color: '#ef4444', valueFormatter: (v: any) => `${v} failed` },
                      ]}
                      height={300}
                      margin={{ top: 40, bottom: 30, left: 50, right: 10 }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Parcel pipeline */}
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-neutral-800 mb-1">Parcel Pipeline</h2>
                  <p className="text-xs text-gray-500 mb-5">Where this period's parcels are now</p>
                  <div className="space-y-3">
                    {PIPELINE_STEPS.map((step) => {
                      const value = num(pipeline?.[step.key]);
                      return (
                        <div key={step.key} className="grid grid-cols-[130px_1fr_48px] items-center gap-3 text-sm">
                          <span className="text-gray-600">{step.label}</span>
                          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(value / pipelineMax) * 100}%`, backgroundColor: step.color }}
                            />
                          </div>
                          <span className="text-right font-semibold text-neutral-800 tabular-nums">{value.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Riders Performance */}
            <Card className="border border-[#d1d1d1] bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-neutral-800 mb-4">Top Performing Riders</h2>
                {topRiders.length === 0 ? (
                  <p className="text-sm text-gray-500">No deliveries in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-[#d1d1d1]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Rider Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Deliveries</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topRiders.map((rider, index) => (
                          <tr
                            key={rider.riderId || rider.riderName}
                            className={`border-b border-[#d1d1d1] hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : index === 1
                                    ? 'bg-gray-100 text-gray-700'
                                    : index === 2
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                              >
                                {index + 1}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-neutral-800">{rider.riderName}</td>
                            <td className="px-4 py-3 text-sm text-blue-600 font-medium">{num(rider.deliveries)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{ghs(num(rider.revenue))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station Performance Table */}
            <Card className="border border-[#d1d1d1] bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-neutral-800 mb-4">Station Performance</h2>
                {stationRows.length === 0 ? (
                  <p className="text-sm text-gray-500">No station figures for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-[#d1d1d1]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Station</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Parcels</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Success Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stationRows.map((station, index) => {
                          const rate = Math.max(0, Math.min(100, num(station.successRate)));
                          return (
                            <tr
                              key={station.officeId || station.stationName}
                              className={`border-b border-[#d1d1d1] hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                            >
                              <td className="px-4 py-3 text-sm font-semibold text-neutral-800">{station.stationName}</td>
                              <td className="px-4 py-3 text-sm text-neutral-700">{num(station.parcels).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">{ghs(num(station.revenue))}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${rate}%` }} />
                                  </div>
                                  <span className="text-sm font-medium text-neutral-700">{rate.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStatistics;
