import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SearchIcon, FilterIcon, Download, X, Edit, Loader, Eye, Home, MoreHorizontal, ChevronDown, PrinterIcon, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { useStation } from "../../contexts/StationContext";
import { useShelf } from "../../contexts/ShelfContext";
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from "../../utils/dataHelpers";
import frontdeskService, { ParcelResponse } from "../../services/frontdeskService";
import { useToast } from "../../components/ui/toast";
import authService from "../../services/authService";
import { useFrontdeskParcel } from "../../contexts/FrontdeskParcelContext";
import {
    DeliveryLocationPicker, type DeliveryLocation, locationFromParcel, locationToUpdate, sameLocation,
} from "../../components/DeliveryLocationPicker";
import { PrintLabelModal } from "../../components/PrintLabelModal";

export const ParcelSearch = (): JSX.Element => {
    const { currentStation, currentUser, userRole } = useStation();
    const { shelves, loadShelves } = useShelf();
    const { showToast } = useToast();
    const {
        parcels,
        loading,
        backgroundLoading,
        pagination,
        loadParcelsIfNeeded,
        refreshParcels,
        prefetchNextPageIfPossible,
    } = useFrontdeskParcel();
    const [searchParams, setSearchParams] = useState({
        recipientName: "",
        status: "",
        startDate: "",
        endDate: "",
        shelfLocation: "",
    });
    const [generalSearch, setGeneralSearch] = useState("");
    const [debouncedGeneralSearch, setDebouncedGeneralSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedParcel, setSelectedParcel] = useState<ParcelResponse | null>(null);
    const [editingShelf, setEditingShelf] = useState(false);
    const [newShelfLocation, setNewShelfLocation] = useState("");
    const [markPickupLoading, setMarkPickupLoading] = useState(false);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [pickupParcel, setPickupParcel] = useState<ParcelResponse | null>(null);
    const [pickupIsOwner, setPickupIsOwner] = useState(true);
    const [pickupName, setPickupName] = useState("");
    const [pickupPhone, setPickupPhone] = useState("");
    const [requestDelivery, setRequestDelivery] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryCostInput, setDeliveryCostInput] = useState("");
    const [savingDelivery, setSavingDelivery] = useState(false);
    // Delivery pin: used by "Request Home Delivery" and the "Set/Change delivery pin" action.
    const [deliveryPin, setDeliveryPin] = useState<DeliveryLocation | null>(null);
    const [pinMapAvailable, setPinMapAvailable] = useState(true);
    const [editingPin, setEditingPin] = useState(false);
    const [savingPin, setSavingPin] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [activeDelivery, setActiveDelivery] = useState<any>(null);
    const [activeDeliveryLoading, setActiveDeliveryLoading] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [checkedParcels, setCheckedParcels] = useState<Set<string>>(new Set());
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current) return;
        window.print();
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
                setShowActionMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // NEW helper: determine human status label including pickup/hasCalled
    const getStatusLabel = (p: ParcelResponse): string => {
        // Priority: Delivered > Picked Up > POD > Assigned > Called > Registered
        if (p.delivered) return "Delivered";
        if (p.pickedUp) return "Picked Up";
        if (p.pod) return "POD";
        if (p.parcelAssigned) return "Assigned";
        if (p.hasCalled) return "Called";
        return "Registered";
    };

    // Helper: parse YYYY-MM-DD (input[type="date"]) to local Date (midnight)
    const parseDateInput = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        const [y, m, d] = dateStr.split("-").map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    // Load parcels on mount - skip if context already has data cached
    useEffect(() => {
        if (parcels.length === 0) {
            loadParcelsIfNeeded({}, 0, 200, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Once current page has loaded, prefetch the next page in the background so "Next" feels instant
    useEffect(() => {
        if (loading || backgroundLoading) return;
        if (parcels.length === 0) return;
        if (pagination.totalPages <= 0 || pagination.page + 1 >= pagination.totalPages) return;
        prefetchNextPageIfPossible();
    }, [loading, backgroundLoading, parcels.length, pagination.page, pagination.totalPages, prefetchNextPageIfPossible]);

    // Load shelves using office ID from user data
    useEffect(() => {
        const userData = authService.getUser();
        const officeId = (userData as any)?.office?.id;

        if (officeId) {
            loadShelves(officeId);
        } else if (currentStation && userRole === "ADMIN") {
            // Fallback for admin users with selected station
            loadShelves(currentStation.id);
        }
    }, [currentStation, userRole, loadShelves]);

    // Debounce the general search box before deciding whether to hit the server
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedGeneralSearch(generalSearch), 700);
        return () => clearTimeout(timer);
    }, [generalSearch]);

    // Server-side search: send the debounced query to the backend via the `search` param
    // which does a contains match on receiver name, parcel ID, phone, etc.
    // Falls back to showing all parcels when the search is cleared.
    // Requires at least 2 characters to avoid hammering the backend on every keystroke.
    useEffect(() => {
        const raw = debouncedGeneralSearch.trim();
        // Normalize phone numbers before sending to server:
        // "0531656697" or "531656697" → "+233531656697"
        const looksLikePhone = /^[0-9+\s]+$/.test(raw) && raw.replace(/\D/g, "").length >= 7;
        let query = raw;
        if (looksLikePhone) {
            const digits = raw.replace(/\D/g, "");
            if (digits.startsWith("0")) {
                query = "+233" + digits.substring(1);
            } else if (digits.startsWith("233")) {
                query = "+" + digits;
            } else if (!raw.startsWith("+")) {
                query = "+233" + digits;
            }
        }
        if (query.length >= 2) {
            loadParcelsIfNeeded({ search: query }, 0, 200, true);
        } else if (query.length === 0) {
            loadParcelsIfNeeded({}, 0, 200, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedGeneralSearch]);

    // Client-side filtering applied on top of whatever parcels the server returned.
    const filteredParcels = useMemo(() => {
        let filtered = [...parcels];

        if (searchParams.status) {
            filtered = filtered.filter((p) => {
                if (searchParams.status === "delivered") return p.delivered;
                if (searchParams.status === "pickedUp") return p.pickedUp && !p.delivered;
                if (searchParams.status === "pod") return p.pod;
                if (searchParams.status === "assigned") return p.parcelAssigned && !p.pod && !p.pickedUp && !p.delivered;
                if (searchParams.status === "called") return p.hasCalled && !p.parcelAssigned && !p.pod && !p.pickedUp && !p.delivered;
                if (searchParams.status === "registered") return !p.delivered && !p.pickedUp && !p.pod && !p.parcelAssigned && !p.hasCalled;
                return true;
            });
        }

        if (searchParams.shelfLocation) {
            filtered = filtered.filter((p) =>
                p.shelfName === searchParams.shelfLocation || p.shelfNumber === searchParams.shelfLocation
            );
        }

        if (searchParams.recipientName) {
            const term = searchParams.recipientName.toLowerCase();
            filtered = filtered.filter((p) =>
                p.receiverName?.toLowerCase().includes(term)
            );
        }

        if (searchParams.startDate) {
            const start = parseDateInput(searchParams.startDate);
            if (start) {
                const startMs = start.setHours(0, 0, 0, 0);
                filtered = filtered.filter((p) => {
                    const ts = p.createdAt ?? p.registeredDate;
                    return ts && Number(ts) >= startMs;
                });
            }
        }

        if (searchParams.endDate) {
            const end = parseDateInput(searchParams.endDate);
            if (end) {
                const endMs = end.setHours(23, 59, 59, 999);
                filtered = filtered.filter((p) => {
                    const ts = p.createdAt ?? p.registeredDate;
                    return ts && Number(ts) <= endMs;
                });
            }
        }

        return filtered;
    }, [parcels, searchParams]);

    const handleClearFilters = () => {
        setGeneralSearch("");
        setDebouncedGeneralSearch("");
        setSearchParams({
            recipientName: "",
            status: "",
            startDate: "",
            endDate: "",
            shelfLocation: "",
        });
    };

    const handleUpdateShelf = async () => {
        if (!selectedParcel || !newShelfLocation || !currentUser) return;

        try {
            // Find shelf ID from shelves list if we're using shelf name
            const selectedShelf = shelves.find(s => s.name === newShelfLocation);
            const shelfIdToUpdate = selectedShelf?.id || newShelfLocation;

            const response = await frontdeskService.updateParcel(selectedParcel.parcelId, {
                shelfNumber: shelfIdToUpdate,
            });

            if (response.success) {
                showToast("Shelf location updated successfully", "success");
                // Refresh parcels
                await refreshParcels();
                setEditingShelf(false);
                setSelectedParcel(null);
            } else {
                showToast(response.message || "Failed to update shelf location", "error");
            }
        } catch (error) {
            console.error("Update shelf error:", error);
            showToast("Failed to update shelf location. Please try again.", "error");
        }
    };

    const handleRequestDelivery = async () => {
        if (!selectedParcel) return;
        if (!deliveryAddress.trim()) {
            showToast("Please enter a delivery address", "warning");
            return;
        }
        if (pinMapAvailable && !deliveryPin) {
            showToast("Choose the delivery location: search a landmark or pin it on the map", "warning");
            return;
        }
        setSavingDelivery(true);
        try {
            const response = await frontdeskService.updateParcel(selectedParcel.parcelId, {
                homeDelivery: true,
                hasCalled: true,
                receiverAddress: deliveryAddress.trim(),
                deliveryCost: parseFloat(deliveryCostInput) || 0,
                ...(deliveryPin ? locationToUpdate(deliveryPin) : {}),
            });
            if (response.success) {
                showToast("Home delivery requested successfully", "success");
                setRequestDelivery(false);
                setDeliveryAddress("");
                setDeliveryCostInput("");
                setDeliveryPin(null);
                await refreshParcels();
                setSelectedParcel(null);
            } else {
                showToast(response.message || "Failed to request delivery", "error");
            }
        } catch {
            showToast("Failed to request delivery", "error");
        } finally {
            setSavingDelivery(false);
        }
    };

    const handleSavePin = async () => {
        if (!selectedParcel) return;
        const before = locationFromParcel(selectedParcel);
        if (sameLocation(before, deliveryPin)) { setEditingPin(false); return; }
        setSavingPin(true);
        try {
            const update = locationToUpdate(deliveryPin);
            const response = await frontdeskService.updateParcel(selectedParcel.parcelId, update);
            if (response.success) {
                showToast(deliveryPin ? "Delivery pin saved" : "Delivery pin removed", "success");
                // Keep the details open, showing the new pin.
                setSelectedParcel({ ...selectedParcel, ...update });
                setEditingPin(false);
                await refreshParcels({}, pagination.page, pagination.size);
            } else {
                showToast(response.message || "Failed to save the delivery pin", "error");
            }
        } catch {
            showToast("Failed to save the delivery pin", "error");
        } finally {
            setSavingPin(false);
        }
    };

    const handleMarkPickedUp = async () => {
        if (!pickupParcel) return;
        setMarkPickupLoading(true);
        try {
            const parcelId = pickupParcel.parcelId;
            const name = pickupIsOwner ? (pickupParcel.receiverName || "") : pickupName.trim();
            const phone = pickupIsOwner ? (pickupParcel.recieverPhoneNumber || "") : normalizePhoneNumber(pickupPhone.trim());
            const response = await frontdeskService.markParcelPickedUp(parcelId, name || undefined, phone || undefined);
            if (response.success) {
                showToast("Parcel marked as picked up", "success");
                setShowPickupModal(false);
                setPickupParcel(null);
                await refreshParcels();
            } else {
                showToast(response.message || "Failed to update parcel status", "error");
            }
        } catch (error) {
            console.error("Failed to mark parcel picked up:", error);
            showToast("Failed to update parcel. Please try again.", "error");
        } finally {
            setMarkPickupLoading(false);
        }
    };

    const handleExport = () => {
        const headers = [
            "Parcel ID",
            "Recipient Name",
            "Phone",
            "Address",
            "Shelf",
            "Status",
            "Delivery Cost",
            "Pick Up Cost",
        ];
        const rows = filteredParcels.map((p) => {
            // Use new helper to determine status
            const statusLabel = getStatusLabel(p);

            return [
                p.parcelId,
                p.receiverName || "N/A",
                p.recieverPhoneNumber || "N/A",
                p.receiverAddress || "N/A",
                p.shelfNumber || "N/A",
                statusLabel,
                (p.deliveryCost || 0).toFixed(2),
                (p.pickUpCost || 0).toFixed(2),
            ];
        });

        const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parcels-search-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    // Get unique shelves from parcels
    const uniqueShelves = [...new Set(parcels.map((p: ParcelResponse) => p.shelfName || p.shelfNumber).filter(Boolean))].sort() as string[];

    return (
        <div className="flex flex-col px-4 py-4 sm:px-6 lg:px-8" style={{ height: "calc(100vh - 64px)" }}>
            <div className="mx-auto w-full max-w-7xl flex flex-col flex-1 min-h-0 gap-4">
                <div className="shrink-0">
                    {/* Header */}
                    {/* <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-neutral-800">Parcel Search</h1>
                            <p className="text-xs text-[#5d5d5d] mt-0.5">
                                Find parcels by recipient, phone, ID, shelf, driver, or date range
                            </p>
                        </div>
                        <Button
                            onClick={handleExport}
                            size="sm"
                            className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 flex items-center gap-2 h-8 text-xs"
                        >
                            <Download size={14} />
                            Export
                        </Button>
                    </div> */}

                    {/* Quick Search Bar */}
                    <Card className="border border-[#d1d1d1] bg-white">
                        <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative">
                                    <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-[#5d5d5d]" />
                                    <Input
                                        placeholder="Search by recipient name, parcel ID, phone, or driver..."
                                        value={generalSearch}
                                        onChange={(e) => {
                                            setGeneralSearch(e.target.value);
                                        }}
                                        className="pl-10 pr-8 border border-[#d1d1d1]"
                                    />
                                    {loading && generalSearch.trim() && (
                                        <Loader className="absolute right-3 top-3 w-4 h-4 text-[#ea690c] animate-spin" />
                                    )}
                                </div>
                                <Button
                                    onClick={() => setShowFilters(!showFilters)}
                                    variant={showFilters ? "default" : "outline"}
                                    className={`flex items-center gap-2 ${showFilters ? "bg-[#ea690c] text-white" : "border border-[#d1d1d1]"
                                        }`}
                                >
                                    <FilterIcon size={18} />
                                    <span className="hidden sm:inline">{showFilters ? "Hide" : "Show"} Filters</span>
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    size="sm"
                                    className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 flex items-center gap-2 h-8 text-xs"
                                >
                                    <Download size={14} />
                                    Export
                                </Button>
                            </div>

                            {/* Advanced Filters */}
                            {showFilters && (
                                <div className="mt-4 pt-4 border-t border-[#d1d1d1]">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {/* Status Filter */}
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={searchParams.status}
                                                onChange={(e) =>
                                                    setSearchParams((prev) => ({
                                                        ...prev,
                                                        status: e.target.value,
                                                    }))
                                                }
                                                className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                                            >
                                                <option value="">All Status</option>
                                                <option value="registered">Registered</option>
                                                <option value="called">Called</option>
                                                <option value="assigned">Assigned</option>
                                                <option value="pod">POD</option>
                                                <option value="pickedUp">Picked Up</option>
                                                <option value="delivered">Delivered</option>
                                            </select>
                                        </div>

                                        {/* Shelf Location Filter */}
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Shelf Location
                                            </label>
                                            <select
                                                value={searchParams.shelfLocation}
                                                onChange={(e) =>
                                                    setSearchParams((prev) => ({
                                                        ...prev,
                                                        shelfLocation: e.target.value,
                                                    }))
                                                }
                                                className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                                            >
                                                <option value="">All Shelves</option>
                                                {uniqueShelves.map((shelf) => (
                                                    <option key={shelf} value={shelf}>
                                                        {shelf}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Receiver Name Filter */}
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                Receiver Name
                                            </label>
                                            <Input
                                                placeholder="Receiver name..."
                                                value={searchParams.recipientName}
                                                onChange={(e) =>
                                                    setSearchParams((prev) => ({
                                                        ...prev,
                                                        recipientName: e.target.value,
                                                    }))
                                                }
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        {/* Start Date Filter */}
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                From Date
                                            </label>
                                            <Input
                                                type="date"
                                                value={searchParams.startDate}
                                                onChange={(e) =>
                                                    setSearchParams((prev) => ({
                                                        ...prev,
                                                        startDate: e.target.value,
                                                    }))
                                                }
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>

                                        {/* End Date Filter */}
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                                To Date
                                            </label>
                                            <Input
                                                type="date"
                                                value={searchParams.endDate}
                                                onChange={(e) =>
                                                    setSearchParams((prev) => ({
                                                        ...prev,
                                                        endDate: e.target.value,
                                                    }))
                                                }
                                                className="border border-[#d1d1d1]"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex justify-end">
                                        <Button onClick={handleClearFilters} variant="outline" size="sm" className="border border-[#d1d1d1] text-xs h-8">
                                            Clear Filters
                                        </Button>
                                    </div>
                                </div>

                            )}
                        </CardContent>

                    </Card>
                </div>

                {/* Results + Table */}
                {loading ? (
                    <div className="text-center py-8">
                        <Loader className="w-8 h-8 text-[#ea690c] mx-auto mb-4 animate-spin" />
                        <p className="text-sm text-neutral-700">Loading parcels...</p>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 gap-3">
                            <div className="flex items-center justify-between text-xs text-[#5d5d5d] mb-2">
                                <span className="flex items-center gap-2">
                                    {generalSearch.trim() ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            {filteredParcels.length} result{filteredParcels.length === 1 ? "" : "s"} for "{generalSearch.trim()}"
                                            {loading && <Loader className="w-4 h-4 animate-spin text-[#ea690c]" />}
                                        </span>
                                    ) : (
                                        <>Showing {filteredParcels.length} of {pagination.totalElements} parcel(s)</>
                                    )}
                                    {backgroundLoading && (
                                        <span className="inline-flex items-center gap-1.5 text-[#ea690c]">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Loading next page...
                                        </span>
                                    )}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">Rows per page:</span>
                                    <select
                                        value={pagination.size}
                                        onChange={(e) => {
                                            const newSize = parseInt(e.target.value);
                                            loadParcelsIfNeeded({}, 0, newSize, true);
                                        }}
                                        defaultValue={200}
                                        className="text-xs border border-[#d1d1d1] rounded px-2 py-1"
                                    >
                                        <option value={200}>200</option>
                                        <option value={500}>500</option>
                                        <option value={1000}>1000</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bulk print bar */}
                            {checkedParcels.size > 0 && (
                                <div className="flex items-center justify-between bg-orange-50 border border-[#ea690c] rounded-lg px-4 py-2.5">
                                    <span className="text-sm font-semibold text-[#ea690c]">{checkedParcels.size} parcel{checkedParcels.size > 1 ? 's' : ''} selected</span>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => setShowPrintPreview(true)}
                                            className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#ea690c]/90 h-8 text-xs"
                                        >
                                            <PrinterIcon className="w-3.5 h-3.5" />
                                            Print {checkedParcels.size} Label{checkedParcels.size > 1 ? 's' : ''}
                                        </Button>
                                        <Button
                                            onClick={() => setCheckedParcels(new Set())}
                                            variant="outline"
                                            className="border border-[#ea690c] text-[#ea690c] hover:bg-orange-50 h-8 text-xs"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Parcels Table */}
                            <Card className="border border-[#d1d1d1] bg-white overflow-hidden flex flex-col flex-1 min-h-0">
                                <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                                    <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                                        <table className="w-full divide-y divide-[#d1d1d1] text-xs">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="py-2 px-2 w-8">
                                                        <input
                                                            type="checkbox"
                                                            className="w-3.5 h-3.5 accent-[#ea690c]"
                                                            checked={filteredParcels.length > 0 && filteredParcels.every(p => checkedParcels.has(p.parcelId))}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setCheckedParcels(new Set(filteredParcels.slice(0, 50).map(p => p.parcelId)));
                                                                } else {
                                                                    setCheckedParcels(new Set());
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Recipient
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Phone
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Address
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Date
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Status
                                                    </th>
                                                    <th className="py-2 px-2 text-left text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Shelf
                                                    </th>
                                                    <th className="py-2 px-2 text-center text-xs font-semibold text-neutral-800 uppercase tracking-wider whitespace-nowrap">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-[#d1d1d1]">
                                                {filteredParcels.length === 0 ? (
                                                    <tr>
                                                        {/* UPDATED colSpan to account for checkbox column */}
                                                        <td colSpan={8} className="py-8 px-4 text-center">
                                                            <p className="text-xs text-neutral-700">No parcels found matching your search criteria.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredParcels.map((parcel, index) => {
                                                        // Use new helper to determine status
                                                        const statusLabel = getStatusLabel(parcel);
                                                        let statusColor = "bg-gray-100 text-gray-800";
                                                        if (statusLabel === "Delivered") {
                                                            statusColor = "bg-green-100 text-green-800";
                                                        } else if (statusLabel === "Assigned") {
                                                            statusColor = "bg-blue-100 text-blue-800";
                                                        } else if (statusLabel === "POD") {
                                                            statusColor = "bg-purple-100 text-purple-800";
                                                        } else if (statusLabel === "Picked Up") {
                                                            statusColor = "bg-orange-100 text-orange-800";
                                                        } else if (statusLabel === "Called") {
                                                            statusColor = "bg-yellow-100 text-yellow-800";
                                                        }

                                                        return (
                                                            <tr
                                                                key={parcel.parcelId}
                                                                className={`transition-colors hover:bg-gray-50 ${checkedParcels.has(parcel.parcelId) ? 'bg-orange-50/40' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} align-middle`}
                                                            >
                                                                <td className="py-1.5 px-2 w-8">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-3.5 h-3.5 accent-[#ea690c]"
                                                                        checked={checkedParcels.has(parcel.parcelId)}
                                                                        onChange={(e) => {
                                                                            const next = new Set(checkedParcels);
                                                                            if (e.target.checked) {
                                                                                if (next.size >= 50) {
                                                                                    showToast("Maximum 50 parcels can be selected at once", "warning");
                                                                                    return;
                                                                                }
                                                                                next.add(parcel.parcelId);
                                                                            } else {
                                                                                next.delete(parcel.parcelId);
                                                                            }
                                                                            setCheckedParcels(next);
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="py-1.5 px-2 whitespace-nowrap">
                                                                    <div>
                                                                        <p className="font-medium text-neutral-800 text-xs">{parcel.receiverName || "N/A"}</p>
                                                                        {parcel.senderName && (
                                                                            <p className="text-[#5d5d5d] text-[10px] mt-0.5">From: {parcel.senderName}</p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-1.5 px-2 whitespace-nowrap">
                                                                    <div className="text-neutral-700 text-xs">
                                                                        {parcel.recieverPhoneNumber ? formatPhoneNumber(parcel.recieverPhoneNumber) : "N/A"}
                                                                    </div>
                                                                </td>
                                                                <td className="py-1.5 px-2">
                                                                    <div className="text-neutral-700 text-xs max-w-[180px] truncate">
                                                                        {parcel.receiverAddress || "—"}
                                                                    </div>
                                                                </td>

                                                                {/* NEW: createdAt/date cell */}
                                                                <td className="py-1.5 px-2 whitespace-nowrap">
                                                                    <div className="text-neutral-700 text-xs">
                                                                        {parcel.createdAt ? new Date(parcel.createdAt).toLocaleString() : "—"}
                                                                    </div>
                                                                </td>

                                                                <td className="py-1.5 px-2 whitespace-nowrap">
                                                                    <Badge className={`${statusColor} text-[10px] px-1.5 py-0.5`}>
                                                                        {statusLabel}
                                                                    </Badge>
                                                                </td>
                                                                <td className="py-1.5 px-2 whitespace-nowrap">
                                                                    <span className="text-neutral-700 text-xs">{parcel.shelfName || parcel.shelfNumber || "—"}</span>
                                                                </td>
                                                                <td className="py-1.5 px-2 whitespace-nowrap text-center">
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedParcel(parcel);
                                                                            setNewShelfLocation(parcel.shelfId || parcel.shelfNumber || "");
                                                                            setEditingShelf(false);
                                                                            setActiveDelivery(null);
                                                                            if (parcel.parcelAssigned) {
                                                                                setActiveDeliveryLoading(true);
                                                                                frontdeskService.getActiveDeliveryForParcel(parcel.parcelId)
                                                                                    .then(res => setActiveDelivery(res.success ? res.data : null))
                                                                                    .finally(() => setActiveDeliveryLoading(false));
                                                                            }
                                                                        }}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="border border-[#ea690c] text-[#ea690c] hover:bg-orange-50 h-7 px-2 text-xs"
                                                                    >
                                                                        <Eye className="w-3 h-3 mr-1" />
                                                                        <span className="hidden sm:inline">View</span>
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#d1d1d1] sm:px-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <Button
                                            onClick={() => {
                                                const newPage = pagination.page - 1;
                                                loadParcelsIfNeeded({}, newPage, pagination.size, false);
                                            }}
                                            disabled={pagination.page === 0 || backgroundLoading}
                                            variant="outline"
                                            className="border border-[#d1d1d1]"
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const newPage = pagination.page + 1;
                                                loadParcelsIfNeeded({}, newPage, pagination.size, false);
                                            }}
                                            disabled={pagination.page >= pagination.totalPages - 1 || backgroundLoading}
                                            variant="outline"
                                            className="border border-[#d1d1d1]"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-neutral-700">
                                                Showing <span className="font-medium">{pagination.page * pagination.size + 1}</span> to{" "}
                                                <span className="font-medium">
                                                    {Math.min((pagination.page + 1) * pagination.size, pagination.totalElements)}
                                                </span>{" "}
                                                of <span className="font-medium">{pagination.totalElements}</span> results
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => {
                                                    const newPage = pagination.page - 1;
                                                    loadParcelsIfNeeded({}, newPage, pagination.size, false);
                                                }}
                                                disabled={pagination.page === 0 || backgroundLoading}
                                                variant="outline"
                                                className="border border-[#d1d1d1]"
                                            >
                                                {backgroundLoading ? (
                                                    <Loader className="w-4 h-4 animate-spin mr-2" />
                                                ) : null}
                                                Previous
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    const newPage = pagination.page + 1;
                                                    loadParcelsIfNeeded({}, newPage, pagination.size, false);
                                                }}
                                                disabled={pagination.page >= pagination.totalPages - 1 || backgroundLoading}
                                                variant="outline"
                                                className="border border-[#d1d1d1]"
                                            >
                                                {backgroundLoading ? (
                                                    <Loader className="w-4 h-4 animate-spin mr-2" />
                                                ) : null}
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </div>

            {/* Pickup Modal */}
            {showPickupModal && pickupParcel && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#d1d1d1]">
                                <div>
                                    <h3 className="text-base font-bold text-neutral-800">Mark as Picked Up</h3>
                                    <p className="text-xs text-[#5d5d5d] mt-0.5">{pickupParcel.receiverName || pickupParcel.parcelId}</p>
                                </div>
                                <button onClick={() => setShowPickupModal(false)} className="text-gray-400 hover:text-neutral-800 p-1 hover:bg-gray-100 rounded">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {/* Owner toggle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${pickupIsOwner ? "border-[#ea690c] bg-orange-50" : "border-[#d1d1d1] hover:bg-gray-50"}`}>
                                        <input type="radio" checked={pickupIsOwner} onChange={() => setPickupIsOwner(true)} className="w-4 h-4 text-[#ea690c]" />
                                        <div>
                                            <p className="text-sm font-medium text-neutral-800">Owner</p>
                                            <p className="text-xs text-gray-400">Receiver picked up</p>
                                        </div>
                                    </label>
                                    <label className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${!pickupIsOwner ? "border-[#ea690c] bg-orange-50" : "border-[#d1d1d1] hover:bg-gray-50"}`}>
                                        <input type="radio" checked={!pickupIsOwner} onChange={() => setPickupIsOwner(false)} className="w-4 h-4 text-[#ea690c]" />
                                        <div>
                                            <p className="text-sm font-medium text-neutral-800">Someone Else</p>
                                            <p className="text-xs text-gray-400">Third party pickup</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Owner details (read-only) */}
                                {pickupIsOwner && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-[#f0f0f0] space-y-1 text-xs text-gray-600">
                                        <p>Name: <span className="font-medium text-neutral-800">{pickupParcel.receiverName || "N/A"}</span></p>
                                        <p>Phone: <span className="font-medium text-neutral-800">{pickupParcel.recieverPhoneNumber || "N/A"}</span></p>
                                    </div>
                                )}

                                {/* Third party fields */}
                                {!pickupIsOwner && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-1.5">Full Name <span className="text-[#e22420]">*</span></label>
                                            <Input value={pickupName} onChange={e => setPickupName(e.target.value)} placeholder="Name of person picking up" className="border-[#d1d1d1] focus:border-[#ea690c]" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-neutral-800 mb-1.5">Phone Number <span className="text-[#e22420]">*</span></label>
                                            <Input
                                                value={pickupPhone}
                                                onChange={e => setPickupPhone(e.target.value)}
                                                placeholder="e.g. 0541234567"
                                                className={`border focus:border-[#ea690c] ${pickupPhone && !validatePhoneNumber(pickupPhone) ? "border-red-400" : "border-[#d1d1d1]"}`}
                                            />
                                            {pickupPhone && !validatePhoneNumber(pickupPhone) && (
                                                <p className="text-xs text-red-500 mt-1">Enter a valid Ghana phone number (e.g. 0541234567)</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <Button onClick={() => setShowPickupModal(false)} variant="outline" className="flex-1 border-[#d1d1d1]" disabled={markPickupLoading}>Cancel</Button>
                                    <Button
                                        onClick={handleMarkPickedUp}
                                        disabled={markPickupLoading || (!pickupIsOwner && (!pickupName.trim() || !validatePhoneNumber(pickupPhone)))}
                                        className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50"
                                    >
                                        {markPickupLoading ? <><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Confirm Pickup"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Request Delivery Modal */}
            {selectedParcel && requestDelivery && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <Card className="w-full max-w-lg border border-[#d1d1d1] bg-white shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#d1d1d1]">
                                <div>
                                    <h3 className="text-base font-bold text-neutral-800">Request Home Delivery</h3>
                                    <p className="text-xs text-[#5d5d5d] mt-0.5">{selectedParcel.receiverName || selectedParcel.parcelId}</p>
                                </div>
                                <button onClick={() => setRequestDelivery(false)} className="text-gray-400 hover:text-neutral-800 p-1 hover:bg-gray-100 rounded">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                                        Delivery Address <span className="text-[#e22420]">*</span>
                                    </label>
                                    <Input
                                        value={deliveryAddress}
                                        onChange={e => setDeliveryAddress(e.target.value)}
                                        placeholder="Enter full delivery address"
                                        className="border-[#d1d1d1] focus:border-[#ea690c]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                                        Delivery Location on Map <span className="text-[#e22420]">*</span>
                                    </label>
                                    <DeliveryLocationPicker
                                        value={deliveryPin}
                                        onChange={(loc) => {
                                            setDeliveryPin(loc);
                                            if (loc && !deliveryAddress.trim()) setDeliveryAddress(loc.address || loc.name);
                                        }}
                                        onAvailabilityChange={setPinMapAvailable}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-1.5">Delivery Fee (GHC)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={deliveryCostInput}
                                        onChange={e => setDeliveryCostInput(e.target.value)}
                                        placeholder="e.g. 15.00"
                                        className="border-[#d1d1d1] focus:border-[#ea690c]"
                                    />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <Button onClick={() => setRequestDelivery(false)} variant="outline" className="flex-1 border-[#d1d1d1]" disabled={savingDelivery}>Cancel</Button>
                                    <Button
                                        onClick={handleRequestDelivery}
                                        disabled={savingDelivery || !deliveryAddress.trim() || (pinMapAvailable && !deliveryPin)}
                                        className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50"
                                    >
                                        {savingDelivery ? <><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Confirm Request"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Shelf Update Modal */}
            {selectedParcel && editingShelf && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-neutral-800">Update Shelf Location</h3>
                                <button
                                    onClick={() => {
                                        setEditingShelf(false);
                                        setSelectedParcel(null);
                                    }}
                                    className="text-[#9a9a9a] hover:text-neutral-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                        Parcel: {selectedParcel.receiverName || selectedParcel.parcelId}
                                    </label>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                        Current Shelf: {selectedParcel.shelfName || selectedParcel.shelfNumber || "Not set"}
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-800 mb-2">
                                        New Shelf Location <span className="text-[#e22420]">*</span>
                                    </label>
                                    <select
                                        value={newShelfLocation}
                                        onChange={(e) => setNewShelfLocation(e.target.value)}
                                        className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea690c]"
                                    >
                                        <option value="">Select a shelf</option>
                                        {shelves.map((s) => (
                                            <option key={s.id} value={s.name}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={() => {
                                            setEditingShelf(false);
                                            setSelectedParcel(null);
                                        }}
                                        variant="outline"
                                        className="flex-1 border border-[#d1d1d1]"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateShelf}
                                        disabled={!newShelfLocation}
                                        className="flex-1 bg-[#ea690c] text-white hover:bg-[#ea690c]/90"
                                    >
                                        Update Shelf
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delivery Pin Modal */}
            {selectedParcel && editingPin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <Card className="w-full max-w-lg border border-[#d1d1d1] bg-white shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#d1d1d1]">
                                <div>
                                    <h3 className="text-base font-bold text-neutral-800">
                                        {locationFromParcel(selectedParcel) ? "Change Delivery Pin" : "Add Delivery Pin"}
                                    </h3>
                                    <p className="text-xs text-[#5d5d5d] mt-0.5">
                                        {selectedParcel.receiverName || selectedParcel.parcelId}
                                        {selectedParcel.receiverAddress ? ` · ${selectedParcel.receiverAddress}` : ""}
                                    </p>
                                </div>
                                <button onClick={() => setEditingPin(false)} className="text-gray-400 hover:text-neutral-800 p-1 hover:bg-gray-100 rounded" aria-label="Close">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-[#5d5d5d] mb-3">
                                Search a nearby landmark or pin the exact spot. Riders get directions to this point.
                                {selectedParcel.parcelAssigned && " This parcel is already with a rider; they'll see the new pin when their list refreshes."}
                            </p>
                            <DeliveryLocationPicker value={deliveryPin} onChange={setDeliveryPin} />
                            <div className="flex gap-3 pt-5">
                                <Button onClick={() => setEditingPin(false)} variant="outline" className="flex-1 border-[#d1d1d1]" disabled={savingPin}>Cancel</Button>
                                <Button
                                    onClick={handleSavePin}
                                    disabled={savingPin || sameLocation(locationFromParcel(selectedParcel), deliveryPin)}
                                    className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50"
                                >
                                    {savingPin ? <><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</> : deliveryPin ? "Save Pin" : "Remove Pin"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Parcel Details Modal */}
            {selectedParcel && !editingShelf && (
                <ParcelDetailModal
                    parcel={selectedParcel}
                    activeDelivery={activeDelivery}
                    activeDeliveryLoading={activeDeliveryLoading}
                    onClose={() => setSelectedParcel(null)}
                    onMarkPickup={() => {
                        setPickupIsOwner(true);
                        setPickupName("");
                        setPickupPhone("");
                        setPickupParcel(selectedParcel);
                        setSelectedParcel(null);
                        setShowPickupModal(true);
                    }}
                    onPrint={() => setShowPrintPreview(true)}
                    onEditShelf={() => { setEditingShelf(true); setShowActionMenu(false); }}
                    onRequestDelivery={() => { setRequestDelivery(true); setDeliveryAddress(selectedParcel.receiverAddress || ""); setDeliveryCostInput(selectedParcel.deliveryCost ? String(selectedParcel.deliveryCost) : ""); setDeliveryPin(locationFromParcel(selectedParcel)); setShowActionMenu(false); }}
                    onEditPin={() => { setDeliveryPin(locationFromParcel(selectedParcel)); setEditingPin(true); setShowActionMenu(false); }}
                    onCancelDelivery={async () => { setShowActionMenu(false); const res = await frontdeskService.updateParcel(selectedParcel.parcelId, { homeDelivery: false, deliveryCost: 0, receiverAddress: "" }); if (res.success) { showToast("Home delivery cancelled", "success"); await refreshParcels(); setSelectedParcel(null); } else showToast(res.message || "Failed", "error"); }}
                    onSaved={async () => { await refreshParcels(); }}
                    showActionMenu={showActionMenu}
                    onToggleActionMenu={() => setShowActionMenu(p => !p)}
                    actionMenuRef={actionMenuRef}
                />
            )}

            {/* Print Label Preview Modal */}
            {showPrintPreview && (
                <PrintLabelModal
                    parcels={
                        checkedParcels.size > 0
                            ? filteredParcels.filter(p => checkedParcels.has(p.parcelId))
                            : selectedParcel ? [selectedParcel] : []
                    }
                    title={checkedParcels.size > 0 ? `Print ${checkedParcels.size} Label${checkedParcels.size > 1 ? 's' : ''}` : 'Print Parcel Label'}
                    onClose={() => setShowPrintPreview(false)}
                />
            )}
        </div>
    );
};


// ─── Parcel Detail Modal ──────────────────────────────────────────────────────
interface ParcelDetailModalProps {
    parcel: ParcelResponse;
    activeDelivery: any;
    activeDeliveryLoading: boolean;
    onClose: () => void;
    onMarkPickup: () => void;
    onPrint: () => void;
    onEditShelf: () => void;
    onRequestDelivery: () => void;
    onCancelDelivery: () => void;
    onEditPin: () => void;
    onSaved: () => void;
    showActionMenu: boolean;
    onToggleActionMenu: () => void;
    actionMenuRef: React.RefObject<HTMLDivElement>;
}

const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
    parcel, activeDelivery, activeDeliveryLoading, onClose, onMarkPickup, onPrint, onEditShelf,
    onRequestDelivery, onCancelDelivery, onEditPin, onSaved,
    showActionMenu, onToggleActionMenu, actionMenuRef,
}) => {
    const { showToast } = useToast();
    const { userRole } = useStation();
    const { shelves } = useShelf();
    const pin = locationFromParcel(parcel);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        receiverName:        parcel.receiverName || "",
        recieverPhoneNumber: parcel.recieverPhoneNumber || "",
        receiverAddress:     parcel.receiverAddress || "",
        parcelDescription:   parcel.parcelDescription || "",
        senderName:          parcel.senderName || "",
        senderPhoneNumber:   parcel.senderPhoneNumber || "",
        shelfNumber:         parcel.shelfId || parcel.shelfNumber || "",
        inboundCost:         parcel.inboundCost?.toString() || "",
        pickUpCost:          parcel.pickUpCost?.toString() || "",
        fragile:             parcel.fragile || false,
        pod:                 parcel.pod || false,
    });
    const images: string[] = parcel.imageUrls ?? parcel.images ?? [];
    const canEdit = userRole === "MANAGER" || userRole === "FRONTDESK";

    const handleSave = async () => {
        setSaving(true);
        try {
            const selectedShelf = shelves.find(s => s.name === editForm.shelfNumber);
            const res = await frontdeskService.updateParcel(parcel.parcelId, {
                receiverName:        editForm.receiverName || undefined,
                recieverPhoneNumber: editForm.recieverPhoneNumber || undefined,
                receiverAddress:     editForm.receiverAddress || undefined,
                parcelDescription:   editForm.parcelDescription || undefined,
                senderName:          editForm.senderName || undefined,
                senderPhoneNumber:   editForm.senderPhoneNumber || undefined,
                shelfNumber:         selectedShelf?.id || editForm.shelfNumber || undefined,
                inboundCost:         editForm.inboundCost ? parseFloat(editForm.inboundCost) : undefined,
                pickUpCost:          editForm.pickUpCost ? parseFloat(editForm.pickUpCost) : undefined,
                fragile:             editForm.fragile,
                pod:                 editForm.pod,
            });
            if (res.success) {
                showToast("Parcel updated successfully", "success");
                setEditMode(false);
                onSaved();
            } else {
                showToast(res.message || "Failed to update parcel", "error");
            }
        } catch {
            showToast("Failed to update parcel", "error");
        } finally {
            setSaving(false);
        }
    };

    // Lock body scroll while open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    // Close on Escape
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            if (lightboxIndex !== null) setLightboxIndex(null);
            else onClose();
        }
        if (lightboxIndex !== null) {
            if (e.key === "ArrowRight") setLightboxIndex(i => i !== null ? (i + 1) % images.length : null);
            if (e.key === "ArrowLeft") setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null);
        }
    }, [lightboxIndex, images.length, onClose]);

    useEffect(() => {
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [handleKey]);

    const statusLabel = parcel.delivered ? "Delivered" : parcel.pickedUp ? "Picked Up" : parcel.pod ? "POD" : parcel.parcelAssigned ? "Assigned" : parcel.hasCalled ? "Called" : "Registered";

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="pointer-events-auto w-full max-w-xl bg-white flex flex-col max-h-[90vh] shadow-xl"
                    style={{ borderRadius: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-sm font-semibold text-neutral-800 leading-tight">Parcel Details</p>
                                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{parcel.parcelId}</p>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-[11px] font-medium px-2 py-0.5 bg-neutral-100 text-neutral-600">{statusLabel}</span>
                                {parcel.homeDelivery && <span className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-500">Home Delivery</span>}
                                {parcel.fragile && <span className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-500">Fragile</span>}
                                {parcel.pod && <span className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-500">POD</span>}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">

                        {/* Active Delivery */}
                        {activeDeliveryLoading && (
                            <div className="px-5 py-3 flex items-center gap-2 text-xs text-neutral-400">
                                <Loader className="w-3.5 h-3.5 animate-spin" /> Loading delivery info…
                            </div>
                        )}
                        {!activeDeliveryLoading && activeDelivery && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Active Delivery</p>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <Field label="Status" value={activeDelivery.status} />
                                    {activeDelivery.riderInfo?.riderName && <Field label="Rider" value={activeDelivery.riderInfo.riderName} />}
                                    {activeDelivery.riderInfo?.riderPhoneNumber && <Field label="Rider Phone" value={formatPhoneNumber(activeDelivery.riderInfo.riderPhoneNumber)} />}
                                    {activeDelivery.amount != null && <Field label="Amount" value={`GHC ${Number(activeDelivery.amount).toFixed(2)}`} />}
                                    {activeDelivery.assignedAt && <Field label="Assigned At" value={new Date(activeDelivery.assignedAt).toLocaleString()} />}
                                    {activeDelivery.completedAt && <Field label="Completed At" value={new Date(activeDelivery.completedAt).toLocaleString()} />}
                                    {activeDelivery.returnReason && <Field label="Return Reason" value={activeDelivery.returnReason} span />}
                                </div>
                            </div>
                        )}

                        {/* Images */}
                        {images.length > 0 && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Images ({images.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {images.map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setLightboxIndex(i)}
                                            className="w-20 h-20 overflow-hidden border border-neutral-200 hover:border-neutral-500 transition-colors focus:outline-none"
                                        >
                                            <img src={url} alt={`img-${i + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recipient */}
                        <div className="px-5 py-4">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Recipient</p>
                            {editMode ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Name</p>
                                        <input value={editForm.receiverName} onChange={e => setEditForm(p => ({ ...p, receiverName: e.target.value }))}
                                            className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Phone</p>
                                        <input value={editForm.recieverPhoneNumber} onChange={e => setEditForm(p => ({ ...p, recieverPhoneNumber: e.target.value }))}
                                            className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Delivery Address</p>
                                        <input value={editForm.receiverAddress} onChange={e => setEditForm(p => ({ ...p, receiverAddress: e.target.value }))}
                                            className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <Field label="Name" value={parcel.receiverName} />
                                    <Field label="Phone" value={parcel.recieverPhoneNumber ? formatPhoneNumber(parcel.recieverPhoneNumber) : undefined} />
                                    {parcel.receiverAddress && <Field label="Address" value={parcel.receiverAddress} span />}
                                    {parcel.homeDelivery && (
                                        <div className="col-span-2">
                                            <p className="text-[11px] text-neutral-400 mb-0.5">Delivery pin</p>
                                            {pin ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <MapPin className="w-3.5 h-3.5 text-[#ea690c] shrink-0" />
                                                    <span className="text-sm text-neutral-800">{pin.name}</span>
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`}
                                                        target="_blank" rel="noreferrer"
                                                        className="text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-800"
                                                    >
                                                        View on map
                                                    </a>
                                                    {!parcel.delivered && (
                                                        <button onClick={onEditPin} className="text-xs font-medium text-[#ea690c] hover:underline">Change</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm text-amber-700">No pin yet; riders get directions from the address text</span>
                                                    {!parcel.delivered && (
                                                        <button onClick={onEditPin} className="text-xs font-medium text-[#ea690c] hover:underline">Add pin</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sender */}
                        <div className="px-5 py-4">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Sender</p>
                            {editMode ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Name</p>
                                        <input value={editForm.senderName} onChange={e => setEditForm(p => ({ ...p, senderName: e.target.value }))}
                                            className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Phone</p>
                                        <input value={editForm.senderPhoneNumber} onChange={e => setEditForm(p => ({ ...p, senderPhoneNumber: e.target.value }))}
                                            className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                </div>
                            ) : (
                                (parcel.senderName || parcel.senderPhoneNumber) ? (
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                        <Field label="Name" value={parcel.senderName} />
                                        <Field label="Phone" value={parcel.senderPhoneNumber ? formatPhoneNumber(parcel.senderPhoneNumber) : undefined} />
                                    </div>
                                ) : <p className="text-xs text-neutral-400">No sender info</p>
                            )}
                        </div>

                        {/* Description — editable */}
                        {editMode && (
                            <div className="px-5 py-4 space-y-4">
                                <div>
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Parcel Description</p>
                                    <textarea value={editForm.parcelDescription} onChange={e => setEditForm(p => ({ ...p, parcelDescription: e.target.value }))}
                                        rows={2}
                                        className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c] resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Inbound Cost (GHC)</p>
                                        <input type="number" step="0.01" value={editForm.inboundCost} onChange={e => setEditForm(p => ({ ...p, inboundCost: e.target.value }))}
                                            placeholder="0.00" className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Pick Up Cost (GHC)</p>
                                        <input type="number" step="0.01" value={editForm.pickUpCost} onChange={e => setEditForm(p => ({ ...p, pickUpCost: e.target.value }))}
                                            placeholder="0.00" className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Shelf Location</p>
                                    <select value={editForm.shelfNumber} onChange={e => setEditForm(p => ({ ...p, shelfNumber: e.target.value }))}
                                        className="w-full border border-neutral-300 px-2 py-1.5 text-sm focus:outline-none focus:border-[#ea690c]">
                                        <option value="">No shelf</option>
                                        {shelves.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editForm.fragile} onChange={e => setEditForm(p => ({ ...p, fragile: e.target.checked }))}
                                            className="w-4 h-4 accent-[#ea690c]" />
                                        <span className="text-sm text-neutral-700">Fragile</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editForm.pod} onChange={e => setEditForm(p => ({ ...p, pod: e.target.checked }))}
                                            className="w-4 h-4 accent-[#ea690c]" />
                                        <span className="text-sm text-neutral-700">POD</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Driver */}
                        {parcel.driverName && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Driver</p>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <Field label="Name" value={parcel.driverName} />
                                    <Field label="Phone" value={parcel.driverPhoneNumber ? formatPhoneNumber(parcel.driverPhoneNumber) : undefined} />
                                    <Field label="Vehicle" value={parcel.vehicleNumber} />
                                </div>
                            </div>
                        )}

                        {/* Rider */}
                        {parcel.riderInfo && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Rider</p>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <Field label="Name" value={parcel.riderInfo.riderName} />
                                    <Field label="Phone" value={parcel.riderInfo.riderPhoneNumber ? formatPhoneNumber(parcel.riderInfo.riderPhoneNumber) : undefined} />
                                </div>
                            </div>
                        )}

                        {/* Parcel Info */}
                        <div className="px-5 py-4">
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Parcel Info</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                <Field label="Shelf" value={parcel.shelfName || parcel.shelfNumber} />
                                {parcel.parcelWeight != null && <Field label="Weight" value={`${parcel.parcelWeight} kg`} />}
                                {parcel.hasCalled != null && <Field label="Has Called" value={parcel.hasCalled ? "Yes" : "No"} />}
                                {parcel.inboudPayed != null && <Field label="Inbound Paid" value={parcel.inboudPayed ? "Yes" : "No"} />}
                                {parcel.registeredDate && <Field label="Registered" value={new Date(parcel.registeredDate).toLocaleString()} span />}
                                {parcel.parcelDescription && <Field label="Description" value={parcel.parcelDescription} span />}
                            </div>
                        </div>

                        {/* Costs */}
                        {(parcel.inboundCost != null || parcel.deliveryCost != null || parcel.pickUpCost != null || parcel.storageCost != null) && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Costs</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {parcel.inboundCost != null && (
                                        <div className="border border-neutral-200 px-3 py-2">
                                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-0.5">Inbound</p>
                                            <p className="text-sm font-semibold text-neutral-800">GHC {parcel.inboundCost.toFixed(2)}</p>
                                        </div>
                                    )}
                                    {parcel.deliveryCost != null && (
                                        <div className="border border-neutral-200 px-3 py-2">
                                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-0.5">Delivery</p>
                                            <p className="text-sm font-semibold text-neutral-800">GHC {parcel.deliveryCost.toFixed(2)}</p>
                                        </div>
                                    )}
                                    {parcel.pickUpCost != null && (
                                        <div className="border border-neutral-200 px-3 py-2">
                                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-0.5">Pickup</p>
                                            <p className="text-sm font-semibold text-neutral-800">GHC {parcel.pickUpCost.toFixed(2)}</p>
                                        </div>
                                    )}
                                    {parcel.storageCost != null && (
                                        <div className="border border-neutral-200 px-3 py-2">
                                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-0.5">Storage</p>
                                            <p className="text-sm font-semibold text-neutral-800">GHC {parcel.storageCost.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-neutral-200 shrink-0 flex items-center gap-2 flex-wrap">
                        {editMode ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-8 px-4 text-xs font-semibold bg-[#ea690c] text-white hover:bg-[#d45d0a] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {saving ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> Saving...</> : "Save Changes"}
                                </button>
                                <button
                                    onClick={() => { setEditMode(false); setEditForm({ receiverName: parcel.receiverName || "", recieverPhoneNumber: parcel.recieverPhoneNumber || "", receiverAddress: parcel.receiverAddress || "", parcelDescription: parcel.parcelDescription || "", senderName: parcel.senderName || "", senderPhoneNumber: parcel.senderPhoneNumber || "", shelfNumber: parcel.shelfId || parcel.shelfNumber || "", inboundCost: parcel.inboundCost?.toString() || "", pickUpCost: parcel.pickUpCost?.toString() || "", fragile: parcel.fragile || false, pod: parcel.pod || false }); }}
                                    className="h-8 px-3 text-xs font-medium border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                {!parcel.pickedUp && (
                                    <button onClick={onMarkPickup} className="h-8 px-3 text-xs font-medium bg-[#ea690c] text-white hover:bg-[#d45d0a] transition-colors">
                                        Mark Picked Up
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={() => setEditMode(true)} className="h-8 px-3 text-xs font-medium border border-[#ea690c] text-[#ea690c] hover:bg-orange-50 transition-colors flex items-center gap-1.5">
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                    </button>
                                )}
                                <button onClick={onPrint} className="h-8 px-3 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
                                    <PrinterIcon className="w-3.5 h-3.5" /> Print Label
                                </button>
                                <div className="relative" ref={actionMenuRef}>
                                    <button onClick={onToggleActionMenu} className="h-8 px-3 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5">
                                        <MoreHorizontal className="w-3.5 h-3.5" /> Actions <ChevronDown className="w-3 h-3 ml-0.5" />
                                    </button>
                                    {showActionMenu && (
                                        <div className="absolute bottom-full mb-1 left-0 min-w-[190px] bg-white border border-neutral-200 shadow-lg z-10 overflow-hidden">
                                            <button onClick={onEditShelf} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left">
                                                <Edit className="w-3.5 h-3.5 text-neutral-400" /> Update Shelf
                                            </button>
                                            {!parcel.delivered && !parcel.parcelAssigned && !parcel.homeDelivery && (
                                                <button onClick={onRequestDelivery} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left">
                                                    <Home className="w-3.5 h-3.5 text-neutral-400" /> Request Home Delivery
                                                </button>
                                            )}
                                            {parcel.homeDelivery && !parcel.delivered && (
                                                <button onClick={onEditPin} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left">
                                                    <MapPin className="w-3.5 h-3.5 text-neutral-400" /> {pin ? "Change Delivery Pin" : "Set Delivery Pin"}
                                                </button>
                                            )}
                                            {parcel.homeDelivery && !parcel.delivered && !parcel.parcelAssigned && (
                                                <button onClick={onCancelDelivery} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left">
                                                    <X className="w-3.5 h-3.5 text-neutral-400" /> Cancel Home Delivery
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={onClose} className="h-8 px-3 text-xs font-medium border border-neutral-300 text-neutral-500 hover:bg-neutral-50 transition-colors ml-auto">Close</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
                    onClick={() => setLightboxIndex(null)}
                >
                    {images.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + images.length) % images.length : null); }}
                            className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <img
                        src={images[lightboxIndex]}
                        alt={`img-${lightboxIndex + 1}`}
                        className="max-h-[85vh] max-w-[85vw] object-contain shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />
                    {images.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % images.length : null); }}
                            className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <p className="absolute bottom-4 text-white/50 text-xs tracking-widest">{lightboxIndex + 1} / {images.length}</p>
                </div>
            )}
        </>
    );
};

const Field: React.FC<{ label: string; value?: string | null; span?: boolean }> = ({ label, value, span }) => {
    if (!value) return null;
    return (
        <div className={span ? "col-span-2" : ""}>
            <p className="text-[11px] text-neutral-400 mb-0.5 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-neutral-800">{value}</p>
        </div>
    );
};
