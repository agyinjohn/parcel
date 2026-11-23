import React, { useEffect, useMemo, useState } from "react";
import {
  Loader,
  PackageIcon,
  MapPinIcon,
  Phone,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
  Building2,
  Globe,
  DownloadIcon,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { useLocation } from "../../../contexts/LocationContext";
import { useToast } from "../../../components/ui/toast";
import adminService from "../../../services/adminService";
import { formatCurrency, formatPhoneNumber } from "../../../utils/dataHelpers";

interface ReconciliationParcel {
  parcelId: string;
  parcelDescription?: string;
  receiverName?: string;
  receiverPhoneNumber?: string;
  receiverAddress?: string;
  parcelAmount: number;
  delivered: boolean;
  cancelled?: boolean;
  returned?: boolean;
  paymentMethod?: string | null;
  /** What the manager recorded at reconciliation (handoff Part K); undefined for older records. */
  managerAmount?: number;
  variance?: number;
  varianceReason?: string;
  varianceNote?: string;
}

interface RiderGroup {
  riderId: string;
  riderName: string;
  riderPhoneNumber?: string;
  deliveredParcels: ReconciliationParcel[];
  failedParcels: ReconciliationParcel[];
  totalDeliveredAmount: number;
  totalDeliveredCount: number;
  totalParcelsCount: number;
  totalFailedAmount: number;
  expectedAmount: number;
  assignmentIds: string[];
  /** Sum of what the manager recorded as handed over, when available. */
  managerAmount?: number;
}

export const AdminReconciliation = (): JSX.Element => {
  const { locations, stations } = useLocation();
  const { showToast } = useToast();

  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [rawAssignments, setRawAssignments] = useState<any[]>([]);
  const [expandedRiders, setExpandedRiders] = useState<Set<string>>(new Set());
  const [riderSearch, setRiderSearch] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthlySummaries, setMonthlySummaries] = useState<
    Record<string, { totalAmount: number; totalParcels: number; hasReconciliations: boolean }>
  >({});
  const [loadingMonth, setLoadingMonth] = useState(false);

  const isSingleStation =
    selectedLocationId !== "ALL" && selectedOfficeId !== "ALL" && !!selectedOfficeId;

  const getDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Filter offices based on selected location
  const filteredOffices = useMemo(() => {
    if (selectedLocationId === "ALL") {
      return stations;
    }
    const location = locations.find((l) => l.id === selectedLocationId);
    return location?.offices || [];
  }, [selectedLocationId, locations, stations]);

  // Reset office selection when location changes
  useEffect(() => {
    setSelectedOfficeId("");
    setRawAssignments([]);
    setMonthlySummaries({});
  }, [selectedLocationId]);

  const fetchReconciliations = async (
    locationId: string,
    officeId: string,
    date: Date
  ): Promise<void> => {
    if (!locationId || !officeId) return;
    setLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const dateInMillis = startOfDay.getTime();

      // Determine which offices to fetch based on location and office selection
      let officesToFetch: string[] = [];

      if (locationId === "ALL") {
        officesToFetch = [officeId];
      } else {
        const location = locations.find((l) => l.id === locationId);
        if (location) {
          officesToFetch = [officeId];
        }
      }

      if (officesToFetch.length === 0) {
        setRawAssignments([]);
        return;
      }

      // Fetch reconciliations for all selected offices
      const responses = await Promise.all(
        officesToFetch.map((officeId) =>
          adminService.getOfficeReconciliationsByDate(officeId, dateInMillis)
        )
      );

      const aggregated: any[] = [];
      responses.forEach((response, index) => {
        if (response.success && response.data) {
          const data = response.data as any;
          const content = Array.isArray(data) ? data : data.content || [];
          content.forEach((assignment: any) => {
            if (!assignment.officeId) {
              assignment.officeId = officesToFetch[index];
            }
            aggregated.push(assignment);
          });
        }
      });

      setRawAssignments(aggregated);
    } catch (error) {
      console.error("Failed to fetch admin reconciliations:", error);
      showToast(
        "Failed to load reconciliations. Please try again.",
        "error"
      );
      setRawAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLocationId && selectedOfficeId) {
      fetchReconciliations(selectedLocationId, selectedOfficeId, selectedDate);
    } else {
      setRawAssignments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, selectedOfficeId, selectedDate]);

  // Load monthly calendar data — only when a single specific station is selected
  useEffect(() => {
    if (!isSingleStation) {
      setMonthlySummaries({});
      return;
    }

    const loadMonthly = async () => {
      setLoadingMonth(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const summaries: Record<string, { totalAmount: number; totalParcels: number; hasReconciliations: boolean }> = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          date.setHours(0, 0, 0, 0);
          summaries[getDateKey(date)] = { totalAmount: 0, totalParcels: 0, hasReconciliations: false };
        }

        const datesToFetch: Date[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          date.setHours(0, 0, 0, 0);
          if (date <= today) datesToFetch.push(date);
        }

        await Promise.all(
          datesToFetch.map(async (date) => {
            const response = await adminService.getOfficeReconciliationsByDate(
              selectedOfficeId,
              date.getTime()
            );
            if (!response.success || !response.data) return;
            const data = response.data as any;
            const content: any[] = Array.isArray(data) ? data : data.content || [];
            let dayAmount = 0;
            let dayParcels = 0;
            content.forEach((assignment: any) => {
              (assignment.parcels || []).forEach((parcel: any) => {
                if (parcel.delivered && !parcel.returned) {
                  dayAmount += Math.round(Number(parcel.parcelAmount ?? parcel.amount ?? 0) || 0);
                  dayParcels++;
                }
              });
            });
            const key = getDateKey(date);
            summaries[key] = { totalAmount: dayAmount, totalParcels: dayParcels, hasReconciliations: dayParcels > 0 };
          })
        );

        setMonthlySummaries(summaries);
      } catch (err) {
        console.error("Failed to load monthly admin summaries:", err);
      } finally {
        setLoadingMonth(false);
      }
    };

    loadMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth.getFullYear(), selectedMonth.getMonth(), selectedOfficeId, isSingleStation]);

  const handleDownloadMonthlyPDF = () => {
    const monthLabel = selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const officeName = stations.find((s) => s.id === selectedOfficeId)?.name || selectedOfficeId;

    let cells = Array(firstDayOfWeek).fill("<td></td>").join("");
    let rows = "";
    let cellCount = firstDayOfWeek;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const summary = monthlySummaries[key];
      const isFuture = date > today;
      let bg = "#f9fafb", border = "#e5e7eb";
      if (isFuture) { bg = "#fff"; border = "#e5e7eb"; }
      else if (summary?.hasReconciliations) { bg = "#f0fdf4"; border = "#86efac"; }
      else if (summary) { bg = "#fef2f2"; border = "#fca5a5"; }
      cells += `<td style="padding:4px"><div style="background:${bg};border:1px solid ${border};border-radius:6px;padding:6px 4px;min-height:52px;text-align:center"><div style="font-weight:600;font-size:12px">${day}</div>${summary && summary.totalParcels > 0 ? `<div style="font-size:10px;color:#4b5563;margin-top:2px">${summary.totalParcels} parcels</div><div style="font-size:10px;font-weight:700;color:#16a34a">${formatCurrency(summary.totalAmount)}</div>` : "<div style=\"font-size:10px;color:#d1d5db;margin-top:2px\">&nbsp;</div>"}</div></td>`;
      cellCount++;
      if (cellCount % 7 === 0 || day === daysInMonth) {
        const rem = 7 - (cellCount % 7 === 0 ? 7 : cellCount % 7);
        if (day === daysInMonth && rem < 7) cells += "<td></td>".repeat(rem);
        rows += `<tr>${cells}</tr>`;
        cells = "";
      }
    }

    const monthTotal = Object.values(monthlySummaries).reduce((s, d) => s + d.totalAmount, 0);
    const monthParcels = Object.values(monthlySummaries).reduce((s, d) => s + d.totalParcels, 0);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Monthly Overview – ${monthLabel}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin-bottom:4px}p{font-size:12px;color:#555;margin:0 0 12px}table{width:100%;border-collapse:collapse}th{font-size:11px;font-weight:600;color:#6b7280;text-align:center;padding:4px 0}.totals{margin-top:14px;padding:10px 14px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;display:flex;gap:32px}.totals div{font-size:12px;color:#7c2d12}.totals strong{font-size:16px;color:#ea690c;display:block}.legend{display:flex;gap:16px;margin-top:12px;font-size:11px;color:#555}.legend span{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px;vertical-align:middle}@media print{body{margin:12px}}</style></head><body><h1>Monthly Overview – ${monthLabel}</h1><p>Station: ${officeName} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Total Parcels</span><strong>${monthParcels}</strong></div><div><span>Total Amount</span><strong>${formatCurrency(monthTotal)}</strong></div></div><div class="legend"><div><span style="background:#f0fdf4;border:1px solid #86efac"></span>Reconciliation approved</div><div><span style="background:#fef2f2;border:1px solid #fca5a5"></span>No parcels / no work</div></div><script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  // Group assignments by rider (same logic as ReconciliationHistory)
  const riderGroups = useMemo(() => {
    const groupsMap = new Map<string, RiderGroup>();

    rawAssignments.forEach((assignment: any) => {
      const riderId =
        assignment.riderInfo?.riderId || assignment.riderId || "unknown";
      const riderName =
        assignment.riderInfo?.riderName ||
        assignment.riderName ||
        "Unknown Rider";
      const riderPhoneNumber =
        assignment.riderInfo?.riderPhoneNumber || assignment.riderPhoneNumber;

      if (!groupsMap.has(riderId)) {
        groupsMap.set(riderId, {
          riderId,
          riderName,
          riderPhoneNumber,
          deliveredParcels: [],
          failedParcels: [],
          totalDeliveredAmount: 0,
          totalDeliveredCount: 0,
          totalParcelsCount: 0,
          totalFailedAmount: 0,
          expectedAmount: 0,
          assignmentIds: [],
        });
      }

      const group = groupsMap.get(riderId)!;

      if (assignment.assignmentId && !group.assignmentIds.includes(assignment.assignmentId)) {
        group.assignmentIds.push(assignment.assignmentId);
        if (assignment.amountPayed != null) group.managerAmount = (group.managerAmount ?? 0) + Number(assignment.amountPayed);
      }
      const lines: any[] = Array.isArray(assignment.reconciliationLines) ? assignment.reconciliationLines : [];

      if (assignment.parcels && Array.isArray(assignment.parcels)) {
        assignment.parcels.forEach((parcel: any) => {
          group.totalParcelsCount++;
          const delivered = parcel.delivered === true;
          const returned = parcel.returned === true;
          const amount = Math.round(Number(parcel.parcelAmount ?? parcel.amount ?? 0) || 0);

          if (delivered && !returned) {
            group.deliveredParcels.push({
              parcelId: parcel.parcelId,
              parcelDescription: parcel.parcelDescription,
              receiverName: parcel.receiverName,
              receiverPhoneNumber: parcel.receiverPhoneNumber,
              receiverAddress: parcel.receiverAddress,
              parcelAmount: amount,
              delivered: true,
              cancelled: false,
              returned: false,
              paymentMethod: parcel.paymentMethod,
              ...(() => {
                const line = lines.find((l) => l.parcelId === parcel.parcelId);
                return line
                  ? { managerAmount: Number(line.collectedAmount), variance: Number(line.variance), varianceReason: line.varianceReason, varianceNote: line.varianceNote }
                  : {};
              })(),
            });
            group.totalDeliveredAmount += amount;
            group.totalDeliveredCount++;
          } else if (returned) {
            group.failedParcels.push({
              parcelId: parcel.parcelId,
              parcelDescription: parcel.parcelDescription,
              receiverName: parcel.receiverName,
              receiverPhoneNumber: parcel.receiverPhoneNumber,
              receiverAddress: parcel.receiverAddress,
              parcelAmount: amount,
              delivered: false,
              cancelled: !!parcel.cancelled,
              returned: true,
              paymentMethod: parcel.paymentMethod,
            });
            group.totalFailedAmount += amount;
          }
        });
      }
    });

    const groups = Array.from(groupsMap.values())
      .filter((g) => g.deliveredParcels.length > 0)
      .sort((a, b) => a.riderName.localeCompare(b.riderName));

    groups.forEach((g) => {
      // Expected amount = delivered amount + failed amount (both rounded)
      g.expectedAmount = Math.round(g.totalDeliveredAmount + g.totalFailedAmount);
    });

    return groups;
  }, [rawAssignments]);

  const totalAmount = useMemo(
    () => riderGroups.reduce((sum, g) => sum + g.expectedAmount, 0),
    [riderGroups]
  );
  const totalParcels = useMemo(
    () => riderGroups.reduce((sum, g) => sum + g.totalDeliveredCount, 0),
    [riderGroups]
  );

  const filteredRiderGroups = useMemo(() => {
    const term = riderSearch.trim().toLowerCase();
    if (!term) return riderGroups;
    return riderGroups.filter((g) =>
      g.riderName.toLowerCase().includes(term)
    );
  }, [riderGroups, riderSearch]);

  const filteredTotalAmount = useMemo(
    () => filteredRiderGroups.reduce((sum, g) => sum + g.expectedAmount, 0),
    [filteredRiderGroups]
  );

  const filteredTotalParcels = useMemo(
    () => filteredRiderGroups.reduce((sum, g) => sum + g.totalDeliveredCount, 0),
    [filteredRiderGroups]
  );

  // Aggregate by office for admin overview (when viewing ALL)
  const officeAggregates = useMemo(() => {
    const map = new Map<
      string,
      { officeId: string; officeName: string; riders: number; deliveredParcels: number; amount: number }
    >();

    riderGroups.forEach((group) => {
      group.assignmentIds.forEach((assignmentId) => {
        const assignment = rawAssignments.find(
          (a) => a.assignmentId === assignmentId
        );
        const officeId = assignment?.officeId;
        if (!officeId) return;

        const existing = map.get(officeId);
        const officeName =
          stations.find((s) => s.id === officeId)?.name || officeId;

        if (!existing) {
          map.set(officeId, {
            officeId,
            officeName,
            riders: 1,
            deliveredParcels: group.totalDeliveredCount,
            amount: group.expectedAmount,
          });
        } else {
          existing.riders += 1;
          existing.deliveredParcels += group.totalDeliveredCount;
          existing.amount += group.expectedAmount;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.officeName.localeCompare(b.officeName)
    );
  }, [riderGroups, rawAssignments, stations]);

  const handleToggleRiderExpansion = (riderId: string) => {
    setExpandedRiders((prev) => {
      const next = new Set(prev);
      if (next.has(riderId)) next.delete(riderId);
      else next.add(riderId);
      return next;
    });
  };

  const selectedOfficeName = stations.find((s) => s.id === selectedOfficeId)?.name || "Select station";

  return (
    <div className="w-full">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <main className="flex-1 space-y-6">

          {/* Filters */}
          <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea690c] text-sm bg-white"
                    >
                      <option value="">Select Location</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Station
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={selectedOfficeId}
                      onChange={(e) => setSelectedOfficeId(e.target.value)}
                      disabled={!selectedLocationId}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea690c] text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Station</option>
                      <option disabled>──────────</option>
                      {filteredOffices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={getDateKey(selectedDate)}
                      max={getDateKey(new Date())}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [yy, mm, dd] = e.target.value.split("-").map(Number);
                        const d = new Date(yy, mm - 1, dd);
                        d.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const safe = d > today ? today : d;
                        setSelectedDate(safe);
                        setSelectedMonth(new Date(safe.getFullYear(), safe.getMonth(), 1));
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea690c] text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-semibold text-neutral-800">
                    Quick Actions
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => setSelectedDate(new Date())}
                      variant="outline"
                      size="sm"
                      className="border border-gray-300 text-neutral-800 hover:bg-gray-50 text-xs"
                    >
                      Today
                    </Button>
                    <Button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d);
                      }}
                      variant="outline"
                      size="sm"
                      className="border border-gray-300 text-neutral-800 hover:bg-gray-50 text-xs"
                    >
                      Prev
                    </Button>
                    <Button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        if (d <= new Date()) setSelectedDate(d);
                      }}
                      variant="outline"
                      size="sm"
                      className="border border-gray-300 text-neutral-800 hover:bg-gray-50 text-xs"
                      disabled={
                        new Date(selectedDate).setHours(23, 59, 59, 999) >=
                        new Date().getTime()
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    Filter by Rider
                  </label>
                  <input
                    type="text"
                    placeholder="Rider name..."
                    value={riderSearch}
                    onChange={(e) => setRiderSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Office:{" "}
                <span className="font-semibold text-neutral-800">
                  {selectedOfficeName}
                </span>
                {" • "}
                Date:{" "}
                <span className="font-semibold text-neutral-800">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Calendar — only when a single station is selected */}
          {isSingleStation && (
            <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#ea690c]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Monthly Overview</p>
                        <button
                          type="button"
                          onClick={handleDownloadMonthlyPDF}
                          disabled={loadingMonth}
                          title="Download as PDF"
                          className="inline-flex items-center gap-1 rounded-md border border-[#ea690c] px-2 py-0.5 text-[11px] font-medium text-[#ea690c] hover:bg-orange-50 disabled:opacity-40"
                        >
                          <DownloadIcon className="w-3 h-3" />
                          PDF
                        </button>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                        {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Click a day to load that day's data.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-2">
                    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
                      {([
                        ["Prev Year", () => setSelectedMonth(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))],
                        ["Prev Month", () => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))],
                        ["Next Month", () => {
                          const candidate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
                          const cap = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                          setSelectedMonth(candidate > cap ? cap : candidate);
                        }],
                        ["Next Year", () => {
                          const candidate = new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1);
                          const cap = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                          setSelectedMonth(candidate > cap ? cap : candidate);
                        }],
                      ] as [string, () => void][]).map(([label, handler]) => (
                        <Button key={label} type="button" variant="outline" className="h-8 px-2 border-gray-300 text-xs" onClick={handler}>
                          {label}
                        </Button>
                      ))}
                    </div>
                    {loadingMonth && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading monthly totals...
                      </div>
                    )}
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="space-y-2 overflow-x-auto">
                  <div className="min-w-[360px] grid grid-cols-7 text-[11px] font-semibold text-gray-500">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                      <div key={d} className="text-center">{d}</div>
                    ))}
                  </div>
                  {(() => {
                    const year = selectedMonth.getFullYear();
                    const month = selectedMonth.getMonth();
                    const firstDayOfWeek = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const weeks: JSX.Element[][] = [];
                    let currentWeek: JSX.Element[] = [];
                    for (let i = 0; i < firstDayOfWeek; i++) currentWeek.push(<div key={`e-${i}`} />);

                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(year, month, day);
                      date.setHours(0, 0, 0, 0);
                      const key = getDateKey(date);
                      const summary = monthlySummaries[key];
                      const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
                      const isFuture = date > today;

                      type V = "neutral" | "future" | "green" | "red";
                      let variant: V = "neutral";
                      if (isFuture) variant = "future";
                      else if (summary?.hasReconciliations) variant = "green";
                      else if (summary) variant = "red";

                      const cls: Record<V, { base: string; sel: string }> = {
                        neutral: { base: "border-transparent bg-gray-50 text-neutral-600 hover:bg-gray-100", sel: "border-gray-400 bg-gray-100 text-neutral-900" },
                        future:  { base: "border-dashed border-gray-200 bg-white text-gray-300", sel: "border-gray-400 bg-gray-50 text-gray-400" },
                        green:   { base: "border-green-300 bg-green-50 text-neutral-800 hover:bg-green-100", sel: "border-green-500 bg-green-100 text-green-900" },
                        red:     { base: "border-red-300 bg-red-50 text-neutral-700 hover:bg-red-100", sel: "border-red-500 bg-red-100 text-red-900" },
                      };

                      currentWeek.push(
                        <button
                          key={key}
                          type="button"
                          disabled={isFuture}
                          onClick={() => { if (!isFuture) setSelectedDate(date); }}
                          className={`flex flex-col items-center justify-between rounded-lg border px-1.5 py-1.5 text-xs transition-colors ${isFuture ? "cursor-not-allowed" : ""} ${isSelected ? cls[variant].sel : cls[variant].base}`}
                        >
                          <span className="font-semibold">{day}</span>
                          {summary && summary.totalParcels > 0 ? (
                            <div className="flex flex-col items-center leading-tight mt-0.5">
                              <span className="text-[10px] text-gray-600">{summary.totalParcels} parcels</span>
                              <span className="text-[10px] font-semibold text-green-700">{formatCurrency(summary.totalAmount)}</span>
                            </div>
                          ) : (
                            <span className="mt-0.5 text-[10px] text-gray-400">&nbsp;</span>
                          )}
                        </button>
                      );

                      if (currentWeek.length === 7 || day === daysInMonth) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                      }
                    }

                    return (
                      <div className="min-w-[360px] grid grid-rows-6 gap-1">
                        {weeks.map((week, i) => (
                          <div key={i} className="grid grid-cols-7 gap-1">{week}</div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded border border-green-400 bg-green-100 inline-block" />
                    <span>Reconciliation approved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded border border-red-400 bg-red-100 inline-block" />
                    <span>No parcels / no work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded border border-dashed border-gray-300 bg-white inline-block" />
                    <span>Future date</span>
                  </div>
                </div>

                {/* Monthly totals strip */}
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-orange-200 bg-orange-50/60 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-orange-800">Total Parcels This Month</p>
                    <p className="text-lg sm:text-xl font-bold text-[#ea690c]">
                      {Object.values(monthlySummaries).reduce((s, d) => s + d.totalParcels, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-orange-800">Total Amount This Month</p>
                    <p className="text-lg sm:text-xl font-bold text-green-700">
                      {formatCurrency(Object.values(monthlySummaries).reduce((s, d) => s + d.totalAmount, 0))}
                    </p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Showing:{" "}
                  <span className="font-semibold text-neutral-800">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {filteredRiderGroups.length > 0 && (
            <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
              <CardContent className="px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Riders (filtered)</p>
                    <p className="text-base font-bold text-[#ea690c]">
                      {filteredRiderGroups.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">
                      Delivered Parcels
                    </p>
                    <p className="text-base font-bold text-blue-600">
                      {filteredTotalParcels}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Total Amount</p>
                    <p className="text-base font-bold text-green-600">
                      {formatCurrency(filteredTotalAmount)}
                    </p>
                  </div>
                </div>

                {selectedOfficeId === "ALL" && officeAggregates.length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <p className="text-xs font-semibold text-neutral-800 mb-2">
                      Station overview (all offices)
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                              Office
                            </th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-700">
                              Riders
                            </th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-700">
                              Delivered
                            </th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-700">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {officeAggregates.map((office) => (
                            <tr key={office.officeId} className="border-t border-gray-100">
                              <td className="px-2 py-1.5 text-[11px] text-neutral-800">
                                {office.officeName}
                              </td>
                              <td className="px-2 py-1.5 text-[11px] text-right text-gray-700">
                                {office.riders}
                              </td>
                              <td className="px-2 py-1.5 text-[11px] text-right text-blue-700">
                                {office.deliveredParcels}
                              </td>
                              <td className="px-2 py-1.5 text-[11px] text-right text-green-700">
                                {formatCurrency(office.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignments Table (same layout as Manager Reconciliation) */}
          <Card className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <Loader className="w-10 h-10 text-[#ea690c] mx-auto mb-4 animate-spin" />
                  <p className="text-neutral-700 font-semibold text-lg">
                    Loading reconciliations...
                  </p>
                </div>
              ) : !selectedOfficeId ? (
                <div className="text-center py-12">
                  <p className="text-neutral-800 font-semibold text-lg mb-2">
                    Select an office
                  </p>
                  <p className="text-sm text-gray-500">
                    Choose an office to view reconciliation data.
                  </p>
                </div>
              ) : filteredRiderGroups.length === 0 ? (
                <div className="text-center py-12">
                  <PackageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-neutral-800 font-semibold text-lg mb-2">
                    No reconciliation data found
                  </p>
                  <p className="text-sm text-gray-500">
                    No delivered assignments found for the selected office and
                    date.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Rider
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Delivered Parcels
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          System amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Manager collected
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Variance
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Stats
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredRiderGroups.map((group, groupIndex) => {
                        const isExpanded = expandedRiders.has(group.riderId);
                        return (
                          <React.Fragment key={group.riderId}>
                            <tr
                              key={group.riderId}
                              className={`hover:bg-gray-50 transition-colors ${groupIndex !== riderGroups.length - 1
                                ? "border-b border-gray-200"
                                : ""
                                }`}
                            >
                              <td className="px-4 py-4 border-r border-gray-100">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleToggleRiderExpansion(group.riderId)
                                    }
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {isExpanded ? (
                                      <ChevronDownIcon className="w-4 h-4" />
                                    ) : (
                                      <ChevronRightIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-blue-500" />
                                    <div>
                                      <div className="text-sm font-semibold text-neutral-800">
                                        {group.riderName}
                                      </div>
                                      {group.riderPhoneNumber && (
                                        <div className="text-xs text-gray-500">
                                          {formatPhoneNumber(
                                            group.riderPhoneNumber
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                <div className="text-sm font-semibold text-blue-600">
                                  {group.totalDeliveredCount} /{" "}
                                  {group.totalParcelsCount}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Delivered / Total
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                <div className="text-sm font-bold text-[#ea690c]">
                                  {formatCurrency(group.expectedAmount)}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                {group.managerAmount != null ? (
                                  <div className="text-sm font-bold text-neutral-800">{formatCurrency(group.managerAmount)}</div>
                                ) : (
                                  <div className="text-xs text-gray-400">Not recorded</div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                {group.managerAmount != null ? (() => {
                                  const v = Math.round((group.managerAmount - group.expectedAmount) * 100) / 100;
                                  const withReason = group.deliveredParcels.filter((p) => p.variance && p.varianceReason).length;
                                  return (
                                    <>
                                      <div className={`text-sm font-bold ${v < 0 ? "text-red-600" : v > 0 ? "text-amber-600" : "text-gray-400"}`}>
                                        {v === 0 ? "None" : `${v > 0 ? "+" : ""}${formatCurrency(v)}`}
                                      </div>
                                      {withReason > 0 && <div className="text-xs text-gray-500">{withReason} with a reason</div>}
                                    </>
                                  );
                                })() : <div className="text-xs text-gray-400">—</div>}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                    {group.totalDeliveredCount} Delivered
                                  </Badge>
                                  {group.totalFailedAmount > 0 && (
                                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                                      {group.failedParcels.length} Failed
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="px-0 py-0">
                                  <div className="bg-gray-50 border-t border-gray-200">
                                    <table className="w-full">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Recipient
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Phone
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Location
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            System
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Manager
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Variance / reason
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Payment
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.deliveredParcels.map(
                                          (parcel, parcelIndex) => (
                                            <tr
                                              key={parcel.parcelId}
                                              className={
                                                parcelIndex !==
                                                  group.deliveredParcels.length - 1
                                                  ? "border-b border-gray-200"
                                                  : ""
                                              }
                                            >
                                              <td className="px-4 py-3">
                                                <div className="text-sm font-semibold text-neutral-800">
                                                  {parcel.receiverName || "N/A"}
                                                </div>
                                                {parcel.parcelDescription && (
                                                  <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                                                    {parcel.parcelDescription}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                {parcel.receiverPhoneNumber ? (
                                                  <a
                                                    href={`tel:${parcel.receiverPhoneNumber}`}
                                                    className="text-sm text-[#ea690c] hover:underline font-medium"
                                                  >
                                                    {formatPhoneNumber(
                                                      parcel.receiverPhoneNumber
                                                    )}
                                                  </a>
                                                ) : (
                                                  <span className="text-sm text-gray-400">
                                                    N/A
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                <div className="text-sm text-neutral-700">
                                                  {parcel.receiverAddress ? (
                                                    <div className="flex items-start gap-1">
                                                      <MapPinIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                      <span
                                                        className="truncate max-w-[200px]"
                                                        title={
                                                          parcel.receiverAddress
                                                        }
                                                      >
                                                        {
                                                          parcel.receiverAddress
                                                        }
                                                      </span>
                                                    </div>
                                                  ) : (
                                                    <span className="text-gray-400">
                                                      N/A
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-bold text-[#ea690c]">
                                                  {formatCurrency(
                                                    parcel.parcelAmount
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                {parcel.managerAmount != null
                                                  ? <div className="text-sm font-semibold text-neutral-800">{formatCurrency(parcel.managerAmount)}</div>
                                                  : <div className="text-xs text-gray-400">Not recorded</div>}
                                              </td>
                                              <td className="px-4 py-3 min-w-[200px]">
                                                {parcel.variance ? (
                                                  <>
                                                    <div className={`text-sm font-semibold ${parcel.variance < 0 ? "text-red-600" : "text-amber-600"}`}>
                                                      {parcel.variance > 0 ? "+" : ""}{formatCurrency(parcel.variance)}
                                                    </div>
                                                    <div className="text-xs text-neutral-700">{parcel.varianceReason ?? "No reason given"}</div>
                                                    {parcel.varianceNote && <div className="text-xs text-gray-500 italic">"{parcel.varianceNote}"</div>}
                                                  </>
                                                ) : (
                                                  <span className="text-xs text-gray-400">{parcel.managerAmount != null ? "None" : "—"}</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                <Badge
                                                  className={`${parcel.paymentMethod ===
                                                    "cash"
                                                    ? "bg-green-100 text-green-800"
                                                    : parcel.paymentMethod ===
                                                      "momo"
                                                      ? "bg-purple-100 text-purple-800"
                                                      : "bg-gray-100 text-gray-800"
                                                    } border text-xs`}
                                                >
                                                  {parcel.paymentMethod || "N/A"}
                                                </Badge>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                {parcel.receiverPhoneNumber && (
                                                  <Button
                                                    onClick={() =>
                                                      (window.location.href = `tel:${parcel.receiverPhoneNumber}`)
                                                    }
                                                    variant="outline"
                                                    className="border-green-300 text-green-600 hover:bg-green-50 text-xs px-2.5 py-1.5"
                                                    title={`Call ${parcel.receiverName || "recipient"}`}
                                                  >
                                                    <Phone className="w-3.5 h-3.5" />
                                                  </Button>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        )}
                                      </tbody>
                                    </table>

                                    {/* Failed (returned) parcels summary for this rider */}
                                    {group.failedParcels.length > 0 && (
                                      <div className="border-t border-red-300 bg-red-50 px-4 py-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                          <span className="text-sm font-semibold text-red-800">
                                            Failed (returned) parcels: {group.failedParcels.length}
                                          </span>
                                          <span className="text-sm font-semibold text-red-800">
                                            Failed amount:{" "}
                                            {formatCurrency(group.totalFailedAmount)}
                                          </span>
                                        </div>
                                        <table className="w-full text-xs">
                                          <thead className="bg-red-200 border-b border-red-300">
                                            <tr>
                                              <th className="px-2 py-1.5 text-left font-semibold text-red-900">
                                                Recipient
                                              </th>
                                              <th className="px-2 py-1.5 text-left font-semibold text-red-900">
                                                Phone
                                              </th>
                                              <th className="px-2 py-1.5 text-left font-semibold text-red-900">
                                                Location
                                              </th>
                                              <th className="px-2 py-1.5 text-right font-semibold text-red-900">
                                                Amount
                                              </th>
                                              <th className="px-2 py-1.5 text-center font-semibold text-red-900">
                                                Status
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {group.failedParcels.map((parcel) => (
                                              <tr
                                                key={parcel.parcelId}
                                                className="border-b border-red-200 bg-red-50/80"
                                              >
                                                <td className="px-2 py-1.5 text-[11px] text-red-900">
                                                  {parcel.receiverName || "N/A"}
                                                  {parcel.parcelDescription && (
                                                    <div className="text-[10px] text-red-700 truncate max-w-[150px]">
                                                      {parcel.parcelDescription}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="px-2 py-1.5 text-[11px] text-red-900">
                                                  {parcel.receiverPhoneNumber
                                                    ? formatPhoneNumber(parcel.receiverPhoneNumber)
                                                    : "N/A"}
                                                </td>
                                                <td
                                                  className="px-2 py-1.5 text-[11px] text-red-900 truncate max-w-[180px]"
                                                  title={parcel.receiverAddress}
                                                >
                                                  {parcel.receiverAddress || "N/A"}
                                                </td>
                                                <td className="px-2 py-1.5 text-right text-[11px] text-red-900 font-medium">
                                                  {formatCurrency(parcel.parcelAmount)}
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                  <Badge className="bg-red-600 text-white border-0 text-[10px] font-semibold">
                                                    Failed
                                                  </Badge>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};
