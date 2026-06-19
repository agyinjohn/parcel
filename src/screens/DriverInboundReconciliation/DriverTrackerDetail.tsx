import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Loader, CheckCircleIcon, XIcon, PackageIcon,
    Phone, ChevronDownIcon, ChevronRightIcon,
    ArrowLeft, RefreshCw, BadgeCheck, Truck, Clock,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatCurrency, formatPhoneNumber, formatDateTime } from "../../utils/dataHelpers";
import frontdeskService from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";
import { useDriverTracker } from "../../contexts/DriverTrackerContext";
import {
    TripBatch,
    findDriverGroup,
    isAssignmentReady,
    DRIVER_TRACKER_PAGE_SIZE,
} from "./driverTrackerUtils";

const PAGE_SIZE = DRIVER_TRACKER_PAGE_SIZE;

export const DriverTrackerDetail = () => {
    const { phoneKey } = useParams<{ phoneKey: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const {
        assignments,
        loading,
        loadStats,
        loadIfNeeded,
        refresh,
        removePaidAssignments,
    } = useDriverTracker();

    const [expandedBatchKeys, setExpandedBatchKeys] = useState<Set<string>>(new Set());
    const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
    const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadIfNeeded(); }, [loadIfNeeded]);

    const group = useMemo(
        () => (phoneKey && assignments.length ? findDriverGroup(assignments, phoneKey) : undefined),
        [assignments, phoneKey],
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        const ok = await refresh();
        if (!ok) showToast("Failed to reload assignments", "error");
        setRefreshing(false);
    };

    const toggleBatchExpand = (key: string) => setExpandedBatchKeys(prev => {
        const n = new Set(prev);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
    });

    const toggleParcel = (assignmentId: string) => setSelectedParcelIds(prev => {
        const n = new Set(prev);
        n.has(assignmentId) ? n.delete(assignmentId) : n.add(assignmentId);
        return n;
    });

    const toggleBatchParcels = (batch: TripBatch) => {
        const readyIds = batch.assignments.filter(isAssignmentReady).map(a => a.id);
        const allSelected = readyIds.length > 0 && readyIds.every(id => selectedParcelIds.has(id));
        setSelectedParcelIds(prev => {
            const n = new Set(prev);
            readyIds.forEach(id => allSelected ? n.delete(id) : n.add(id));
            return n;
        });
    };

    const toggleAllReady = () => {
        if (!group) return;
        const readyIds = group.assignments.filter(isAssignmentReady).map(a => a.id);
        const allSelected = readyIds.length > 0 && readyIds.every(id => selectedParcelIds.has(id));
        setSelectedParcelIds(allSelected ? new Set() : new Set(readyIds));
    };

    const handlePaySingle = async (assignmentId: string, label: string) => {
        setPayingIds(prev => new Set(prev).add(assignmentId));
        try {
            const res = await frontdeskService.payDriverAssignments([assignmentId]);
            if (res.success) {
                showToast(`${label} marked as paid`, "success");
                removePaidAssignments([assignmentId]);
                setSelectedParcelIds(prev => { const n = new Set(prev); n.delete(assignmentId); return n; });
            } else {
                showToast(res.message || "Failed", "error");
            }
        } catch {
            showToast("Failed to mark as paid", "error");
        } finally {
            setPayingIds(prev => { const n = new Set(prev); n.delete(assignmentId); return n; });
        }
    };

    const handlePaySelected = async () => {
        const ids = Array.from(selectedParcelIds);
        if (!ids.length) return;
        ids.forEach(id => setPayingIds(prev => new Set(prev).add(id)));
        try {
            const res = await frontdeskService.payDriverAssignments(ids);
            if (res.success) {
                showToast(`${ids.length} parcel(s) marked as paid`, "success");
                removePaidAssignments(ids);
                setSelectedParcelIds(new Set());
                setShowConfirmModal(false);
            } else {
                showToast(res.message || "Failed", "error");
            }
        } catch {
            showToast("Failed to mark as paid", "error");
        } finally {
            ids.forEach(id => setPayingIds(prev => { const n = new Set(prev); n.delete(id); return n; }));
        }
    };

    const totalSelectedAmount = group
        ? group.assignments
            .filter(a => selectedParcelIds.has(a.id))
            .reduce((s, a) => s + (a.parcelInfo?.inboundCost || a.amount), 0)
        : 0;

    const isBusy = loading || refreshing;

    if (!isBusy && !group) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
                <PackageIcon className="w-12 h-12 text-gray-300" />
                <p className="text-neutral-600 font-medium">Driver not found or all parcels have been paid.</p>
                <Button variant="outline" onClick={() => navigate("/driver-tracker")} className="border-[#ea690c] text-[#ea690c]">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Driver Tracker
                </Button>
            </div>
        );
    }

    const readyCount = group?.assignments.filter(isAssignmentReady).length ?? 0;
    const allReady = group ? group.assignments.length > 0 && group.assignments.every(isAssignmentReady) : false;

    return (
        <div className={`w-full ${showConfirmModal ? "overflow-hidden" : ""}`}>
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Button variant="outline" size="sm" onClick={() => navigate("/driver-tracker")} className="border-[#d1d1d1] mt-1">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-neutral-800">{group?.driverName || "Driver"}</h1>
                            {group && (
                                <a href={`tel:${group.driverPhoneNumber}`} className="text-sm text-[#ea690c] hover:underline flex items-center gap-1 mt-1">
                                    <Phone className="w-3.5 h-3.5" />{formatPhoneNumber(group.driverPhoneNumber)}
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {loadStats && !isBusy && (
                            <p className="text-xs text-gray-500">
                                {group
                                    ? `${group.assignments.length.toLocaleString()} parcels from cached list`
                                    : `Loaded ${loadStats.count.toLocaleString()} records`}
                                {loadStats.totalElements != null && loadStats.totalElements > loadStats.count
                                    ? ` (${loadStats.totalElements.toLocaleString()} total unpaid)`
                                    : ""}
                            </p>
                        )}
                        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isBusy} className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50">
                            {isBusy ? <Loader className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" />Reload from server</>}
                        </Button>
                    </div>
                </div>

                {group && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Trips</p><p className="text-2xl font-bold text-neutral-800">{group.batches.length}</p></CardContent></Card>
                        <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Parcels</p><p className="text-2xl font-bold text-blue-600">{readyCount} / {group.assignments.length}</p></CardContent></Card>
                        <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Total Owed</p><p className="text-2xl font-bold text-[#ea690c]">{formatCurrency(group.totalAmount)}</p></CardContent></Card>
                        <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Vehicles</p><p className="text-sm font-semibold text-neutral-800 truncate">{group.vehicleNumbers.join(", ")}</p></CardContent></Card>
                    </div>
                )}

                {selectedParcelIds.size > 0 && (
                    <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
                        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Parcels Selected</p>
                                    <p className="text-2xl font-bold text-blue-600">{selectedParcelIds.size}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSelectedAmount)}</p>
                                </div>
                            </div>
                            <Button onClick={() => setShowConfirmModal(true)} className="bg-green-600 text-white hover:bg-green-700">
                                <BadgeCheck className="w-4 h-4 mr-2" />Pay Selected ({selectedParcelIds.size})
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d1d1d1]">
                            <p className="text-sm font-semibold text-neutral-800">Drop-off Trips</p>
                            {allReady && (
                                <Button variant="outline" size="sm" onClick={toggleAllReady} className="text-xs border-gray-300">
                                    {group!.assignments.filter(isAssignmentReady).every(a => selectedParcelIds.has(a.id)) ? "Deselect all" : "Select all ready"}
                                </Button>
                            )}
                        </div>

                        {isBusy && !group ? (
                            <div className="text-center py-12">
                                <Loader className="w-10 h-10 text-[#ea690c] mx-auto mb-4 animate-spin" />
                                <p className="text-neutral-700 font-semibold">Loading up to {PAGE_SIZE.toLocaleString()} records...</p>
                            </div>
                        ) : group && (
                            <div className="divide-y divide-gray-200">
                                {group.batches.map((batch, bi) => {
                                    const batchExpanded = expandedBatchKeys.has(batch.key);
                                    const batchReady = batch.assignments.filter(isAssignmentReady);
                                    const batchPending = batch.assignments.filter(a => !isAssignmentReady(a) && !a.parcelInfo?.returned);
                                    const batchReturned = batch.assignments.filter(a => a.parcelInfo?.returned);
                                    const batchAllReady = batch.assignments.length > 0 && batch.assignments.every(isAssignmentReady);
                                    const batchReadyIds = batch.assignments.filter(isAssignmentReady).map(a => a.id);
                                    const batchAllChecked = batchReadyIds.length > 0 && batchReadyIds.every(id => selectedParcelIds.has(id));

                                    return (
                                        <div key={batch.key}>
                                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    onChange={() => toggleBatchParcels(batch)}
                                                    checked={batchAllChecked}
                                                    disabled={!batchAllReady}
                                                    className="rounded border-gray-300 text-[#ea690c] focus:ring-[#ea690c] disabled:opacity-30"
                                                />
                                                <button onClick={() => toggleBatchExpand(batch.key)} className="text-gray-500 hover:text-gray-700">
                                                    {batchExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                </button>
                                                <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-neutral-800">
                                                        {batch.createdAt ? formatDateTime(new Date(batch.createdAt).toISOString()) : "Unknown time"}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Trip {bi + 1} of {group.batches.length}</div>
                                                </div>
                                                <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs shrink-0">
                                                    <Truck className="w-3 h-3 mr-1" />{batch.vehicleNumber}
                                                </Badge>
                                                <div className="text-sm font-semibold text-blue-600 shrink-0">{batchReady.length}/{batch.assignments.length}</div>
                                                <div className="text-sm font-bold text-[#ea690c] shrink-0 w-24 text-right">{formatCurrency(batch.totalAmount)}</div>
                                                <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
                                                    {batchReady.length > 0 && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{batchReady.length} Ready</Badge>}
                                                    {batchPending.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{batchPending.length} Pending</Badge>}
                                                    {batchReturned.length > 0 && <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">{batchReturned.length} Returned</Badge>}
                                                </div>
                                            </div>

                                            {batchExpanded && (
                                                <div className="overflow-x-auto border-t border-gray-200">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 w-10" />
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Recipient</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Phone</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Shelf</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Inbound</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Parcel ID</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                                                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Pay</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {batch.assignments.map((a, ai) => {
                                                                const p = a.parcelInfo;
                                                                const isReady = isAssignmentReady(a);
                                                                const isPaying = payingIds.has(a.id);
                                                                return (
                                                                    <tr key={a.id} className={ai !== batch.assignments.length - 1 ? "border-b border-gray-200" : ""}>
                                                                        <td className="px-4 py-3">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isReady && selectedParcelIds.has(a.id)}
                                                                                onChange={() => isReady && toggleParcel(a.id)}
                                                                                disabled={!isReady}
                                                                                className="rounded border-gray-300 text-[#ea690c] focus:ring-[#ea690c] disabled:opacity-30"
                                                                            />
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="text-sm font-semibold text-neutral-800">{p?.receiverName || "N/A"}</div>
                                                                            {p?.senderName && <div className="text-xs text-gray-500">From: {p.senderName}</div>}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                                            {p?.receiverPhoneNumber
                                                                                ? <a href={`tel:${p.receiverPhoneNumber}`} className="text-[#ea690c] hover:underline">{formatPhoneNumber(p.receiverPhoneNumber)}</a>
                                                                                : <span className="text-gray-400">N/A</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-gray-600">{p?.shelfName || "—"}</td>
                                                                        <td className="px-4 py-3 text-sm font-bold text-[#ea690c]">{formatCurrency(p?.inboundCost || a.amount)}</td>
                                                                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p?.parcelId || "—"}</td>
                                                                        <td className="px-4 py-3">
                                                                            {p?.returned
                                                                                ? <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Returned</Badge>
                                                                                : isReady
                                                                                    ? <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{p?.delivered || a.delivered ? "Delivered" : "Picked Up"}</Badge>
                                                                                    : <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs"><Clock className="w-3 h-3 inline mr-1" />Pending</Badge>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {isReady && (
                                                                                <Button onClick={() => handlePaySingle(a.id, p?.receiverName || "Parcel")} disabled={isPaying || payingIds.size > 0} variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50 text-xs">
                                                                                    {isPaying ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Pay"}
                                                                                </Button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md rounded-lg border border-[#d1d1d1] bg-white shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="inline-flex items-center gap-2">
                                    <CheckCircleIcon className="w-6 h-6 text-[#ea690c]" />
                                    <h2 className="font-semibold text-[#ea690c] text-lg">Confirm Payment</h2>
                                </div>
                                <button onClick={() => setShowConfirmModal(false)} className="text-[#9a9a9a] hover:text-neutral-800">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 mb-4">
                                Pay {selectedParcelIds.size} parcel(s) totalling <strong>{formatCurrency(totalSelectedAmount)}</strong> for {group?.driverName}?
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="flex-1">Cancel</Button>
                                <Button onClick={handlePaySelected} disabled={payingIds.size > 0} className="flex-1 bg-green-600 text-white hover:bg-green-700">
                                    {payingIds.size > 0 ? <Loader className="w-4 h-4 animate-spin" /> : "Confirm"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
