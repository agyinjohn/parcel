import { useState } from "react";
import {
  Building2, Save,
  Bell, BellOff, Shield, Eye, EyeOff, Key,
  Palette, Languages, Clock, CheckCircle2, AlertCircle,
  User, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { getVendorSessionProfile } from "./vendorSession";

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-[#d1d1d1] bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[#ea690c]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </CardContent>
    </Card>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${checked ? "bg-[#ea690c]" : "bg-gray-200"}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function SaveToast({ show, error }: { show: boolean; error?: boolean }) {
  if (!show) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
      error
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-green-50 border-green-200 text-green-700"
    }`}>
      {error
        ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
        : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      {error ? "Failed to save changes" : "Changes saved successfully"}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export const SettingsPage = () => {
  const vendor = getVendorSessionProfile();

  // Notifications
  const [notifications, setNotifications] = useState({
    parcelReceived:  true,
    parcelDelivered: true,
    parcelCollected: true,
    parcelFailed:    true,
    weeklyReport:    false,
    marketingEmails: false,
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    language:       "en",
    currency:       "GHC",
    timezone:       "Africa/Accra",
    defaultStation: "",
    autofillSender: true,
    confirmBeforeSend: true,
  });

  // Security
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // UI state
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const saveSection = async (section: string) => {
    setSaving(section);
    await new Promise(r => setTimeout(r, 700));
    if (section === "preferences") {
      localStorage.setItem("mm_partner_preferences", JSON.stringify(preferences));
    }
    setSaving(null);
    showToast();
  };

  const tabs = ["Profile", "Notifications", "Preferences", "Security"] as const;
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Profile");

  return (
    <div className="space-y-5 pb-10">

      {/* Page header */}
      <div>
        <h2 className="text-base font-bold text-neutral-800">Account Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">Manage your partner account, preferences and security</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === t
                ? "bg-[#ea690c] text-white shadow-sm"
                : "text-gray-500 hover:text-neutral-800 hover:bg-gray-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "Profile" && (
        <div className="space-y-5">

          {/* Avatar */}
          <Card className="border border-[#d1d1d1] bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-bold text-neutral-800">{vendor.name || "Partner Account"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Vendor · {vendor.role}</p>
                  {vendor.email && (
                    <p className="text-xs text-gray-500 mt-0.5">{vendor.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account info from login */}
          <Section title="Account Information" description="Details from your M&M partner account" icon={Building2}>
            <div className="space-y-3">
              {[
                { label: "Name", value: vendor.name || "—" },
                { label: "Email", value: vendor.email || "—" },
                { label: "Phone", value: vendor.phoneNumber || "—" },
                { label: "User ID", value: vendor.userId || "—" },
                { label: "Role", value: vendor.role || "—" },
                { label: "Account Type", value: "Third-party Partner" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-800 text-right max-w-[60%] break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Account details */}
          <Section title="Account Details" description="Your partner account status" icon={User}>
            <div className="space-y-3">
              {[
                { label: "Partner ID", value: vendor.userId || "—" },
                { label: "Account Status", value: "Active" },
                { label: "Account Type", value: "Third-party Partner" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-800">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === "Notifications" && (
        <div className="space-y-5">
          <Section title="Parcel Notifications" description="Get notified when parcel statuses change" icon={Bell}>
            <ToggleRow label="Parcel Received at Station" description="When M&M confirms receipt of your parcel"
              checked={notifications.parcelReceived} onChange={v => setNotifications(p => ({ ...p, parcelReceived: v }))} />
            <ToggleRow label="Parcel Out for Delivery" description="When a rider is assigned and heading to recipient"
              checked={notifications.parcelDelivered} onChange={v => setNotifications(p => ({ ...p, parcelDelivered: v }))} />
            <ToggleRow label="Parcel Collected" description="When recipient collects the parcel — triggers payout"
              checked={notifications.parcelCollected} onChange={v => setNotifications(p => ({ ...p, parcelCollected: v }))} />
            <ToggleRow label="Delivery Failed" description="When a delivery attempt is unsuccessful"
              checked={notifications.parcelFailed} onChange={v => setNotifications(p => ({ ...p, parcelFailed: v }))} />
          </Section>

          <Section title="Reports & Marketing" description="Periodic summaries and promotional messages" icon={BellOff}>
            <ToggleRow label="Weekly Earnings Report" description="A summary of your weekly earnings sent every Monday"
              checked={notifications.weeklyReport} onChange={v => setNotifications(p => ({ ...p, weeklyReport: v }))} />
            <ToggleRow label="Marketing Emails" description="Product updates, tips and M&M announcements"
              checked={notifications.marketingEmails} onChange={v => setNotifications(p => ({ ...p, marketingEmails: v }))} />
          </Section>

          <div className="flex justify-end">
            <Button onClick={() => saveSection("notifications")} disabled={saving === "notifications"}
              className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#d45e0a] disabled:opacity-60 h-9 px-5">
              {saving === "notifications"
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : <><Save className="w-3.5 h-3.5" /> Save Preferences</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── PREFERENCES TAB ── */}
      {activeTab === "Preferences" && (
        <div className="space-y-5">
          <Section title="Regional Settings" description="Language, currency and timezone" icon={Languages}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">Language</Label>
                <select value={preferences.language} onChange={e => setPreferences(p => ({ ...p, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="tw">Twi</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">Currency</Label>
                <select value={preferences.currency} onChange={e => setPreferences(p => ({ ...p, currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                  <option value="GHC">GHC — Ghanaian Cedi</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">Timezone</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select value={preferences.timezone} onChange={e => setPreferences(p => ({ ...p, timezone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                    <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                    <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                    <option value="Europe/London">Europe/London (GMT+1)</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Send Parcel Defaults" description="Pre-fill values to speed up parcel submission" icon={Palette}>
            <div className="space-y-1.5 mb-4">
              <Label className="text-xs font-semibold text-neutral-800">Default Destination Station</Label>
              <select value={preferences.defaultStation} onChange={e => setPreferences(p => ({ ...p, defaultStation: e.target.value }))}
                className="w-full px-3 py-2 border border-[#d1d1d1] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c]">
                <option value="">No default — select each time</option>
                <option value="s1">Accra Central — Accra</option>
                <option value="s2">Kumasi Main — Kumasi</option>
                <option value="s3">Takoradi Hub — Takoradi</option>
                <option value="s4">Tamale North — Tamale</option>
                <option value="s5">Cape Coast — Cape Coast</option>
              </select>
            </div>
            <ToggleRow label="Auto-fill Sender Name" description="Pre-fill your business name in the sender field"
              checked={preferences.autofillSender} onChange={v => setPreferences(p => ({ ...p, autofillSender: v }))} />
            <ToggleRow label="Confirm Before Submitting" description="Show a review screen before each submission"
              checked={preferences.confirmBeforeSend} onChange={v => setPreferences(p => ({ ...p, confirmBeforeSend: v }))} />
          </Section>

          <div className="flex justify-end">
            <Button onClick={() => saveSection("preferences")} disabled={saving === "preferences"}
              className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#d45e0a] disabled:opacity-60 h-9 px-5">
              {saving === "preferences"
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : <><Save className="w-3.5 h-3.5" /> Save Preferences</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === "Security" && (
        <div className="space-y-5">
          <Section title="Change Password" description="Update your login password" icon={Key}>
            <div className="space-y-4 max-w-md">
              {(["current", "new", "confirm"] as const).map(field => {
                const labels = { current: "Current Password", new: "New Password", confirm: "Confirm New Password" };
                const keys = { current: "currentPassword", new: "newPassword", confirm: "confirmPassword" } as const;
                return (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-neutral-800">{labels[field]}</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords[field] ? "text" : "password"}
                        value={security[keys[field]]}
                        onChange={e => setSecurity(p => ({ ...p, [keys[field]]: e.target.value }))}
                        placeholder="••••••••"
                        className="border border-[#d1d1d1] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, [field]: !p[field] }))}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="pt-1">
                <Button onClick={() => saveSection("security")} disabled={saving === "security" || !security.newPassword || security.newPassword !== security.confirmPassword}
                  className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#d45e0a] disabled:opacity-50 h-9 px-5">
                  {saving === "security"
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                    : <><Shield className="w-3.5 h-3.5" /> Update Password</>}
                </Button>
                {security.newPassword && security.confirmPassword && security.newPassword !== security.confirmPassword && (
                  <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
                )}
              </div>
            </div>
          </Section>

          <Section title="Account Security" description="Additional security options" icon={Shield}>
            <div className="space-y-0">
              {[
                { label: "Two-Factor Authentication", desc: "Add an extra layer of security with SMS or email verification", badge: "Coming Soon" },
                { label: "Login Activity",             desc: "View recent login sessions and devices",                          badge: "Coming Soon" },
                { label: "API Access",                 desc: "Manage API keys for direct integration with M&M",                badge: "Coming Soon" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-[10px] font-bold bg-orange-100 text-[#ea690c] px-2 py-0.5 rounded-full">{item.badge}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Danger Zone" description="Irreversible account actions" icon={AlertCircle}>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-red-100 bg-red-50/50">
                <div>
                  <p className="text-sm font-semibold text-red-700">Delete Account</p>
                  <p className="text-xs text-red-400 mt-0.5">Permanently delete your partner account and all data</p>
                </div>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-8 px-3 flex-shrink-0 ml-3">
                  Request Deletion
                </Button>
              </div>
            </div>
          </Section>
        </div>
      )}

      <SaveToast show={toast} />
    </div>
  );
};
