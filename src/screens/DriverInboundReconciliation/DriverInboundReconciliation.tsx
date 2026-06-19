import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Loader, CheckCircleIcon, XIcon, PackageIcon,
    Phone, ChevronRightIcon, UserIcon, RefreshCw, BadgeCheck, Truck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatCurrency, formatPhoneNumber } from "../../utils/dataHelpers";
import frontdeskService from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";
import { useDriverTracker } from "../../contexts/DriverTrackerContext";
import {
    DriverGroup,
    groupAssignmentsByDriver,
    isAssignmentReady,
    DRIVER_TRACKER_PAGE_SIZE,
    formatLoadDuration,
} from "./driverTrackerUtils";

const PAGE_SIZE = DRIVER_TRACKER_PAGE_SIZE;

export const DriverInboundReconciliation = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const {
        assignments,
        loading,
        totalUnpaid,
        loadStats,
        loadIfNeeded,
        refresh,
        removePaidAssignments,
    } = useDriverTracker();

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => { loadIfNeeded(); }, [loadIfNeeded]);

    const groups = useMemo(() => groupAssignmentsByDriver(assignments), [assignments]);

    const totals = useMemo(() => ({
        drivers: groups.length,
        parcels: assignments.length,
        owed: groups.reduce((s, g) => s + g.totalAmount, 0),
        ready: groups.reduce((s, g) => s + g.readyCount, 0),
    }), [groups, assignments.length]);

    const openDriverDetail = (group: DriverGroup) => {
        navigate(`/driver-tracker/${group.key}`);
    };

    const toggleSelect = (key: string) => setSelectedKeys(prev => {
        const n = new Set(prev);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
    });

    const fullyReadyGroups = groups.filter(g => g.assignments.length > 0 && g.assignments.every(isAssignmentReady));

    const handleSelectAll = () => {
        setSelectedKeys(
            selectedKeys.size === fullyReadyGroups.length && fullyReadyGroups.length > 0
                ? new Set()
                : new Set(fullyReadyGroups.map(g => g.key))
        );
    };

    const handlePaySelected = async () => {
        const selectedGroups = groups.filter(g => selectedKeys.has(g.key));
        const ids = selectedGroups.flatMap(g => g.assignments.filter(isAssignmentReady).map(a => a.id));
        if (!ids.length) return;
        ids.forEach(id => setPayingIds(prev => new Set(prev).add(id)));
        try {
            const res = await frontdeskService.payDriverAssignments(ids);
            if (res.success) {
                showToast(`${ids.length} parcel(s) marked as paid`, "success");
                removePaidAssignments(ids);
                setSelectedKeys(new Set());
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

    const selectedGroups = groups.filter(g => selectedKeys.has(g.key));
    const totalSelectedCount = selectedGroups.reduce((s, g) => s + g.readyCount, 0);
    const totalSelectedAmount = selectedGroups.reduce((s, g) => s + g.totalAmount, 0);

    return (
        <div className={`w-full ${showConfirmModal ? "overflow-hidden" : ""}`}>
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div>
                    <h1 className="text-xl font-bold text-neutral-800">Driver Tracker</h1>
                    <p className="text-sm text-[#5d5d5d] mt-1">Unpaid inbound cash owed to drivers</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Drivers</p><p className="text-2xl font-bold text-neutral-800">{totals.drivers}</p></CardContent></Card>
                    <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Parcels</p><p className="text-2xl font-bold text-blue-600">{totals.ready} / {totals.parcels}</p></CardContent></Card>
                    <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Total Owed</p><p className="text-2xl font-bold text-[#ea690c]">{formatCurrency(totals.owed)}</p></CardContent></Card>
                    <Card className="border border-[#d1d1d1]"><CardContent className="p-4"><p className="text-xs text-gray-500 mb-1">Ready to Pay</p><p className="text-2xl font-bold text-green-600">{totals.ready}</p></CardContent></Card>
                </div>

                {selectedKeys.size > 0 && (
                    <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
                        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="grid grid-cols-3 gap-4 flex-1">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Drivers</p>
                                    <p className="text-2xl font-bold text-[#ea690c]">{selectedKeys.size}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Parcels</p>
                                    <p className="text-2xl font-bold text-blue-600">{totalSelectedCount}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSelectedAmount)}</p>
                                </div>
                            </div>
                            <Button onClick={() => setShowConfirmModal(true)} disabled={totalSelectedCount === 0 || payingIds.size > 0} className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                                <BadgeCheck className="w-4 h-4 mr-2" />Pay Selected ({totalSelectedCount})
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-[#d1d1d1]">
                            <div>
                                <p className="text-sm font-semibold text-neutral-800">All Drivers</p>
                                {loadStats && !loading && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Loaded {loadStats.count.toLocaleString()}
                                        {loadStats.totalElements != null && loadStats.totalElements > loadStats.count
                                            ? ` of ${loadStats.totalElements.toLocaleString()}`
                                            : ""} records in {formatLoadDuration(loadStats.apiMs + loadStats.processMs)}
                                        {" "}(API {formatLoadDuration(loadStats.apiMs)}
                                        {loadStats.pagesFetched && loadStats.pagesFetched > 1 ? ` · ${loadStats.pagesFetched} pages` : ""}
                                        {" · "}grouping {formatLoadDuration(loadStats.processMs)})
                                    </p>
                                )}
                            </div>
                            <Button onClick={() => refresh()} variant="outline" size="sm" disabled={loading} className="border-[#ea690c] text-[#ea690c] hover:bg-orange-50 shrink-0">
                                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1" />Refresh</>}
                            </Button>
                        </div>

                        {loading && assignments.length === 0 ? (
                            <div className="text-center py-12">
                                <Loader className="w-10 h-10 text-[#ea690c] mx-auto mb-4 animate-spin" />
                                <p className="text-neutral-700 font-semibold text-lg">Loading up to {PAGE_SIZE.toLocaleString()} records...</p>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="text-center py-12">
                                <PackageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-neutral-800 font-semibold text-lg mb-2">No unpaid assignments</p>
                                <p className="text-sm text-gray-500">All driver inbound cash has been settled.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={fullyReadyGroups.length > 0 && selectedKeys.size === fullyReadyGroups.length}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-[#ea690c] focus:ring-[#ea690c]"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Driver</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Trips</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Vehicle</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Parcels</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Total Owed</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300" />
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {groups.map((group, gi) => {
                                            const isSelected = selectedKeys.has(group.key);
                                            const readyAssignments = group.assignments.filter(isAssignmentReady);
                                            const pendingAssignments = group.assignments.filter(a => !isAssignmentReady(a) && !a.parcelInfo?.returned);
                                            const returnedAssignments = group.assignments.filter(a => a.parcelInfo?.returned);
                                            const allReady = group.assignments.length > 0 && group.assignments.every(isAssignmentReady);

                                            return (
                                                <tr
                                                    key={group.key}
                                                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${gi !== groups.length - 1 ? "border-b border-gray-200" : ""} ${isSelected ? "bg-orange-50" : ""}`}
                                                    onClick={() => openDriverDetail(group)}
                                                >
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => allReady && toggleSelect(group.key)}
                                                            disabled={!allReady}
                                                            title={!allReady ? "All parcels must be ready" : "Select driver"}
                                                            className="rounded border-gray-300 text-[#ea690c] focus:ring-[#ea690c] disabled:opacity-30 disabled:cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 border-r border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <UserIcon className="w-4 h-4 text-blue-500" />
                                                            <div>
                                                                <div className="text-sm font-semibold text-neutral-800">{group.driverName}</div>
                                                                <a href={`tel:${group.driverPhoneNumber}`} onClick={e => e.stopPropagation()} className="text-xs text-[#ea690c] hover:underline flex items-center gap-1 mt-0.5">
                                                                    <Phone className="w-3 h-3" />{formatPhoneNumber(group.driverPhoneNumber)}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100 text-sm font-semibold text-neutral-700">
                                                        {group.batches.length}
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                                                            {group.vehicleNumbers.slice(0, 2).map(v => (
                                                                <Badge key={v} className="bg-gray-100 text-gray-700 border-gray-200 text-xs">
                                                                    <Truck className="w-3 h-3 mr-1" />{v}
                                                                </Badge>
                                                            ))}
                                                            {group.vehicleNumbers.length > 2 && (
                                                                <span className="text-xs text-gray-500">+{group.vehicleNumbers.length - 2}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                                        <div className="text-sm font-semibold text-blue-600">{readyAssignments.length} / {group.assignments.length}</div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                                        <div className="text-sm font-bold text-[#ea690c]">{formatCurrency(group.totalAmount)}</div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                                                        <div className="flex flex-wrap gap-1">
                                                            {readyAssignments.length > 0 && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{readyAssignments.length} Ready</Badge>}
                                                            {pendingAssignments.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{pendingAssignments.length} Pending</Badge>}
                                                            {returnedAssignments.length > 0 && <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">{returnedAssignments.length} Returned</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                                                        <Button variant="ghost" size="sm" onClick={() => openDriverDetail(group)} className="text-[#ea690c] hover:text-[#c45509] hover:bg-orange-50">
                                                            View <ChevronRightIcon className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!loading && totalUnpaid > assignments.length && (
                            <div className="px-6 py-3 border-t border-[#d1d1d1] text-sm text-amber-700 bg-amber-50">
                                Showing {assignments.length.toLocaleString()} of {totalUnpaid.toLocaleString()} unpaid parcels (capped at {PAGE_SIZE.toLocaleString()}).
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl rounded-lg border border-[#d1d1d1] bg-white shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="inline-flex items-center gap-2">
                                    <CheckCircleIcon className="w-6 h-6 text-[#ea690c]" />
                                    <h2 className="font-semibold text-[#ea690c] text-lg">Confirm Payment</h2>
                                </div>
                                <button onClick={() => setShowConfirmModal(false)} className="text-[#9a9a9a] hover:text-neutral-800">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm font-semibold text-blue-900">
                                    Pay {totalSelectedCount} parcel(s) across {selectedKeys.size} driver(s) — {formatCurrency(totalSelectedAmount)}
                                </p>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg mb-4">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Driver</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Vehicle</th>
                                            <th className="px-3 py-2 text-left font-semibold text-gray-700">Ready</th>
                                            <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedGroups.map(g => (
                                            <tr key={g.key} className="border-b border-gray-100">
                                                <td className="px-3 py-2 font-semibold">{g.driverName}</td>
                                                <td className="px-3 py-2 text-gray-600">{g.vehicleNumbers.join(", ")}</td>
                                                <td className="px-3 py-2">{g.readyCount}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(g.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="flex-1">Cancel</Button>
                                <Button onClick={handlePaySelected} disabled={payingIds.size > 0} className="flex-1 bg-green-600 text-white hover:bg-green-700">
                                    {payingIds.size > 0 ? <><Loader className="w-4 h-4 animate-spin mr-2" />Processing...</> : "Confirm Payment"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
