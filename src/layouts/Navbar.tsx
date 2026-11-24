import React, { useState, useRef, useEffect } from "react";
import { Menu, BellIcon, SettingsIcon, ChevronDownIcon, HelpCircleIcon, LogOut, Moon, Sun, Package, Truck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useStation } from "../contexts/StationContext";
import { useTheme } from "../contexts/ThemeContext";

interface NavbarProps {
    onMenuClick: () => void;
}

const routeTitles: Record<string, { title: string; description: string }> = {
    // Parcel Hub
    "/parcel/search": { title: "Parcel Search", description: "Find parcels by recipient, phone, ID, or date range" },
    "/parcel/intake": { title: "Parcel Intake", description: "Manage parcel intake, assignments, and payments" },
    "/parcel/smart-search": { title: "Smart Search", description: "Search parcels by customer phone number" },
    "/parcel/edit": { title: "Edit Parcels", description: "Edit parcel information and properties (Manager Only)" },
    "/parcel/transfer": { title: "Parcel Transfer", description: "Transfer parcels between stations" },
    "/parcel/incoming": { title: "Incoming Parcels", description: "View and manage incoming parcels" },
    "/parcel/outgoing": { title: "Outgoing Parcels", description: "View and manage outgoing parcels" },
    "/parcel/shelf": { title: "Shelves", description: "Manage parcel shelf locations for this office" },
    "/parcel/pickup": { title: "Pickup Request", description: "Request pickup of parcels from one location for delivery to another" },
    "/parcel/driver-tracker": { title: "Driver Tracker", description: "Track inbound driver reconciliation" },
    "/parcel/assignments": { title: "Package Assignments", description: "Select parcels to assign to riders" },
    "/parcel/settings": { title: "Settings", description: "Manage branch configuration and account preferences" },
    "/parcel/branch-settings": { title: "Branch Settings", description: "Branding, branch details, printing and station charges" },
    "/parcel/preferences": { title: "Settings", description: "Manage branch configuration and account preferences" },
    "/parcel/help": { title: "Help & Support", description: "Get help and support for using the system" },
    // Delivery Hub
    "/delivery/assignments": { title: "Package Assignments", description: "Select parcels to assign to riders" },
    "/delivery/rider-selection": { title: "Rider Selection", description: "Select an available rider for delivery" },
    "/delivery/active": { title: "Active Deliveries", description: "View and manage ongoing deliveries" },
    "/delivery/reconciliation": { title: "Reconciliation", description: "Reconcile rider payments and commissions" },
    "/delivery/reconciliation-confirmation": { title: "Reconciliation Confirmation", description: "Confirm reconciliation details" },
    "/delivery/analytics": { title: "Reconciliation Analytics", description: "Analytics and insights on reconciliation" },
    "/delivery/rider-detail": { title: "Rider Detail", description: "View detailed rider performance" },
    // "/delivery/financial": { title: "Financial Dashboard", description: "View financial overview and reports" },
    // "/delivery/fuel-requests":            { title: "Fuel Requests",             description: "Manage rider fuel requests" },
    // "/delivery/call-center":              { title: "Pre-Delivery Queue",        description: "Contact customers and record delivery preferences" },
    "/delivery/call-center/follow-up": { title: "Post-Delivery Follow-Up", description: "Follow up on delivered parcels" },
    "/delivery/call-center/home-delivery": { title: "Home Delivery Watchlist", description: "Monitor home delivery requests" },
    "/delivery/intake": { title: "Parcel Intake", description: "Manage parcel intake, assignments, and payments" },
    "/delivery/search": { title: "Parcel Search", description: "Find parcels by recipient, phone, ID, or date range" },
    "/delivery/pickup": { title: "Pickup Request", description: "Request pickup of parcels from one location for delivery to another" },
    "/delivery/addresses": { title: "Saved Addresses", description: "Delivery address presets with cost for this office" },
    "/delivery/smart-search": { title: "Smart Search", description: "Search parcels by customer phone number" },
    "/delivery/settings": { title: "Settings", description: "Manage branch configuration and account preferences" },
    "/delivery/branch-settings": { title: "Branch Settings", description: "Branding, branch details, printing and station charges" },
    "/delivery/preferences": { title: "Settings", description: "Manage branch configuration and account preferences" },
    "/delivery/help": { title: "Help & Support", description: "Get help and support for using the system" },
    // Admin Shell
    "/admin/dashboard": { title: "Admin Dashboard", description: "System-wide overview and analytics" },
    "/admin/statistics": { title: "Delivery Statistics", description: "Revenue, delivery, and rider performance built from live reconciliation records" },
    "/admin/stations": { title: "Station Management", description: "Create and manage all delivery stations" },
    "/admin/users": { title: "User Management", description: "Manage all system users across stations" },
    "/admin/parcels": { title: "System Parcel Overview", description: "Global visibility of all parcels across all stations" },
    "/admin/reconciliation": { title: "Admin Reconciliation", description: "Reconcile payments across all stations" },
    "/admin/delivery-analytics": { title: "Delivery Analytics", description: "Monthly delivery performance and comparison across stations" },
    "/admin/rider-detail": { title: "Rider Performance", description: "Detailed monthly performance report for a rider" },
    "/admin/financial": { title: "Financial Dashboard", description: "Financial overview across all stations" },
    "/admin/financial-reports": { title: "Financial Reports", description: "Comprehensive financial analytics and insights" },
    "/admin/system-logs": { title: "System Logs", description: "View system activity and audit logs" },
    "/admin/fuel-requests": { title: "Fuel Requests", description: "Manage all rider fuel requests" },
    "/admin/settings": { title: "Tenant Settings", description: "Configure branding and settings for this tenant" },
    "/admin/billing": { title: "Billing & Subscription", description: "Manage your plan, payment method, and billing details" },
    "/admin/delivery-income": { title: "Delivery Income", description: "Income generated by Delivery Hub operations" },
    "/admin/accountability": { title: "Delivery Accountability", description: "Delivery Hub work with costs attributed to the Parcel Hub" },
    "/admin/tenants": { title: "Tenant Management", description: "Manage all tenants across the platform" },
    "/admin/analytics": { title: "Cross-Tenant Analytics", description: "Analytics and insights across all tenants" },
    // Legacy sub-pages
    "/parcel-costs-pod": { title: "Parcel Costs & POD", description: "Review costs and upload proof of delivery" },
    "/parcel-review": { title: "Parcel Review", description: "Review parcel details before confirmation" },
    "/parcel-sms-success": { title: "SMS Sent Successfully", description: "Parcel registration completed" },
};

const getAccountMenuItems = (pathname: string) => {
    const isAdmin = pathname.startsWith("/admin");
    const isDelivery = pathname.startsWith("/delivery");
    const prefix = isAdmin ? "/parcel" : isDelivery ? "/delivery" : "/parcel";
    return [
        { label: "Preferences", icon: SettingsIcon, path: `${prefix}/preferences` },
        { label: "Help & Support", icon: HelpCircleIcon, path: `${prefix}/help` },
    ];
};

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, logout } = useStation();
    useTheme();
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const routeInfo = routeTitles[location.pathname] || {
        title: "Parcel Management",
        description: "Manage parcel operations",
    };
    const accountMenuItems = getAccountMenuItems(location.pathname);

    const isParcelShell = location.pathname.startsWith("/parcel");
    const isDeliveryShell = location.pathname.startsWith("/delivery");
    const showShellSwitcher = currentUser?.role === "MANAGER";

    const switchShell = () => {
        if (isParcelShell) {
            const last = localStorage.getItem("pf_last_delivery") || "/delivery/assignments";
            navigate(last);
        } else {
            const last = localStorage.getItem("pf_last_parcel") || "/parcel/intake";
            navigate(last);
        }
    };

    // Persist last visited path per shell
    useEffect(() => {
        if (isParcelShell) localStorage.setItem("pf_last_parcel", location.pathname);
        if (isDeliveryShell) localStorage.setItem("pf_last_delivery", location.pathname);
    }, [location.pathname, isParcelShell, isDeliveryShell]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowAccountMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const roleLabelMap: Record<string, string> = {
        ADMIN: "Admin",
        MANAGER: "Station Manager",
        FRONTDESK: "Front Desk",
        RIDER: "Rider",
        CALLER: "Call Center",
        VENDOR: "Vendor",
    };

    const getRoleLabel = (role: string) => {
        return roleLabelMap[role] || role.replace("-", " ");
    };

    return (
        <>
            <nav className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm">
                <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left Section - Menu and Title */}
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={onMenuClick}
                            className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 lg:hidden"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="hidden sm:flex flex-col items-start gap-0.5">
                            <h1 className="text-lg font-bold text-neutral-800 dark:text-gray-100">
                                {routeInfo.title}
                            </h1>
                            <p className="text-xs text-[#5d5d5d] dark:text-gray-400">
                                {routeInfo.description}
                            </p>
                        </div>

                        <div className="flex sm:hidden flex-col items-start gap-0.5">
                            <h1 className="text-base font-bold text-neutral-800 dark:text-gray-100">
                                {routeInfo.title}
                            </h1>
                        </div>
                    </div>

                    {/* Right Section - Icons and Account */}
                    <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
                        {/* Dark Mode Toggle - Temporarily Disabled */}

                        {/* Notifications */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                        >
                            <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 px-0 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/30">
                                <span className="text-white text-[9px] font-bold">
                                    9
                                </span>
                            </Badge>
                        </Button>

                        {/* Settings */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                        >
                            <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </Button>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                        {/* Account Menu */}
                        {currentUser && (
                            <div className="relative inline-flex items-center gap-2 sm:gap-3" ref={menuRef}>
                                <div className="hidden sm:inline-flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                                    <Avatar className="h-9 w-9 border-2 border-orange-200 dark:border-orange-900/30 shadow-md ring-2 ring-orange-100 dark:ring-orange-900/20">
                                        <AvatarImage src="/vector.svg" alt={currentUser.name} />
                                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold">
                                            {currentUser.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="hidden md:flex flex-col items-start gap-0.5">
                                        <div className="font-semibold text-sm text-neutral-800 dark:text-gray-100">
                                            {currentUser.name}
                                        </div>
                                        <div className="text-xs text-[#5d5d5d] dark:text-gray-400">
                                            {currentUser.office?.name || getRoleLabel(currentUser.role)}
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:hidden">
                                    <Avatar className="h-8 w-8 border-2 border-orange-200 dark:border-orange-900/30 shadow-md">
                                        <AvatarImage src="/vector.svg" alt={currentUser.name} />
                                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold text-xs">
                                            {currentUser.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-5 p-0 hover:opacity-70 transition-opacity"
                                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                                >
                                    <ChevronDownIcon className={`w-4 h-4 text-[#5d5d5d] transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} />
                                </Button>

                                {/* Account Dropdown Menu */}
                                {showAccountMenu && (
                                    <div className="absolute right-0 top-full mt-3 w-72 rounded-xl border border-[#d1d1d1] dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50">
                                        {/* Header */}
                                        <div className="p-4 border-b border-[#d1d1d1] dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-11 w-11 border border-solid border-[#d1d1d1]">
                                                    <AvatarImage src="/vector.svg" alt={currentUser.name} />
                                                    <AvatarFallback>
                                                        {currentUser.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()
                                                            .slice(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold text-neutral-800 dark:text-gray-100 text-sm">
                                                        {currentUser.name}
                                                    </div>
                                                    <div className="text-xs text-[#5d5d5d] dark:text-gray-400">
                                                        {currentUser.office?.name || getRoleLabel(currentUser.role)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2">
                                            {showShellSwitcher && (
                                                <button
                                                    onClick={() => { switchShell(); setShowAccountMenu(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors mb-1"
                                                >
                                                    {isParcelShell ? (
                                                        <Truck className="w-4 h-4 text-[#ea690c]" />
                                                    ) : (
                                                        <Package className="w-4 h-4 text-[#ea690c]" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {isParcelShell ? "Switch to Delivery Hub" : "Switch to Parcel Hub"}
                                                    </span>
                                                </button>
                                            )}
                                            <div className="font-semibold text-neutral-800 dark:text-gray-300 text-xs px-3 py-2 mb-1 uppercase tracking-wide text-[#5d5d5d] dark:text-gray-400">
                                                My Account
                                            </div>
                                            {accountMenuItems.map((item, index) => {
                                                const Icon = item.icon;
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setShowAccountMenu(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                                            ? "bg-[#ea690c] text-white shadow-sm"
                                                            : "text-neutral-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                            }`}
                                                    >
                                                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[#5d5d5d]"}`} />
                                                        <span className="text-sm font-medium text-left flex-1">
                                                            {item.label}
                                                        </span>
                                                        {isActive && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-[#d1d1d1] dark:border-gray-700 p-2">
                                            <button
                                                onClick={() => {
                                                    setShowAccountMenu(false);
                                                    setShowLogoutConfirm(true);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#e22420] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span className="text-sm font-medium text-left">
                                                    Logout
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Logout Confirm Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-[#d1d1d1] dark:border-gray-700 w-full max-w-sm p-6">
                        <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Confirm Logout</h3>
                        <p className="text-sm text-[#5d5d5d] dark:text-gray-400 mb-5">Are you sure you want to log out?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-[#d1d1d1] dark:border-gray-700 text-sm font-medium text-neutral-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { logout(); navigate("/login"); }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
