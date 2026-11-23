import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Package, History, Wallet, Fuel, Building2, Mail } from "lucide-react";
import { useStation } from "../contexts/StationContext";
import { UpdateNotificationPopup } from "../components/UpdateNotificationPopup";
import { BottomSheet, initials } from "../components/rider/RiderUI";
import riderService, { RiderStatus } from "../services/riderService";
import { useToast } from "../components/ui/toast";

interface RiderLayoutProps {
    children: React.ReactNode;
}

const TABS = [
    { path: "/rider/dashboard", label: "Deliveries", title: "My deliveries", icon: Package },
    { path: "/rider/history", label: "History", title: "Delivery history", icon: History },
    { path: "/rider/earnings", label: "Earnings", title: "Earnings", icon: Wallet },
    { path: "/rider/fuel-request", label: "Fuel", title: "Fuel requests", icon: Fuel },
];

const ONLINE_KEY = "rider_online_status";

/**
 * Mobile-first shell for the rider app: a compact app bar, a bottom tab bar on
 * phones and tablets, and inline tabs in the header on desktop.
 */
export const RiderLayout: React.FC<RiderLayoutProps> = ({ children }) => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [online, setOnline] = useState(() => {
        try { return localStorage.getItem(ONLINE_KEY) !== "OFFLINE"; } catch { return true; }
    });
    const [savingStatus, setSavingStatus] = useState(false);
    // Hide the app bar while scrolling down so the list gets the space back;
    // bring it back as soon as the rider scrolls up.
    const [barHidden, setBarHidden] = useState(false);
    const lastY = useRef(0);
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            const dy = y - lastY.current;
            if (y < 80) setBarHidden(false);
            else if (dy > 6) setBarHidden(true);
            else if (dy < -6) setBarHidden(false);
            if (Math.abs(dy) > 6 || y < 80) lastY.current = y;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    const { currentUser, logout } = useStation();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const active = TABS.find((t) => location.pathname.startsWith(t.path)) ?? TABS[0];

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const toggleOnline = async () => {
        const next: RiderStatus = online ? "OFFLINE" : "READY";
        setSavingStatus(true);
        const res = await riderService.updateRiderStatus(next);
        setSavingStatus(false);
        if (res.success) {
            setOnline(!online);
            try { localStorage.setItem(ONLINE_KEY, next); } catch { /* ignore */ }
            showToast(next === "READY" ? "You're online and can receive deliveries" : "You're offline", "success");
        } else {
            showToast(res.message || "Couldn't update your status", "error");
        }
    };

    return (
        <div
            className="min-h-[100dvh] bg-[#f5f4f1] text-neutral-900"
            style={{ ["--rider-bar" as string]: barHidden ? "0px" : "calc(3.5rem + env(safe-area-inset-top))" }}
        >
            <UpdateNotificationPopup />

            {/* App bar */}
            <header
                className={`sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-black/5 pt-[env(safe-area-inset-top)] transition-transform duration-200 motion-reduce:transition-none ${barHidden ? "-translate-y-full" : ""}`}
            >
                <div className="mx-auto max-w-5xl h-14 px-4 flex items-center gap-3">
                    <img src="/logo-1.png" alt="M&M" className="h-8 w-8 rounded-lg object-cover shadow-sm" />
                    <div className="min-w-0 flex-1 lg:flex-none">
                        <p className="text-[15px] font-bold leading-tight truncate">{active.title}</p>
                        <p className="text-[11px] text-gray-500 leading-tight truncate">
                            {currentUser?.office?.name ?? "M&M Rider"}
                        </p>
                    </div>

                    <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="Rider">
                        {TABS.map((t) => {
                            const on = t === active;
                            return (
                                <button
                                    key={t.path}
                                    onClick={() => navigate(t.path)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                                        on ? "bg-gray-100 text-neutral-900" : "text-gray-500 hover:bg-gray-50"
                                    }`}
                                >
                                    <t.icon className="w-4 h-4" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </nav>

                    <button
                        onClick={toggleOnline}
                        disabled={savingStatus}
                        className={`flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-60 ${
                            online ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-400"
                        }`}
                        aria-pressed={online}
                    >
                        <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
                        {online ? "Online" : "Offline"}
                    </button>
                    <button
                        onClick={() => setProfileOpen(true)}
                        className="h-9 w-9 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center active:scale-95"
                        aria-label="Profile"
                    >
                        {initials(currentUser?.name)}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-md sm:max-w-xl lg:max-w-3xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-10">
                {children}
            </main>

            {/* Bottom tab bar */}
            <nav
                className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]"
                aria-label="Rider"
            >
                <div className="mx-auto max-w-md sm:max-w-xl grid grid-cols-4">
                    {TABS.map((t) => {
                        const on = t === active;
                        return (
                            <button
                                key={t.path}
                                onClick={() => navigate(t.path)}
                                className={`relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium ${
                                    on ? "text-[#ea690c]" : "text-gray-500"
                                }`}
                                aria-current={on ? "page" : undefined}
                            >
                                <span className="flex items-center justify-center h-7 w-12">
                                    <t.icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.4 : 1.8} />
                                </span>
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <BottomSheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Profile">
                <div className="flex items-center gap-4 pb-4">
                    <div className="h-14 w-14 rounded-full bg-gray-200 text-gray-700 text-lg font-bold flex items-center justify-center">
                        {initials(currentUser?.name)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-lg truncate">{currentUser?.name ?? "Rider"}</p>
                        <p className="text-sm text-gray-500">
                            {online ? "Online · receiving deliveries" : "Offline"}
                        </p>
                    </div>
                </div>
                <div className="rounded-2xl bg-gray-50 divide-y divide-gray-200/70">
                    {currentUser?.office?.name && (
                        <div className="flex items-center gap-3 px-4 py-3 text-sm">
                            <Building2 className="w-4 h-4 text-gray-500" /> {currentUser.office.name}
                        </div>
                    )}
                    {currentUser?.email && (
                        <div className="flex items-center gap-3 px-4 py-3 text-sm">
                            <Mail className="w-4 h-4 text-gray-500" /> <span className="truncate">{currentUser.email}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleOnline}
                    disabled={savingStatus}
                    className="mt-4 w-full h-12 rounded-2xl border border-gray-200 font-semibold text-sm active:scale-[0.99] disabled:opacity-60"
                >
                    {online ? "Go offline" : "Go online"}
                </button>
                <button
                    onClick={handleLogout}
                    className="mt-3 mb-2 w-full h-12 rounded-2xl bg-red-50 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                    <LogOut className="w-4 h-4" /> Log out
                </button>
            </BottomSheet>
        </div>
    );
};
