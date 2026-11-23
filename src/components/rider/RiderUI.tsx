/**
 * Small mobile-first building blocks shared by the rider app screens.
 */
import { useEffect, type ReactNode } from "react";
import { MapPinIcon, PackageIcon, Phone, UserIcon, XIcon, Navigation } from "lucide-react";
import type { RiderAssignmentResponse, RiderParcelResponse } from "../../services/riderService";
import { formatCurrency, formatDateTime } from "../../utils/dataHelpers";

export const parcelTotal = (p?: RiderParcelResponse | null) =>
    (p?.deliveryCost || 0) + (p?.pickUpCost || 0) + (p?.inboundCost || 0) + (p?.storageCost || 0);

export const telHref = (phone?: string) => (phone ? `tel:${phone.replace(/\s/g, "")}` : undefined);

const hasPin = (p?: Pick<RiderParcelResponse, "receiverLatitude" | "receiverLongitude"> | null) =>
    p?.receiverLatitude != null && p?.receiverLongitude != null &&
    Number.isFinite(p.receiverLatitude) && Number.isFinite(p.receiverLongitude);

/**
 * Directions for a delivery. With a pinned drop-off, Google Maps routes straight to the
 * coordinates (opens the Maps app on phones); otherwise it searches the address text.
 */
export const directionsHref = (p?: RiderParcelResponse | null) => {
    if (hasPin(p)) {
        return `https://www.google.com/maps/dir/?api=1&destination=${p!.receiverLatitude},${p!.receiverLongitude}&travelmode=driving`;
    }
    return p?.receiverAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.receiverAddress}, Ghana`)}`
        : undefined;
};

/** Where the parcel is going, for display: pinned landmark first, then the address text. */
export const destinationLabel = (p?: RiderParcelResponse | null) =>
    (hasPin(p) && p!.receiverLocationName) || p?.receiverAddress || undefined;

export { hasPin };

export const timeOf = (ts?: number) =>
    ts ? new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";

export const initials = (name?: string) =>
    (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

/**
 * Bottom sheet on phones, centred dialog from the `sm` breakpoint up.
 */
export const BottomSheet = ({
    open, onClose, title, subtitle, children, footer,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) => {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
            <button aria-label="Close" className="absolute inset-0 bg-black/40 rider-fade-in" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] rider-sheet-in">
                <div className="sm:hidden flex justify-center pt-2.5">
                    <span className="h-1.5 w-10 rounded-full bg-gray-300" />
                </div>
                <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-neutral-900 leading-tight">{title}</h2>
                        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center active:scale-95"
                        aria-label="Close"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
                {footer && (
                    <div className="border-t border-gray-100 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
                )}
            </div>
        </div>
    );
};

// Colour is reserved for states that need attention (amber) or went wrong (red).
const NEUTRAL = "bg-gray-100 text-gray-600";
const PILL: Record<string, string> = {
    neutral: NEUTRAL,
    delivered: NEUTRAL,
    cancelled: NEUTRAL,
    active: NEUTRAL,
    approved: NEUTRAL,
    completed: NEUTRAL,
    pending: "bg-amber-50 text-amber-800",
    returned: "bg-red-50 text-red-700",
    rejected: "bg-red-50 text-red-700",
};

export const StatusPill = ({ tone, children }: { tone: keyof typeof PILL | string; children: ReactNode }) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL[tone] ?? NEUTRAL}`}>
        {children}
    </span>
);

export const parcelTone = (p?: RiderParcelResponse) =>
    p?.cancelled ? "cancelled" : p?.returned ? "returned" : p?.delivered ? "delivered" : "active";

export const parcelStatusLabel = (p?: RiderParcelResponse) =>
    p?.cancelled ? "Cancelled" : p?.returned ? "Returned" : p?.delivered ? "Delivered" : "To deliver";

/** Square icon button used for call / directions. */
export const IconAction = ({ href, label, children }: { href?: string; label: string; children: ReactNode }) => {
    return (
        <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center active:scale-95 transition bg-gray-100 text-gray-700 ${href ? "" : "opacity-40 pointer-events-none"}`}
        >
            {children}
        </a>
    );
};

const Row = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
    <div className="flex gap-3 py-3">
        <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{label}</p>
            <div className="text-sm font-medium text-neutral-900 break-words">{children}</div>
        </div>
    </div>
);

/** Body of the parcel details sheet; used by the dashboard and history screens. */
export const ParcelDetails = ({ assignment }: { assignment: RiderAssignmentResponse }) => {
    const p = assignment.parcel;
    const lines: Array<[string, number | undefined]> = [
        ["Delivery fee", p.deliveryCost],
        ["Inbound fee", p.inboundCost],
        ["Pickup fee", p.pickUpCost],
        ["Storage fee", p.storageCost],
    ];
    return (
        <div>
            <div className="flex items-center gap-2 flex-wrap pb-1">
                <StatusPill tone={parcelTone(p)}>{parcelStatusLabel(p)}</StatusPill>
                {p.pod && <StatusPill tone="neutral">Pay on delivery</StatusPill>}
                {p.fragile && <StatusPill tone="pending">Fragile</StatusPill>}
                <span className="text-xs text-gray-400 font-mono ml-auto">{p.parcelId}</span>
            </div>
            <div className="divide-y divide-gray-100">
                <Row icon={<UserIcon className="w-4 h-4" />} label="Recipient">
                    {p.receiverName || "N/A"}
                    {p.recieverPhoneNumber && (
                        <a href={telHref(p.recieverPhoneNumber)} className="block font-semibold underline decoration-gray-300 underline-offset-2 mt-0.5">{p.recieverPhoneNumber}</a>
                    )}
                </Row>
                <Row icon={<MapPinIcon className="w-4 h-4" />} label="Delivery address">
                    {hasPin(p) && p.receiverLocationName && (
                        <span className="block">{p.receiverLocationName}</span>
                    )}
                    <span className={hasPin(p) && p.receiverLocationName ? "block text-gray-500 font-normal" : undefined}>
                        {p.receiverAddress || (hasPin(p) ? "" : "No address given")}
                    </span>
                    {directionsHref(p) && (
                        <a href={directionsHref(p)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gray-700 font-semibold underline decoration-gray-300 underline-offset-2 mt-0.5">
                            <Navigation className="w-3.5 h-3.5" /> {hasPin(p) ? "Directions to the pin" : "Search address in Maps"}
                        </a>
                    )}
                    {!hasPin(p) && p.receiverAddress && (
                        <span className="block text-[11px] text-gray-400 font-normal mt-0.5">No map pin for this parcel; directions use the address text.</span>
                    )}
                </Row>
                <Row icon={<PackageIcon className="w-4 h-4" />} label="Item">
                    {p.parcelDescription || "Not described"}
                    {p.shelfName && <span className="text-gray-500"> · Shelf {p.shelfName}</span>}
                </Row>
                {(p.senderName || p.senderPhoneNumber) && (
                    <Row icon={<Phone className="w-4 h-4" />} label="Sender">
                        {p.senderName || "N/A"}
                        {p.senderPhoneNumber && <span className="block text-gray-500">{p.senderPhoneNumber}</span>}
                    </Row>
                )}
            </div>
            <div className="mt-2 rounded-2xl bg-gray-50 p-4">
                {lines.filter(([, v]) => v).map(([label, v]) => (
                    <div key={label} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium">{formatCurrency(v || 0)}</span>
                    </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-200">
                    <span className="font-semibold">Total to collect</span>
                    <span className="font-bold">{formatCurrency(parcelTotal(p))}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-gray-500">
                {assignment.assignedAt ? <div><p>Assigned</p><p className="text-neutral-800 font-medium">{formatDateTime(String(assignment.assignedAt))}</p></div> : null}
                {assignment.completedAt ? <div><p>Completed</p><p className="text-neutral-800 font-medium">{formatDateTime(String(assignment.completedAt))}</p></div> : null}
                {assignment.paymentMethod ? <div><p>Payment</p><p className="text-neutral-800 font-medium capitalize">{assignment.paymentMethod === "momo" ? "Mobile money" : assignment.paymentMethod}</p></div> : null}
            </div>
        </div>
    );
};

/** Grey placeholder while a list loads. */
export const CardSkeleton = ({ count = 3 }: { count?: number }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-white p-4 animate-pulse">
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-3/4 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
        ))}
    </div>
);

export const EmptyState = ({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) => (
    <div className="rounded-3xl bg-white px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">{icon}</div>
        <p className="font-semibold text-neutral-800">{title}</p>
        {hint && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
    </div>
);
