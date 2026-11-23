import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUpIcon, CalendarIcon, ChevronDown, ChevronUp, InfoIcon, Wallet } from "lucide-react";
import { BottomSheet, CardSkeleton, EmptyState } from "../../components/rider/RiderUI";
import { formatCurrency } from "../../utils/dataHelpers";
import riderService, { RiderAssignmentResponse } from "../../services/riderService";
import { useToast } from "../../components/ui/toast";

const RIDER_SHARE = 0.6;

export const RiderEarnings = (): JSX.Element => {
    const { showToast } = useToast();
    const [assignments, setAssignments] = useState<RiderAssignmentResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await riderService.getAssignments(0, 100);
            if (response.success && response.data) {
                const data = response.data as any;
                let list: RiderAssignmentResponse[] = [];
                if (data.content && Array.isArray(data.content)) list = data.content;
                else if (Array.isArray(data)) list = data;
                else if (Array.isArray(response.data)) list = response.data;
                setAssignments(list);
            } else {
                showToast(response.message || "Failed to load earnings", "error");
            }
        } catch {
            showToast("Failed to load earnings. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    // Rider earns 60% of deliveryCost only — no share of inboundCost (that belongs to the driver)
    const getRiderEarning = (a: RiderAssignmentResponse) => {
        const p = a.parcel;
        return (p.deliveryCost || 0) * RIDER_SHARE;
    };

    const getAmount = (a: RiderAssignmentResponse) => {
        const p = a.parcel;
        return (p.deliveryCost || 0) + (p.pickUpCost || 0) + (p.inboundCost || 0) + (p.storageCost || 0);
    };

    const getDate = (a: RiderAssignmentResponse) =>
        a.completedAt ? new Date(a.completedAt) : a.assignedAt ? new Date(a.assignedAt) : null;

    const deliveredAssignments = useMemo(() =>
        assignments.filter(a => a.parcel?.delivered), [assignments]);

    const todayStart = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const todayEnd = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }, []);

    const todayAssignments = useMemo(() =>
        deliveredAssignments.filter(a => {
            const d = getDate(a);
            return d && d >= todayStart && d <= todayEnd;
        }), [deliveredAssignments, todayStart, todayEnd]);

    const todayTotal = useMemo(() =>
        todayAssignments.reduce((s, a) => s + getRiderEarning(a), 0), [todayAssignments]);

    const overallTotal = useMemo(() =>
        deliveredAssignments.reduce((s, a) => s + getRiderEarning(a), 0), [deliveredAssignments]);

    const filteredAssignments = useMemo(() => {
        if (!startDate && !endDate) return deliveredAssignments;
        return deliveredAssignments.filter(a => {
            const d = getDate(a);
            if (!d) return false;
            if (startDate && d < new Date(startDate)) return false;
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
            return true;
        });
    }, [deliveredAssignments, startDate, endDate]);

    const groupedByDate = useMemo(() => {
        const groups: Record<string, RiderAssignmentResponse[]> = {};
        filteredAssignments.forEach(a => {
            const d = getDate(a);
            const key = d ? d.toDateString() : "Unknown";
            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });
        const sortedDates = Object.keys(groups).sort((a, b) => {
            if (a === "Unknown") return 1;
            if (b === "Unknown") return -1;
            return new Date(b).getTime() - new Date(a).getTime();
        });
        return { groups, sortedDates };
    }, [filteredAssignments]);

    const toggleCollapse = (key: string) => {
        setCollapsedDates(prev => {
            const s = new Set(prev);
            s.has(key) ? s.delete(key) : s.add(key);
            return s;
        });
    };

    const formatDateHeader = (key: string) => {
        if (key === "Unknown") return "Unknown Date";
        const d = new Date(key);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return "Today";
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
        return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };

    const [filtersOpen, setFiltersOpen] = useState(false);
    const filteredTotal = filteredAssignments.reduce((s, a) => s + getRiderEarning(a), 0);
    const filterCount = (startDate ? 1 : 0) + (endDate ? 1 : 0);

    return (
        <div className="space-y-5">
            {/* Earnings summary */}
            <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
                <p className="text-sm text-gray-500">Earned today</p>
                <p className="text-4xl font-bold tracking-tight mt-1">{formatCurrency(todayTotal)}</p>
                <p className="text-sm text-gray-500 mt-1">
                    {todayAssignments.length} deliver{todayAssignments.length === 1 ? "y" : "ies"} today
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gray-50 px-3.5 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">All time</p>
                        <p className="text-lg font-bold">{formatCurrency(overallTotal)}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-3.5 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Deliveries</p>
                        <p className="text-lg font-bold">{deliveredAssignments.length}</p>
                    </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-4">
                    <InfoIcon className="w-3.5 h-3.5" /> You earn {Math.round(RIDER_SHARE * 100)}% of each delivery fee.
                </p>
            </section>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-bold">Earnings by day</h2>
                    {filterCount > 0 && (
                        <p className="text-xs text-gray-500">
                            {formatCurrency(filteredTotal)} in range ·{" "}
                            <button className="text-[#ea690c] font-semibold" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear</button>
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setFiltersOpen(true)}
                    className="h-10 px-3.5 rounded-xl bg-white border border-gray-200 text-sm font-medium flex items-center gap-1.5 active:scale-95"
                >
                    <CalendarIcon className="w-4 h-4" /> {filterCount > 0 ? "Dates set" : "Dates"}
                </button>
            </div>

            {loading && assignments.length === 0 ? (
                <CardSkeleton />
            ) : groupedByDate.sortedDates.length === 0 ? (
                <EmptyState icon={<Wallet className="w-8 h-8" />} title="No earnings yet" hint="Delivered parcels add to your earnings." />
            ) : (
                <div className="space-y-5">
                    {groupedByDate.sortedDates.map((key) => {
                        const items = groupedByDate.groups[key];
                        const collapsed = collapsedDates.has(key);
                        const dayEarning = items.reduce((s, a) => s + getRiderEarning(a), 0);
                        return (
                            <section key={key}>
                                <button
                                    onClick={() => toggleCollapse(key)}
                                    className="w-full flex items-center justify-between px-1 mb-2"
                                    aria-expanded={!collapsed}
                                >
                                    <span className="text-sm font-bold">{formatDateHeader(key)}</span>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                                        +{formatCurrency(dayEarning)}
                                        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                                    </span>
                                </button>
                                {!collapsed && (
                                    <ul className="rounded-3xl bg-white divide-y divide-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
                                        {items.map((a) => {
                                            const d = getDate(a);
                                            return (
                                                <li key={`${a.assignmentId}-${a.parcel.parcelId}`} className="flex items-center gap-3 px-4 py-3.5">
                                                    <span className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                                                        <TrendingUpIcon className="w-4 h-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium truncate">{a.parcel.receiverName || "Delivery"}</p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""} · Fee {formatCurrency(a.parcel.deliveryCost || 0)} · Collected {formatCurrency(getAmount(a))}
                                                        </p>
                                                    </div>
                                                    <span className="font-semibold text-sm">+{formatCurrency(getRiderEarning(a))}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            <BottomSheet
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Choose dates"
                footer={
                    <button onClick={() => setFiltersOpen(false)} className="w-full h-12 rounded-2xl bg-[#ea690c] text-white font-semibold">
                        Done
                    </button>
                }
            >
                <div className="space-y-4 pb-2">
                    <label className="block">
                        <span className="text-sm font-semibold">From</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white" />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold">To</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white" />
                    </label>
                </div>
            </BottomSheet>
        </div>
    );
};
