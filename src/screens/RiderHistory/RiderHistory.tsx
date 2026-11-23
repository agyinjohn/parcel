import { useState, useEffect, useMemo, useCallback } from "react";
import {
    PackageIcon,
    CheckCircleIcon,
    SearchIcon,
    ChevronDown,
    ChevronUp,
    Download,
    SlidersHorizontal,
} from "lucide-react";
import { formatPhoneNumber, formatCurrency, phoneMatchesSearch } from "../../utils/dataHelpers";
import riderService, { RiderAssignmentResponse } from "../../services/riderService";
import { useToast } from "../../components/ui/toast";
import { generateHistoryPDF } from "../../utils/pdfGenerator";
import { useStation } from "../../contexts/StationContext";
import { BottomSheet, CardSkeleton, EmptyState, ParcelDetails, parcelTotal, timeOf } from "../../components/rider/RiderUI";

export const RiderHistory = (): JSX.Element => {
    const { showToast } = useToast();
    const { currentUser } = useStation();
    const [assignments, setAssignments] = useState<RiderAssignmentResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<RiderAssignmentResponse | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch with a large page size to get all history (or implement pagination)
            const response = await riderService.getAssignments(0, 100);
            console.log('RiderHistory fetch response:', response);

            if (response.success && response.data) {
                const data = response.data as any;
                // Handle both paginated response (with content) and direct array
                let assignmentsList: RiderAssignmentResponse[] = [];

                if (data.content && Array.isArray(data.content)) {
                    // Paginated response structure
                    assignmentsList = data.content;
                    console.log('Using paginated content, found', assignmentsList.length, 'assignments');
                } else if (Array.isArray(data)) {
                    // Direct array response
                    assignmentsList = data;
                    console.log('Using direct array, found', assignmentsList.length, 'assignments');
                } else if (Array.isArray(response.data)) {
                    assignmentsList = response.data;
                    console.log('Using response.data as array, found', assignmentsList.length, 'assignments');
                } else {
                    console.warn('Unexpected data structure in RiderHistory:', data);
                    assignmentsList = [];
                }

                console.log('Setting assignments:', assignmentsList.length);
                setAssignments(assignmentsList);
            } else {
                console.error('Failed response:', response);
                showToast(response.message || "Failed to load history", "error");
                setAssignments([]);
            }
        } catch (error) {
            console.error("Failed to fetch assignments:", error);
            showToast("Failed to load history. Please try again.", "error");
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    // Filter only completed/delivered assignments based on parcel-level delivery status
    // Backend assignment.status is unreliable, so we rely on parcel.delivered
    const completedAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) {
            console.warn('Assignments is not an array:', assignments);
            return [];
        }
        return assignments.filter(a => a.parcel?.delivered);
    }, [assignments]);

    // Filter returned assignments
    const returnedAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) {
            return [];
        }
        return assignments.filter(a => a.parcel?.returned || a.status === "RETURNED");
    }, [assignments]);

    // Filter and search assignments
    const filteredAssignments = useMemo(() => {
        let filtered = completedAssignments;

        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.trim();
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(assignment => {
                const parcel = assignment.parcel;
                return (
                    parcel.parcelId?.toLowerCase().includes(searchLower) ||
                    parcel.receiverName?.toLowerCase().includes(searchLower) ||
                    // Use phoneMatchesSearch for phone numbers (handles various formats - +233, spaces, leading 0, etc.)
                    phoneMatchesSearch(parcel.recieverPhoneNumber, search) ||
                    phoneMatchesSearch(parcel.senderPhoneNumber, search) ||
                    parcel.receiverAddress?.toLowerCase().includes(searchLower) ||
                    parcel.parcelDescription?.toLowerCase().includes(searchLower) ||
                    parcel.senderName?.toLowerCase().includes(searchLower)
                );
            });
        }

        // Apply date range filter
        if (startDate || endDate) {
            filtered = filtered.filter(assignment => {
                const assignmentDate = assignment.completedAt 
                    ? new Date(assignment.completedAt)
                    : assignment.assignedAt 
                        ? new Date(assignment.assignedAt)
                        : null;
                
                if (!assignmentDate) return false;

                const assignmentDateOnly = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
                
                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (assignmentDateOnly < start) return false;
                }
                
                // If endDate is not selected, use current day
                const end = endDate ? new Date(endDate) : new Date();
                end.setHours(23, 59, 59, 999);
                if (assignmentDateOnly > end) return false;
                
                return true;
            });
        }

        return filtered;
    }, [completedAssignments, searchTerm, startDate, endDate]);

    const handleDownloadPDF = () => {
        try {
            if (filteredAssignments.length === 0) {
                showToast("No assignments to download", "warning");
                return;
            }

            // Group assignments by date for PDF
            const assignmentsByDate: Record<string, RiderAssignmentResponse[]> = {};
            filteredAssignments.forEach(assignment => {
                const dateKey = assignment.completedAt 
                    ? new Date(assignment.completedAt).toDateString()
                    : assignment.assignedAt 
                        ? new Date(assignment.assignedAt).toDateString()
                        : 'Unknown';
                
                if (!assignmentsByDate[dateKey]) {
                    assignmentsByDate[dateKey] = [];
                }
                assignmentsByDate[dateKey].push(assignment);
            });

            // Sort dates
            const sortedDates = Object.keys(assignmentsByDate).sort((a, b) => {
                if (a === 'Unknown') return 1;
                if (b === 'Unknown') return -1;
                return new Date(b).getTime() - new Date(a).getTime();
            });

            // Generate PDF data grouped by date
            const allPdfData: Array<{ date: string; data: any[] }> = [];
            
            sortedDates.forEach(dateKey => {
                const dateAssignments = assignmentsByDate[dateKey];
                const pdfData = dateAssignments.map(assignment => {
                    const parcel = assignment.parcel;
                    const totalAmount = (parcel.deliveryCost || 0) + (parcel.pickUpCost || 0) +
                        (parcel.inboundCost || 0) + (parcel.storageCost || 0);

                    const location = parcel.homeDelivery && parcel.receiverAddress 
                        ? parcel.receiverAddress 
                        : parcel.shelfName 
                            ? `Shelf: ${parcel.shelfName}` 
                            : 'N/A';

                    return {
                        parcelId: parcel.parcelId,
                        recipientName: parcel.receiverName || 'N/A',
                        phone: parcel.recieverPhoneNumber ? formatPhoneNumber(parcel.recieverPhoneNumber) : 'N/A',
                        location: location,
                        amount: formatCurrency(totalAmount),
                        status: '',
                        assignedAt: ''
                    };
                });

                allPdfData.push({
                    date: formatDateHeader(dateKey),
                    data: pdfData
                });
            });

            // Generate filename
            let filename = 'rider-history';
            if (startDate && endDate) {
                filename = `rider-history-${startDate}-to-${endDate}`;
            } else if (startDate) {
                const today = new Date().toISOString().split('T')[0];
                filename = `rider-history-${startDate}-to-${today}`;
            } else if (searchTerm) {
                filename = `rider-history-filtered-${new Date().toISOString().split('T')[0]}`;
            } else {
                filename = `rider-history-${new Date().toISOString().split('T')[0]}`;
            }

            // Generate title
            let title = 'M&M Services - Delivery History';
            if (startDate && endDate) {
                title = `M&M Services - Delivery History (${formatDateHeader(new Date(startDate).toDateString())} to ${formatDateHeader(new Date(endDate).toDateString())})`;
            } else if (startDate) {
                const today = new Date();
                title = `M&M Services - Delivery History (${formatDateHeader(new Date(startDate).toDateString())} to ${formatDateHeader(today.toDateString())})`;
            } else if (searchTerm) {
                title = `M&M Services - Delivery History (Filtered)`;
            }

            // Generate PDF with grouped data
            generateHistoryPDF(allPdfData, currentUser?.name || 'Rider', filename, title);
            
            showToast(`PDF downloaded successfully (${filteredAssignments.length} assignments)`, "success");
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            showToast("Failed to generate PDF. Please try again.", "error");
        }
    };

    // Group assignments by date
    const groupedByDate = useMemo(() => {
        const groups: Record<string, RiderAssignmentResponse[]> = {};
        
        filteredAssignments.forEach(assignment => {
            // Use completedAt if available, otherwise use assignedAt
            const dateKey = assignment.completedAt 
                ? new Date(assignment.completedAt).toDateString()
                : assignment.assignedAt 
                    ? new Date(assignment.assignedAt).toDateString()
                    : 'Unknown';
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(assignment);
        });

        // Sort dates in descending order (most recent first)
        const sortedDates = Object.keys(groups).sort((a, b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return new Date(b).getTime() - new Date(a).getTime();
        });

        // Sort assignments within each date group by completion time (most recent first)
        sortedDates.forEach(date => {
            groups[date].sort((a, b) => {
                const dateA = a.completedAt || a.assignedAt || '';
                const dateB = b.completedAt || b.assignedAt || '';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        });

        return { groups, sortedDates };
    }, [filteredAssignments]);

    const toggleDateCollapse = (dateKey: string) => {
        setCollapsedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateKey)) {
                newSet.delete(dateKey);
            } else {
                newSet.add(dateKey);
            }
            return newSet;
        });
    };

    // Format date for display
    const formatDateHeader = (dateString: string): string => {
        if (dateString === 'Unknown') return 'Unknown Date';
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    };

    const [filtersOpen, setFiltersOpen] = useState(false);
    const filterCount = (startDate ? 1 : 0) + (endDate ? 1 : 0);
    const totalCollected = filteredAssignments.reduce((s, a) => s + parcelTotal(a.parcel), 0);

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <p className="text-[11px] text-gray-500">Delivered</p>
                    <p className="text-xl font-bold">{completedAssignments.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                    <p className="text-[11px] text-gray-500">Returned</p>
                    <p className="text-xl font-bold">{returnedAssignments.length}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04] min-w-0">
                    <p className="text-[11px] text-gray-500">Collected</p>
                    <p className="text-xl font-bold text-neutral-900 truncate">GHC {Math.round(totalCollected).toLocaleString("en-GB")}</p>
                </div>
            </div>

            {/* Search + actions (sticky under the app bar) */}
            <div className="sticky top-[var(--rider-bar)] transition-[top] duration-200 motion-reduce:transition-none z-30 -mx-4 px-4 py-2 bg-[#f5f4f1]/95 backdrop-blur">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search name, phone, ID"
                            className="w-full h-12 pl-10 pr-3 rounded-2xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-neutral-900"
                        />
                    </div>
                    <button
                        onClick={() => setFiltersOpen(true)}
                        className="relative h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 active:scale-95"
                        aria-label="Filter by date"
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                        {filterCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">{filterCount}</span>
                        )}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={filteredAssignments.length === 0}
                        className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 active:scale-95 disabled:opacity-40"
                        aria-label="Download PDF"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
                {(searchTerm || filterCount > 0) && (
                    <p className="text-xs text-gray-500 mt-2">
                        {filteredAssignments.length} result{filteredAssignments.length === 1 ? "" : "s"}
                        <button
                            className="ml-2 text-[#ea690c] font-semibold"
                            onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); }}
                        >
                            Clear
                        </button>
                    </p>
                )}
            </div>

            {loading && assignments.length === 0 ? (
                <CardSkeleton />
            ) : filteredAssignments.length === 0 ? (
                <EmptyState
                    icon={<PackageIcon className="w-8 h-8" />}
                    title={completedAssignments.length === 0 ? "No deliveries yet" : "No matches"}
                    hint={completedAssignments.length === 0 ? "Completed deliveries will appear here." : "Try a different search or date range."}
                />
            ) : (
                <div className="space-y-5">
                    {groupedByDate.sortedDates.map((dateKey) => {
                        const items = groupedByDate.groups[dateKey];
                        const collapsed = collapsedDates.has(dateKey);
                        const dayTotal = items.reduce((s, a) => s + parcelTotal(a.parcel), 0);
                        return (
                            <section key={dateKey}>
                                <button
                                    onClick={() => toggleDateCollapse(dateKey)}
                                    className="w-full flex items-center justify-between px-1 mb-2"
                                    aria-expanded={!collapsed}
                                >
                                    <span className="text-sm font-bold text-neutral-800">{formatDateHeader(dateKey)}</span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                        {items.length} · {formatCurrency(dayTotal)}
                                        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                    </span>
                                </button>
                                {!collapsed && (
                                    <ul className="rounded-3xl bg-white divide-y divide-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
                                        {items.map((a) => {
                                            const p = a.parcel;
                                            return (
                                                <li key={`${a.assignmentId}-${p.parcelId}`}>
                                                    <button
                                                        onClick={() => { setSelectedAssignment(a); setShowDetailsModal(true); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
                                                    >
                                                        <span className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium truncate">{p.receiverName || "Unknown recipient"}</p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {timeOf(a.completedAt || a.assignedAt)} · {p.receiverAddress || p.parcelDescription || p.parcelId}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="font-semibold text-sm">{formatCurrency(parcelTotal(p))}</p>
                                                            {a.paymentMethod && (
                                                                <p className="text-[11px] text-gray-500">{a.paymentMethod === "momo" ? "MoMo" : "Cash"}</p>
                                                            )}
                                                        </div>
                                                    </button>
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
                open={showDetailsModal && !!selectedAssignment}
                onClose={() => { setShowDetailsModal(false); setSelectedAssignment(null); }}
                title={selectedAssignment?.parcel.receiverName || "Parcel details"}
                subtitle={selectedAssignment?.parcel.parcelDescription}
            >
                {selectedAssignment && <ParcelDetails assignment={selectedAssignment} />}
            </BottomSheet>

            <BottomSheet
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                title="Filter by date"
                footer={
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setStartDate(""); setEndDate(""); }}
                            className="h-12 px-5 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
                        >
                            Reset
                        </button>
                        <button onClick={() => setFiltersOpen(false)} className="h-12 flex-1 rounded-2xl bg-[#ea690c] text-white font-semibold">
                            Show {filteredAssignments.length} result{filteredAssignments.length === 1 ? "" : "s"}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 pb-2">
                    <label className="block">
                        <span className="text-sm font-semibold">From</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate || undefined}
                            className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold">To</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || undefined}
                            className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-gray-200 bg-white"
                        />
                    </label>
                </div>
            </BottomSheet>
        </div>
    );
};
