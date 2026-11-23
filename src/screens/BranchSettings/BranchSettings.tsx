import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useBranding } from "../../contexts/BrandingContext";
import { useToast } from "../../components/ui/toast";
import { cn } from "../../lib/utils";
import { Switch } from "../../components/ui/switch";
import { useStation } from "../../contexts/StationContext";
import { useLocation as useLocations } from "../../contexts/LocationContext";
import frontdeskService from "../../services/frontdeskService";
import {
    AlertCircle, Building2, Clock, ImageIcon, Mail, Paintbrush,
    Phone, Printer, RotateCcw, Save, UploadCloud, Banknote, Loader,
} from "lucide-react";

const inputCls =
    "h-10 rounded-lg border-[#dcdcdc] bg-white shadow-none " +
    "focus-visible:ring-2 focus-visible:ring-[#ea690c]/20 focus-visible:border-[#ea690c]";

const labelCls = "text-[13px] font-medium text-neutral-700 mb-1.5 block";
const hintCls = "text-xs text-[#9a9a9a] mt-1.5";

type TabId = "identity" | "info" | "print" | "charges";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "identity", label: "Visual Identity", icon: Paintbrush },
    { id: "info", label: "Branch Info", icon: Building2 },
    { id: "print", label: "Printing", icon: Printer },
    { id: "charges", label: "Charges", icon: Banknote },
];

interface IconInputProps extends React.ComponentProps<typeof Input> {
    icon: React.ComponentType<{ className?: string }>;
}

const IconInput = ({ icon: Icon, className, ...props }: IconInputProps) => (
    <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a8a8]" />
        <Input {...props} className={cn(inputCls, "pl-9", className)} />
    </div>
);

const InfoRow = ({
    icon: Icon, label, value, placeholder,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; placeholder: string }) => (
    <div className="flex items-start gap-3 px-4 py-3">
        <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#b0b0b0]" />
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b0b0b0]">{label}</p>
            <p className={cn("mt-0.5 text-sm truncate", value ? "text-neutral-800" : "text-[#c0c0c0] italic")}>
                {value || placeholder}
            </p>
        </div>
    </div>
);

export const BranchSettings = (): JSX.Element => {
    const { branding, setBranchBranding, resetBranchBranding } = useBranding();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<TabId>("identity");
    const [dragActive, setDragActive] = useState(false);

    const [form, setForm] = useState({
        branchName: branding.branchName || "",
        logoUrl: branding.logoUrl || "",
        branchAddress: branding.branchAddress || "",
        branchPhone: branding.branchPhone || "",
        branchEmail: branding.branchEmail || "",
        operatingHours: branding.operatingHours || "",
        companyTagline: branding.companyTagline || "",
        printFooterNote: branding.printFooterNote || "",
    });

    const [logoPreview, setLogoPreview] = useState<string>(branding.logoUrl || "");

    const savedValues = {
        branchName: branding.branchName || "",
        logoUrl: branding.logoUrl || "",
        branchAddress: branding.branchAddress || "",
        branchPhone: branding.branchPhone || "",
        branchEmail: branding.branchEmail || "",
        operatingHours: branding.operatingHours || "",
        companyTagline: branding.companyTagline || "",
        printFooterNote: branding.printFooterNote || "",
    };
    const isDirty = (Object.keys(form) as Array<keyof typeof form>).some(
        key => form[key] !== savedValues[key]
    );

    const setField = <K extends keyof typeof form>(key: K, value: string) =>
        setForm(f => ({ ...f, [key]: value }));

    const processLogoFile = (file: File) => {
        if (!file.type.startsWith("image/")) { showToast("Please select a valid image file.", "error"); return; }
        if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2MB.", "error"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setLogoPreview(base64);
            setForm(f => ({ ...f, logoUrl: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processLogoFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processLogoFile(file);
    };

    const handleRemoveLogo = () => {
        setLogoPreview("");
        setForm(f => ({ ...f, logoUrl: "" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSave = () => {
        setBranchBranding({
            branchName: form.branchName || undefined,
            logoUrl: form.logoUrl || undefined,
            branchAddress: form.branchAddress || undefined,
            branchPhone: form.branchPhone || undefined,
            branchEmail: form.branchEmail || undefined,
            operatingHours: form.operatingHours || undefined,
            companyTagline: form.companyTagline || undefined,
            printFooterNote: form.printFooterNote || undefined,
        });
        showToast("Branch settings saved successfully.", "success");
    };

    const handleReset = () => {
        resetBranchBranding();
        setForm({
            branchName: "", logoUrl: "",
            branchAddress: "", branchPhone: "", branchEmail: "", operatingHours: "",
            companyTagline: "", printFooterNote: "",
        });
        setLogoPreview("");
        showToast("Branch settings reset to defaults.", "success");
    };

    return (
        <div className="w-full">
            <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:w-[80%] lg:max-w-none lg:px-0 lg:py-8">

                {/* ── Page header with actions ── */}
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Branch Settings</h1>
                        <p className="mt-1 text-sm text-[#7d7d7d]">
                            Customise how your branch appears in the app and on printed materials.
                        </p>
                        {isDirty && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                <AlertCircle className="h-3 w-3" />
                                Unsaved changes
                            </div>
                        )}
                    </div>
                    <div className={cn("flex flex-shrink-0 items-center gap-2.5", activeTab === "charges" && "invisible")}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="gap-1.5 rounded-lg border-[#dcdcdc] text-neutral-600 hover:bg-gray-100"
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className="gap-2 rounded-lg bg-[#ea690c] px-5 text-white shadow-sm hover:bg-[#ea690c]/90 disabled:opacity-40"
                        >
                            <Save className="h-4 w-4" /> Save Settings
                        </Button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="mb-6 flex w-full border-b border-[#e3e3e3]">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                                activeTab === id
                                    ? "border-[#ea690c] text-[#ea690c]"
                                    : "border-transparent text-[#7d7d7d] hover:text-neutral-800 hover:border-[#dcdcdc]"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", activeTab === id ? "text-[#ea690c]" : "text-[#a8a8a8]")} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Panel ── */}
                <div className="rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-sm sm:p-7">

                    {activeTab === "charges" && <ChargesPanel />}

                    {/* ═══ Visual Identity ═══ */}
                    {activeTab === "identity" && (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
                            {/* Left: fields */}
                            <div className="space-y-8 lg:col-span-3">

                                {/* Logo upload */}
                                <div>
                                    <Label className={labelCls}>Branch Logo</Label>
                                    <p className={hintCls + " mb-3"}>Used in the sidebar, printed labels, and manifests.</p>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

                                    {logoPreview ? (
                                        /* Logo set — show preview + actions */
                                        <div className="flex items-center gap-4 rounded-2xl border border-[#e3e3e3] bg-[#fafafa] p-4">
                                            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-sm">
                                                <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-1.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-neutral-800 truncate">
                                                    {logoPreview.startsWith("data:") ? "Uploaded image" : logoPreview}
                                                </p>
                                                <p className="text-xs text-[#9a9a9a] mt-0.5">Logo is set and ready to use</p>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-xs font-medium text-[#ea690c] hover:underline"
                                                    >
                                                        Replace
                                                    </button>
                                                    <span className="text-[#dcdcdc]">·</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveLogo}
                                                        className="text-xs font-medium text-red-500 hover:underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* No logo — show upload zone */
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                            onDragLeave={() => setDragActive(false)}
                                            onDrop={handleDrop}
                                            className={cn(
                                                "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition-colors",
                                                dragActive
                                                    ? "border-[#ea690c] bg-orange-50/40"
                                                    : "border-[#dcdcdc] bg-[#fafafa] hover:border-[#ea690c]/50 hover:bg-orange-50/20"
                                            )}
                                        >
                                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", dragActive ? "border-[#ea690c]/30 bg-orange-50" : "border-[#e3e3e3] bg-white")}>
                                                <UploadCloud className={cn("h-5 w-5", dragActive ? "text-[#ea690c]" : "text-[#b0b0b0]")} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-neutral-700">
                                                    Click to upload <span className="font-normal text-[#9a9a9a]">or drag &amp; drop</span>
                                                </p>
                                                <p className="text-xs text-[#a8a8a8] mt-0.5">PNG, JPG or SVG · Max 2MB</p>
                                            </div>
                                        </button>
                                    )}

                                    {/* URL paste — always visible */}
                                    <div className="mt-3">
                                        <Input
                                            value={logoPreview.startsWith("data:") ? "" : form.logoUrl}
                                            onChange={e => { setField("logoUrl", e.target.value); setLogoPreview(e.target.value); }}
                                            placeholder="Or paste an image URL…"
                                            className={cn(inputCls, "h-9 text-sm")}
                                        />
                                    </div>
                                </div>

                                {/* Branch name */}
                                <div>
                                    <Label className={labelCls}>Branch Name</Label>
                                    <Input
                                        value={form.branchName}
                                        onChange={e => setField("branchName", e.target.value)}
                                        placeholder="e.g. Kumasi Branch"
                                        className={cn(inputCls, "max-w-sm")}
                                    />
                                    <p className={hintCls}>Shown in the navbar and on printed labels.</p>
                                </div>
                            </div>

                            {/* Right: live sidebar preview */}
                            <div className="lg:col-span-2">
                                <div className="lg:sticky lg:top-24">
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Sidebar Preview</p>
                                    <div className="overflow-hidden rounded-xl border border-[#e3e3e3] shadow-sm">
                                        {/* Sidebar header */}
                                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10" style={{ backgroundColor: branding.primaryColor }}>
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/95 shadow">
                                                {logoPreview
                                                    ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-0.5" />
                                                    : <ImageIcon className="h-4 w-4 text-gray-400" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-white leading-tight">
                                                    {form.branchName || "Branch Name"}
                                                </p>
                                                <p className="text-[10px] text-white/60 uppercase tracking-wider">Parcel Delivery</p>
                                            </div>
                                        </div>
                                        {/* Fake nav items */}
                                        <div className="bg-white px-3 py-3 space-y-1">
                                            {["Parcel Search", "Parcel Intake", "Active Deliveries"].map((item, i) => (
                                                <div
                                                    key={item}
                                                    className={cn(
                                                        "flex items-center gap-2.5 rounded-lg px-3 py-2",
                                                        i === 0 ? "text-white" : "bg-transparent"
                                                    )}
                                                    style={i === 0 ? { backgroundColor: branding.primaryColor } : {}}
                                                >
                                                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", i === 0 ? "bg-white/60" : "bg-[#dcdcdc]")} />
                                                    <span className={cn("text-xs font-medium", i === 0 ? "text-white" : "text-[#7d7d7d]")}>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Bottom logout strip */}
                                        <div className="border-t border-[#f0f0f0] bg-white px-3 py-2.5">
                                            <div className="flex items-center gap-2 rounded-lg bg-[#fafafa] px-3 py-2">
                                                <div className="h-2 w-2 rounded-full bg-red-300" />
                                                <span className="text-xs font-medium text-[#9a9a9a]">Logout</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Branch Info ═══ */}
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
                            {/* Left: fields */}
                            <div className="space-y-6 lg:col-span-3">
                                <div>
                                    <Label className={labelCls}>Physical Address</Label>
                                    <IconInput
                                        icon={Building2}
                                        value={form.branchAddress}
                                        onChange={e => setField("branchAddress", e.target.value)}
                                        placeholder="e.g. 12 Adum Street, Kumasi, Ghana"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <Label className={labelCls}>Phone Number</Label>
                                        <IconInput
                                            icon={Phone}
                                            type="tel"
                                            value={form.branchPhone}
                                            onChange={e => setField("branchPhone", e.target.value)}
                                            placeholder="+233 24 000 0000"
                                        />
                                    </div>
                                    <div>
                                        <Label className={labelCls}>Email Address</Label>
                                        <IconInput
                                            icon={Mail}
                                            type="email"
                                            value={form.branchEmail}
                                            onChange={e => setField("branchEmail", e.target.value)}
                                            placeholder="kumasi@mnm.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className={labelCls}>Operating Hours</Label>
                                    <IconInput
                                        icon={Clock}
                                        value={form.operatingHours}
                                        onChange={e => setField("operatingHours", e.target.value)}
                                        placeholder="e.g. Mon – Fri: 8am – 6pm · Sat: 9am – 2pm"
                                    />
                                    <p className={hintCls}>Shown on printed labels and customer-facing pages.</p>
                                </div>
                            </div>

                            {/* Right: info summary card */}
                            <div className="lg:col-span-2">
                                <div className="lg:sticky lg:top-24">
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Contact Card Preview</p>
                                    <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] overflow-hidden">
                                        {/* Card header */}
                                        <div className="px-4 py-3.5 border-b border-[#e3e3e3] bg-white flex items-center gap-3">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-[#fafafa]">
                                                {logoPreview
                                                    ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain p-0.5" />
                                                    : <Building2 className="h-4 w-4 text-[#c0c0c0]" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-800">{form.branchName || "Branch Name"}</p>
                                                <p className="text-xs text-[#9a9a9a]">Branch contact details</p>
                                            </div>
                                        </div>
                                        {/* Info rows */}
                                        <div className="divide-y divide-[#f0f0f0]">
                                            <InfoRow icon={Building2} label="Address" value={form.branchAddress} placeholder="Not set" />
                                            <InfoRow icon={Phone} label="Phone" value={form.branchPhone} placeholder="Not set" />
                                            <InfoRow icon={Mail} label="Email" value={form.branchEmail} placeholder="Not set" />
                                            <InfoRow icon={Clock} label="Hours" value={form.operatingHours} placeholder="Not set" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Printing ═══ */}
                    {activeTab === "print" && (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-10">
                            <div className="space-y-6 lg:col-span-3">
                                <div>
                                    <Label className={labelCls}>Company Tagline</Label>
                                    <Input
                                        value={form.companyTagline}
                                        onChange={e => setField("companyTagline", e.target.value)}
                                        placeholder="e.g. Parcel Delivery System"
                                        className={inputCls}
                                    />
                                    <p className={hintCls}>Appears below the company name on printed labels and manifests.</p>
                                </div>
                                <div>
                                    <Label className={labelCls}>Footer Note</Label>
                                    <Input
                                        value={form.printFooterNote}
                                        onChange={e => setField("printFooterNote", e.target.value)}
                                        placeholder="e.g. For inquiries, contact M&M Parcel Services"
                                        className={inputCls}
                                    />
                                    <p className={hintCls}>Printed at the bottom of every label and manifest.</p>
                                </div>
                            </div>

                            {/* Right: full label header preview */}
                            <div className="lg:col-span-2">
                                <div className="lg:sticky lg:top-24">
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Label Preview</p>
                                    <div className="rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-5">
                                        <div className="border-2 border-black bg-white p-3 shadow-sm">
                                            {/* Label header */}
                                            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                                                <div className="w-8" />
                                                <div className="flex items-center gap-2">
                                                    {logoPreview ? (
                                                        <img src={logoPreview} alt="Logo" className="h-10 w-10 object-contain" />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded border border-[#e3e3e3] bg-[#f5f5f5]">
                                                            <ImageIcon className="h-5 w-5 text-[#c0c0c0]" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold leading-tight text-black">{form.branchName || "Branch Name"}</p>
                                                        <p className="text-[10px] text-black">{form.companyTagline || "Parcel Delivery System"}</p>
                                                    </div>
                                                </div>
                                                <div className="h-10 w-10 rounded border border-[#e3e3e3] bg-[#f5f5f5] flex items-center justify-center">
                                                    <p className="text-[8px] text-[#b0b0b0] text-center leading-tight">QR<br/>Code</p>
                                                </div>
                                            </div>
                                            {/* Fake tracking number */}
                                            <div className="bg-black text-white text-center py-1 mb-2">
                                                <p className="text-[8px] font-semibold">TRACKING NUMBER</p>
                                                <p className="text-xs font-bold tracking-wider">MM-2024-00001</p>
                                            </div>
                                            {/* Fake sender/receiver */}
                                            <div className="grid grid-cols-2 gap-1.5 mb-2">
                                                <div className="border border-black p-1">
                                                    <p className="text-[9px] text-black"><span className="font-bold">SENDER:</span> John Doe</p>
                                                    <p className="text-[9px] text-black"><span className="font-bold">CONTACT:</span> 0241234567</p>
                                                </div>
                                                <div className="border border-black p-1">
                                                    <p className="text-[9px] text-black"><span className="font-bold">RECEIVER:</span> Jane Smith</p>
                                                    <p className="text-[9px] text-black"><span className="font-bold">CONTACT:</span> 0557654321</p>
                                                </div>
                                            </div>
                                            {/* Footer */}
                                            <div className="border-t border-black pt-1.5 text-center">
                                                <p className="text-[9px] text-black">{form.printFooterNote || "For inquiries, contact M&M Parcel Services"}</p>
                                            </div>
                                        </div>
                                        <p className="mt-2.5 text-center text-[10px] text-[#a0a0a0]">This is how your label header will appear when printed</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Station charges, saved to the backend (unlike the branding tabs, which are stored in the browser).
 * Proposed endpoint PUT /api-frontdesk/office/pickup-charge (docs/BACKEND_HANDOFF.md Part J).
 */
const ChargesPanel = () => {
    const { userOfficeId, userOfficeName } = useStation();
    const { stations, refreshLocations } = useLocations();
    const { showToast } = useToast();
    const station = stations.find((st) => st.id === userOfficeId);
    const [enabled, setEnabled] = useState(false);
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEnabled(!!station?.pickupChargeEnabled);
        setAmount(station?.pickupChargeAmount != null ? String(station.pickupChargeAmount) : "");
    }, [station?.pickupChargeEnabled, station?.pickupChargeAmount]);

    const dirty = enabled !== !!station?.pickupChargeEnabled
        || (enabled && amount !== (station?.pickupChargeAmount != null ? String(station.pickupChargeAmount) : ""));

    const save = async () => {
        const value = amount.trim() === "" ? null : Number(amount);
        if (enabled && (value === null || !Number.isFinite(value) || value <= 0)) {
            showToast("Enter the pickup charge, or switch it off", "error");
            return;
        }
        setSaving(true);
        const res = await frontdeskService.updateStationPickupCharge(enabled, enabled ? value : null);
        setSaving(false);
        if (res.success) {
            showToast(enabled ? `Pickup charge set to GHC ${value!.toFixed(2)}` : "Pickup charge switched off", "success");
            await refreshLocations();
        } else showToast(res.message, "error");
    };

    return (
        <div className="max-w-xl space-y-5">
            <div>
                <h2 className="text-base font-semibold text-neutral-900">Pickup charge</h2>
                <p className="text-sm text-[#5d5d5d] mt-1">
                    The amount filled in automatically when staff at {userOfficeName ?? "this station"} create a Pickup Request
                    (a rider collecting a parcel from a sender). Staff can still change it on a request.
                </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e3e3e3] p-4">
                <div>
                    <p className="text-sm font-medium text-neutral-800">Charge for pickups at this station</p>
                    <p className="text-xs text-[#9a9a9a] mt-0.5">Switch off if this station doesn't charge for pickups.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Charge for pickups at this station" />
            </div>
            {enabled && (
                <div>
                    <Label className={labelCls}>Amount per pickup (GHC)</Label>
                    <Input
                        type="number" min="0" step="0.5" inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 10"
                        className={cn(inputCls, "w-48")}
                    />
                </div>
            )}
            <Button onClick={save} disabled={!dirty || saving} className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save charge
            </Button>
        </div>
    );
};
