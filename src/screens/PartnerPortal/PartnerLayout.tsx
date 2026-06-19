import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Send, Package, DollarSign, History, X, Menu,
  BellIcon, ChevronDownIcon, HelpCircleIcon, Building2,
  ExternalLink, Settings, LogOut,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useStation } from "../../contexts/StationContext";

interface PartnerLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Send Parcels",  path: "/partner",          icon: Send },
  { label: "Track Parcels", path: "/partner/track",    icon: Package },
  { label: "Reconciliation", path: "/partner/reconciliation", icon: DollarSign },
  { label: "History",       path: "/partner/history",  icon: History },
  { label: "Settings",      path: "/partner/settings", icon: Settings },
];

const routeTitles: Record<string, { title: string; description: string }> = {
  "/partner":           { title: "Send Parcels",  description: "Register new parcels to M&M stations" },
  "/partner/track":     { title: "Track Parcels", description: "Monitor the status of your submitted parcels" },
  "/partner/reconciliation": { title: "Reconciliation", description: "View collected amounts and pending payouts" },
  "/partner/history":   { title: "History",       description: "Full history of all your submitted parcels" },
  "/partner/settings":  { title: "Settings",      description: "Manage your account, preferences and security" },
};

export const PartnerLayout = ({ children }: PartnerLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useStation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const routeInfo = routeTitles[location.pathname] ?? routeTitles["/partner"];
  const displayName = currentUser?.name || "Partner Account";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowAccountMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transform bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex h-auto items-center gap-3 border-b border-gray-200 px-4 py-3 flex-shrink-0 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <img src="/logo-1.png" alt="M&M" className="h-[40px] w-[40px] object-cover rounded-lg shadow-lg ring-2 ring-orange-100" />
              <div className="flex flex-col">
                <span className="font-bold text-sm bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent leading-tight">
                  Mealex &amp; Mailex
                </span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Partner Portal
                </span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors lg:hidden">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                    : "text-gray-700 hover:bg-gray-100 hover:translate-x-1"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? "bg-white/20" : "bg-gray-100 group-hover:bg-orange-50"
                }`}>
                  <Icon size={18} className={isActive ? "" : "text-gray-600 group-hover:text-orange-600"} />
                </div>
                <span className="text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-3 flex-shrink-0 bg-white/50 backdrop-blur-sm">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-red-50 to-red-100 px-3 py-2.5 font-medium text-red-600 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] group"
          >
            <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
              <LogOut size={18} />
            </div>
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">

            {/* Left */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors lg:hidden"
              >
                <Menu size={22} />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-neutral-800">{routeInfo.title}</h1>
                <p className="text-xs text-gray-500">{routeInfo.description}</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-neutral-800">{routeInfo.title}</h1>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1 sm:gap-2">

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg hover:bg-gray-100 transition-colors">
                <BellIcon className="h-5 w-5 text-gray-600" />
                <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">3</span>
              </Button>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

              {/* Account */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowAccountMenu(v => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-neutral-800 leading-tight">{displayName}</p>
                    <p className="text-xs text-gray-400 leading-tight">Vendor</p>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 hidden sm:block ${showAccountMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {showAccountMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-b border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-800">{displayName}</p>
                          <p className="text-xs text-gray-500">Vendor partner</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <a
                        href="/partner/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowAccountMenu(false)}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        Settings
                      </a>
                      <a
                        href="/track"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowAccountMenu(false)}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        Customer Tracking
                      </a>
                      <a
                        href="mailto:support@mealexmailex.com"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowAccountMenu(false)}
                      >
                        <HelpCircleIcon className="w-4 h-4 text-gray-400" />
                        Contact Support
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#d1d1d1] w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-neutral-800 mb-1">Confirm Logout</h3>
            <p className="text-sm text-[#5d5d5d] mb-5">Are you sure you want to log out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#d1d1d1] text-sm font-medium text-neutral-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
