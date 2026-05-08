import React, { useState } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users,
  Truck,
  Fuel,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useCountUp } from '../../../hooks/useCountUp';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { exportService } from '../../../services/exportService';

// Static data for demonstration
const STATIC_DATA = {
  overview: {
    totalParcels: 2847,
    parcelGrowth: 12.5,
    totalRevenue: 45680.50,
    revenueGrowth: 8.3,
    activeRiders: 24,
    riderGrowth: 4.2,
    deliveryRate: 94.5,
    deliveryGrowth: 2.1,
    deliveryFees: 18450.00,
    deliveryFeeGrowth: 15.2,
    fuelCosts: 3240.00,
    fuelCostGrowth: -5.3,
    failedDeliveries: 156,
    failedGrowth: -8.1,
    avgDeliveryTime: 2.4,
    avgTimeGrowth: -12.5,
  },
  stations: [
    { id: '1', name: 'Peugeot Station', parcels: 856, revenue: 15240.00, deliveries: 812, failed: 44 },
    { id: '2', name: 'Kumasi Station', parcels: 742, revenue: 13890.50, deliveries: 701, failed: 41 },
    { id: '3', name: 'Takoradi Station', parcels: 623, revenue: 9850.00, deliveries: 590, failed: 33 },
    { id: '4', name: 'Tamale Station', parcels: 426, revenue: 6700.00, deliveries: 402, failed: 24 },
    { id: '5', name: 'Cape Coast Station', parcels: 200, revenue: 3200.00, deliveries: 189, failed: 11 },
  ],
  dailyTrend: [
    { date: 'Mon', parcels: 145, revenue: 2340, deliveries: 138, failed: 7 },
    { date: 'Tue', parcels: 168, revenue: 2680, deliveries: 159, failed: 9 },
    { date: 'Wed', parcels: 192, revenue: 3120, deliveries: 182, failed: 10 },
    { date: 'Thu', parcels: 156, revenue: 2490, deliveries: 148, failed: 8 },
    { date: 'Fri', parcels: 203, revenue: 3280, deliveries: 195, failed: 8 },
    { date: 'Sat', parcels: 178, revenue: 2850, deliveries: 169, failed: 9 },
    { date: 'Sun', parcels: 134, revenue: 2140, deliveries: 127, failed: 7 },
  ],
  parcelTypes: [
    { name: 'POD', value: 1820, percentage: 64 },
    { name: 'Non-POD', value: 1027, percentage: 36 },
  ],
  deliveryMethods: [
    { name: 'Home Delivery', value: 2145, percentage: 75 },
    { name: 'Pickup', value: 702, percentage: 25 },
  ],
  topRiders: [
    { name: 'Kwame Mensah', deliveries: 234, revenue: 3780.00, rating: 4.8 },
    { name: 'Ama Serwaa', deliveries: 218, revenue: 3520.00, rating: 4.9 },
    { name: 'Kofi Asante', deliveries: 201, revenue: 3240.00, rating: 4.7 },
    { name: 'Abena Osei', deliveries: 189, revenue: 3050.00, rating: 4.6 },
    { name: 'Yaw Boateng', deliveries: 176, revenue: 2840.00, rating: 4.8 },
  ],
};

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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  rawValue?: number;
  change: number;
  icon: any;
  color: string;
  bgColor: string;
  prefix?: string;
  suffix?: string;
}> = ({ title, value, rawValue, change, icon: Icon, color, bgColor, prefix = '', suffix = '' }) => {
  const animatedValue = useCountUp(rawValue || 0, 1200);
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const gradient = gradientMap[bgColor] || bgColor;

  return (
    <Card className="group relative overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 ease-out cursor-pointer">
      {/* Shine effect */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
            <p className={`text-3xl font-bold ${color} mb-1 tracking-tight`}>
              {rawValue ? `${prefix}${animatedValue.toLocaleString()}${suffix}` : value}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs last period</span>
            </div>
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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeChart, setActiveChart] = useState<'revenue' | 'deliveries' | 'types'>('revenue');

  const { overview } = STATIC_DATA;

  const COLORS = ['#ea690c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

  const handleExport = (format: 'pdf' | 'excel', type: 'stations' | 'riders') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${type === 'stations' ? 'Station' : 'Rider'}_Performance_${timestamp}`;

    if (type === 'stations') {
      const columns = [
        { header: 'Station', key: 'name', width: 25 },
        { header: 'Parcels', key: 'parcels', width: 12 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Delivered', key: 'deliveries', width: 12 },
        { header: 'Failed', key: 'failed', width: 10 },
        { header: 'Success Rate', key: 'successRate', width: 15 },
      ];
      const data = STATIC_DATA.stations.map(s => ({
        name: s.name,
        parcels: s.parcels,
        revenue: `GHS ${s.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        deliveries: s.deliveries,
        failed: s.failed,
        successRate: `${((s.deliveries / s.parcels) * 100).toFixed(1)}%`,
      }));
      const options = {
        title: 'Station Performance Report',
        subtitle: `System Statistics — ${timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}`,
        columns,
        data,
        filename,
      };
      format === 'pdf' ? exportService.exportToPDF(options) : exportService.exportToExcel(options);
    } else {
      const columns = [
        { header: 'Rank', key: 'rank', width: 8 },
        { header: 'Rider Name', key: 'name', width: 20 },
        { header: 'Deliveries', key: 'deliveries', width: 12 },
        { header: 'Revenue', key: 'revenue', width: 15 },
        { header: 'Rating', key: 'rating', width: 10 },
      ];
      const data = STATIC_DATA.topRiders.map((r, i) => ({
        rank: i + 1,
        name: r.name,
        deliveries: r.deliveries,
        revenue: `GHS ${r.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        rating: r.rating,
      }));
      const options = {
        title: 'Top Riders Performance Report',
        subtitle: `System Statistics — ${timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}`,
        columns,
        data,
        filename,
      };
      format === 'pdf' ? exportService.exportToPDF(options) : exportService.exportToExcel(options);
    }
  };

  const statCards = [
    {
      title: 'Total Parcels',
      value: overview.totalParcels.toLocaleString(),
      rawValue: overview.totalParcels,
      change: overview.parcelGrowth,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Revenue',
      value: `GHS ${overview.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      rawValue: overview.totalRevenue,
      change: overview.revenueGrowth,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      prefix: 'GHS ',
    },
    {
      title: 'Active Riders',
      value: overview.activeRiders.toString(),
      rawValue: overview.activeRiders,
      change: overview.riderGrowth,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Delivery Rate',
      value: `${overview.deliveryRate}%`,
      change: overview.deliveryGrowth,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Delivery Fees',
      value: `GHS ${overview.deliveryFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      rawValue: overview.deliveryFees,
      change: overview.deliveryFeeGrowth,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      prefix: 'GHS ',
    },
    {
      title: 'Fuel Costs',
      value: `GHS ${overview.fuelCosts.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      rawValue: overview.fuelCosts,
      change: overview.fuelCostGrowth,
      icon: Fuel,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      prefix: 'GHS ',
    },
    {
      title: 'Failed Deliveries',
      value: overview.failedDeliveries.toString(),
      rawValue: overview.failedDeliveries,
      change: overview.failedGrowth,
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Avg Delivery Time',
      value: `${overview.avgDeliveryTime}h`,
      change: overview.avgTimeGrowth,
      icon: Truck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">System Statistics</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Overall performance across all stations
            </p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-[#ea690c] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <div key={card.title} className="animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
              <StatCard {...card} />
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Parcel Trend */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-neutral-800">Revenue & Parcel Trend</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChart('revenue')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      activeChart === 'revenue'
                        ? 'bg-[#ea690c] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setActiveChart('deliveries')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      activeChart === 'deliveries'
                        ? 'bg-[#ea690c] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Deliveries
                  </button>
                </div>
              </div>
              {activeChart === 'revenue' ? (
                <BarChart
                  dataset={STATIC_DATA.dailyTrend}
                  xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: { fontSize: 12 } }]}
                  series={[{
                    dataKey: 'revenue',
                    label: 'Revenue',
                    color: '#ea690c',
                    valueFormatter: (v) => `GHS ${v?.toLocaleString()}`,
                  }]}
                  height={300}
                  margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
                  sx={{
                    '& .MuiBarElement-root': { transition: 'opacity 0.3s', '&:hover': { opacity: 0.8 } },
                  }}
                />
              ) : (
                <LineChart
                  dataset={STATIC_DATA.dailyTrend}
                  xAxis={[{ scaleType: 'band', dataKey: 'date', tickLabelStyle: { fontSize: 12 } }]}
                  series={[
                    { dataKey: 'deliveries', label: 'Delivered', color: '#10b981', curve: 'catmullRom', showMark: true, valueFormatter: (v) => `${v} deliveries` },
                    { dataKey: 'failed', label: 'Failed', color: '#ef4444', curve: 'catmullRom', showMark: true, valueFormatter: (v) => `${v} failed` },
                  ]}
                  height={300}
                  margin={{ top: 10, bottom: 30, left: 50, right: 10 }}
                  sx={{
                    '& .MuiLineElement-root': { strokeWidth: 3 },
                    '& .MuiMarkElement-root': { transition: 'scale 0.2s ease', '&:hover': { scale: '1.5' } },
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Parcel Types & Delivery Methods */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-neutral-800">Distribution Analysis</h2>
                <button
                  onClick={() => setActiveChart(activeChart === 'types' ? 'revenue' : 'types')}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Toggle View
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Parcel Types</h3>
                  <PieChart
                    series={[{
                      data: STATIC_DATA.parcelTypes.map((item, i) => ({ id: i, value: item.value, label: item.name, color: COLORS[i] })),
                      innerRadius: 40,
                      outerRadius: 70,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      highlightScope: { faded: 'global', highlighted: 'item' },
                      faded: { innerRadius: 30, additionalRadius: -10, color: 'gray' },
                    }]}
                    height={200}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2 mt-2">
                    {STATIC_DATA.parcelTypes.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Delivery Methods</h3>
                  <PieChart
                    series={[{
                      data: STATIC_DATA.deliveryMethods.map((item, i) => ({ id: i, value: item.value, label: item.name, color: COLORS[i + 2] })),
                      innerRadius: 40,
                      outerRadius: 70,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      highlightScope: { faded: 'global', highlighted: 'item' },
                      faded: { innerRadius: 30, additionalRadius: -10, color: 'gray' },
                    }]}
                    height={200}
                    slotProps={{ legend: { hidden: true } }}
                  />
                  <div className="space-y-2 mt-2">
                    {STATIC_DATA.deliveryMethods.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index + 2] }} />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-neutral-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Riders Performance */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Top Performing Riders</h2>
              <div className="flex gap-2">
                <Button onClick={() => handleExport('pdf', 'riders')} size="sm" className="bg-[#ea690c] hover:bg-[#d45e0a]">
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
                <Button onClick={() => handleExport('excel', 'riders')} size="sm" variant="outline" className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50">
                  <Download className="w-3 h-3 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Rider Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Deliveries
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {STATIC_DATA.topRiders.map((rider, index) => (
                    <tr
                      key={rider.name}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0
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
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-gray-200">
                        {rider.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {rider.deliveries}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                        GHS {rider.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-amber-600">★</span>
                          <span className="text-sm font-semibold text-neutral-800 dark:text-gray-200">
                            {rider.rating}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Station Performance Table */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-800">Station Performance</h2>
              <div className="flex gap-2">
                <Button onClick={() => handleExport('pdf', 'stations')} size="sm" className="bg-[#ea690c] hover:bg-[#d45e0a]">
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
                <Button onClick={() => handleExport('excel', 'stations')} size="sm" variant="outline" className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50">
                  <Download className="w-3 h-3 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Station
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Parcels
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Delivered
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Failed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {STATIC_DATA.stations.map((station, index) => {
                    const successRate = ((station.deliveries / station.parcels) * 100).toFixed(1);
                    return (
                      <tr
                        key={station.id}
                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-gray-200">
                          {station.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">
                          {station.parcels.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                          GHS {station.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {station.deliveries}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 font-medium">
                          {station.failed}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${successRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-neutral-700">
                              {successRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStatistics;
