import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, ClipboardListIcon, TruckIcon, DollarSignIcon, PhoneIcon, HomeIcon, CheckCircleIcon, BarChart2, LogOut, ZapIcon, SearchIcon, Package, MapPin, Map as MapIcon, Edit, Building2 } from "lucide-react";
import { useStation } from "../contexts/StationContext";
import { useBranding } from "../contexts/BrandingContext";

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const navItems = [
    { label: "Parcel Search", path: "/delivery/search", icon: SearchIcon, roles: ["FRONTDESK", "MANAGER"] },
    { label: "Parcel Intake", path: "/delivery/intake", icon: ClipboardListIcon, roles: ["FRONTDESK", "MANAGER"] },
    { label: "Pickup Request", path: "/delivery/pickup", icon: Package, roles: ["FRONTDESK", "MANAGER"] },
    { label: "Package Assignments", path: "/delivery/assignments", icon: ClipboardListIcon, roles: ["MANAGER"] },
    { label: "Active Deliveries", path: "/delivery/active", icon: TruckIcon, roles: ["MANAGER"] },
    { label: "Rider Map", path: "/delivery/rider-map", icon: MapIcon, roles: ["MANAGER"] },
    { label: "Pre-Delivery", path: "/delivery/call-center", icon: PhoneIcon, roles: ["MANAGER", "CALLER"] },
    { label: "Home Delivery", path: "/delivery/call-center/home-delivery", icon: HomeIcon, roles: ["CALLER"] },
    { label: "Post-Delivery", path: "/delivery/call-center/follow-up", icon: CheckCircleIcon, roles: ["CALLER"] },
    { label: "Reconciliation", path: "/delivery/reconciliation", icon: DollarSignIcon, roles: ["MANAGER"] },
    { label: "Analytics", path: "/delivery/analytics", icon: BarChart2, roles: ["MANAGER"] },
    { label: "Smart Search", path: "/delivery/smart-search", icon: ZapIcon, roles: ["MANAGER", "CALLER"] },
    { label: "Edit Parcels", path: "/delivery/edit", icon: Edit, roles: ["MANAGER"] },
    { label: "Addresses", path: "/delivery/addresses", icon: MapPin, roles: ["FRONTDESK", "MANAGER"] },
    { label: "Branch Settings", path: "/delivery/branch-settings", icon: Building2, roles: ["MANAGER"] },
];

export const DeliverySidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
    const location = useLocation();
    const { userRole, logout } = useStation();
    const { branding } = useBranding();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const filtered = navItems.filter(item => userRole && item.roles.includes(userRole));

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={onToggle} />
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950 transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200 dark:border-gray-800 shadow-xl flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>

                {/* Header */}
                <div className="flex h-auto items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            {branding.logoUrl ? (
                                <img className="h-[40px] w-[40px] object-cover rounded-lg shadow-lg" alt="Logo" src={branding.logoUrl} />
                            ) : (
                                <img className="h-[40px] w-[40px] object-cover rounded-lg shadow-lg ring-2 ring-orange-100 dark:ring-orange-900/30" alt="Logo" src="/logo-1.png" />
                            )}
                            <div className="flex flex-col">
                                <span className="font-bold text-sm bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent leading-tight">
                                    {branding.branchName || branding.companyName}
                                </span>
                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Delivery Hub
                                </span>
                            </div>
                        </div>
                        <button onClick={onToggle} className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
                    {filtered.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={onToggle}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-all duration-200 ${isActive
                                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1"
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20"}`}>
                                    <Icon size={18} className={isActive ? "" : "text-gray-600 dark:text-gray-400 group-hover:text-orange-600"} />
                                </div>
                                <span className="text-sm">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex-shrink-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 px-3 py-2.5 font-medium text-red-600 dark:text-red-400 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] group"
                    >
                        <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 transition-colors">
                            <LogOut size={18} />
                        </div>
                        <span className="text-sm font-semibold">Logout</span>
                    </button>
                </div>
            </aside>

            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-[#d1d1d1] dark:border-gray-700 w-full max-w-sm p-6">
                        <h3 className="text-base font-bold text-neutral-800 dark:text-gray-100 mb-1">Confirm Logout</h3>
                        <p className="text-sm text-[#5d5d5d] dark:text-gray-400 mb-5">Are you sure you want to log out?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#d1d1d1] dark:border-gray-700 text-sm font-medium text-neutral-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => { logout(); window.location.href = "/login"; }} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
