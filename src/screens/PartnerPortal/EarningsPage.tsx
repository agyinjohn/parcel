import { useEffect, useState } from "react";
import { DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { formatCurrency } from "./partnerData";
import vendorService, { type VendorEarningsResponse } from "../../services/vendorService";

export const EarningsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VendorEarningsResponse | undefined>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const result = await vendorService.getEarnings();
      if (cancelled) return;
      if (!result.success) {
        setError(result.message);
      } else {
        setData(result.data);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const totalEarnable = data?.totalEarnable ?? 0;
  const totalCollected = data?.amountReady ?? 0;
  const totalPending = data?.pendingPayout ?? 0;
  const totalFailed = data?.failedDeliveriesCount ?? 0;
  const collectionPct = data?.collectionRate != null
    ? data.collectionRate
    : (totalEarnable > 0 ? (totalCollected / totalEarnable) * 100 : 0);

  const summaryCards = [
    { label: "Total Earnable", value: formatCurrency(totalEarnable), sub: "All POD parcels", icon: DollarSign, color: "text-[#ea690c]", bg: "bg-orange-50", border: "border-orange-200" },
    { label: "Amount Ready", value: formatCurrency(totalCollected), sub: "Collected by recipients", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    { label: "Pending Payout", value: formatCurrency(totalPending), sub: "Awaiting collection", icon: Clock, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Failed Deliveries", value: `${totalFailed} parcel${totalFailed !== 1 ? "s" : ""}`, sub: "Not delivered", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  ];

  const collectedParcels = data?.collectedParcels || [];

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-[#ea690c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading reconciliation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <Card key={c.label} className={`border ${c.border} shadow-sm`}>
            <CardContent className={`p-5 ${c.bg} rounded-xl`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color} mt-0.5`}>{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-[#d1d1d1] bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-800">Overall Collection Rate</h3>
              <p className="text-xs text-gray-400 mt-0.5">Percentage of earnable amount already collected</p>
            </div>
            <span className="text-2xl font-bold text-[#ea690c]">{Math.round(collectionPct)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[#ea690c] to-orange-400 transition-all duration-700"
              style={{ width: `${Math.min(collectionPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-green-600 font-medium">{formatCurrency(totalCollected)} collected</span>
            <span className="text-gray-400">of {formatCurrency(totalEarnable)} total earnable</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#d1d1d1] bg-white shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-neutral-800 mb-4">Reconciliation by Station</h3>
          <div className="space-y-4">
            {(data?.earningsByStation || []).length === 0 ? (
              <p className="text-sm text-gray-400">No station reconciliation data yet</p>
            ) : (
              (data?.earningsByStation || []).map(station => {
                const earned = station.collectedAmount ?? 0;
                const total = station.totalAmount ?? 0;
                const pct = total > 0 ? (earned / total) * 100 : 0;
                return (
                  <div key={station.officeId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-neutral-800">{station.officeName}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#ea690c]">{formatCurrency(earned)}</span>
                        <span className="text-xs text-gray-400 ml-1">/ {formatCurrency(total)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded-full bg-[#ea690c] transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {station.parcelCount ?? 0} parcel{(station.parcelCount ?? 0) !== 1 ? "s" : ""} · {Math.round(pct)}% collected
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#d1d1d1] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-800">Collected Parcels — Ready for Payout</h3>
            <p className="text-xs text-gray-400 mt-0.5">{collectedParcels.length} parcel{collectedParcels.length !== 1 ? "s" : ""} collected</p>
          </div>
          {collectedParcels.length > 0 && (
            <span className="text-base font-bold text-[#ea690c]">{formatCurrency(totalCollected)}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-gray-50">
            <thead className="bg-gray-50">
              <tr>
                {["Tracking ID", "Receiver", "Station", "Item Cost", "Delivery Fee", "Total", "Collected On"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {collectedParcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No collected parcels yet</p>
                  </td>
                </tr>
              ) : (
                collectedParcels.map(p => (
                  <tr key={p.parcelId} className="hover:bg-green-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-[#ea690c] bg-orange-50/50">{p.parcelId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-800">{p.receiverName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.stationName}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(p.itemCost ?? 0)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(p.deliveryFee ?? 0)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#ea690c]">{formatCurrency(p.total ?? ((p.itemCost ?? 0) + (p.deliveryFee ?? 0)))}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {collectedParcels.length > 0 && (
              <tfoot>
                <tr className="bg-orange-50 border-t border-orange-100">
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-neutral-800 text-right">Total Ready for Payout:</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#ea690c]">{formatCurrency(totalCollected)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};
