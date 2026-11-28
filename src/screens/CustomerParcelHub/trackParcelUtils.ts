import type { CustomerParcel } from "../../services/customerService";

export type TrackStep = "search" | "otp" | "list" | "detail";

export type ParcelDisplayStatus = "ready" | "in_progress" | "delivered" | "out_for_delivery" | "collected";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface ParcelTimelineEvent {
  id: string;
  label: string;
  timestamp: number | null;
  completed: boolean;
}

export interface EnrichedParcel extends CustomerParcel {
  displayStatus: ParcelDisplayStatus;
  statusLabel: string;
  /** One line telling the customer what happens next. */
  statusHint: string;
  branchName: string;
  arrivedAt: number | null;
  timeline: ParcelTimelineEvent[];
}

export interface ChargeLine {
  label: string;
  amount: number;
}

export function formatTrackCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `GHC ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTrackDate(ts: number | null | undefined): string {
  if (ts == null) return "—";
  const ms = typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTrackDateTime(ts: number | null | undefined): string {
  if (ts == null) return "—";
  const ms = typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const local = digits.startsWith("233") ? digits.slice(3) : digits;
  return `+233 ${local.slice(0, 2)}••••${local.slice(-3)}`;
}

const pos = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** What the customer still owes, line by line. POD parcels include the item value collected for the sender. */
export function chargeLines(p: CustomerParcel): ChargeLine[] {
  const lines: ChargeLine[] = [
    { label: "Inbound fee", amount: p.inboudPayed ? 0 : pos(p.inboundCost) },
    { label: "Storage", amount: pos(p.storageCost) },
    { label: "Delivery fee", amount: p.homeDelivery ? pos(p.deliveryCost) : 0 },
    { label: "Pickup fee", amount: pos(p.pickUpCost) },
    { label: "Item value (pay on delivery)", amount: p.pod ? pos(p.itemCost) : 0 },
  ];
  return lines.filter(l => l.amount > 0);
}

export function getAmountToPay(p: CustomerParcel): number | null {
  if (p.delivered || p.pickedUp) return 0;
  const total = chargeLines(p).reduce((s, l) => s + l.amount, 0);
  if (total > 0) return Math.round(total * 100) / 100;
  if (p.parcelAmount != null && !Number.isNaN(p.parcelAmount) && p.parcelAmount > 0) return p.parcelAmount;
  return null;
}

const isAtStation = (p: CustomerParcel) => !!p.hasArrivedAtOffice || !!p.shelfName;
const isWithRider = (p: CustomerParcel) => !p.delivered && !p.pickedUp && (!!p.parcelAssigned || !!p.riderInfo);

function getDisplayStatus(p: CustomerParcel): { status: ParcelDisplayStatus; label: string; hint: string } {
  if (p.delivered) return { status: "delivered", label: "Delivered", hint: "This parcel has been delivered." };
  if (p.pickedUp) return { status: "collected", label: "Collected", hint: "This parcel was collected at the station." };
  if (isWithRider(p)) return { status: "out_for_delivery", label: "Out for delivery", hint: "A rider has your parcel and is bringing it to you." };
  if (isAtStation(p))
    return {
      status: "ready",
      label: "Ready at the station",
      hint: p.homeDelivery ? "Delivery is booked. The station will assign a rider soon." : "Collect it at the station, or request delivery to your door.",
    };
  return { status: "in_progress", label: "On the way to the station", hint: "We'll text you when it arrives. You can book delivery now." };
}

function buildTimeline(p: CustomerParcel): ParcelTimelineEvent[] {
  const created = p.createdAt ?? null;
  const done = !!p.delivered || !!p.pickedUp;
  const events: ParcelTimelineEvent[] = [
    { id: "registered", label: "Registered by the sender", timestamp: created, completed: created != null },
    { id: "arrived", label: "Arrived at the station", timestamp: null, completed: isAtStation(p) || done || isWithRider(p) },
  ];
  if (p.homeDelivery || isWithRider(p) || p.delivered) {
    events.push({ id: "rider", label: p.riderInfo?.riderName ? `With rider ${p.riderInfo.riderName}` : "With a rider", timestamp: null, completed: isWithRider(p) || !!p.delivered });
    events.push({ id: "delivered", label: "Delivered", timestamp: p.delivered ? p.updatedAt ?? null : null, completed: !!p.delivered });
  } else {
    events.push({ id: "collected", label: "Collected at the station", timestamp: p.pickedUp ? p.updatedAt ?? null : null, completed: !!p.pickedUp });
  }
  return events;
}

export const STATUS_STYLES: Record<ParcelDisplayStatus, string> = {
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  delivered: "bg-slate-100 text-slate-600 border-slate-200",
  out_for_delivery: "bg-sky-50 text-sky-700 border-sky-200",
  collected: "bg-slate-100 text-slate-600 border-slate-200",
};

export function getParcelTitle(p: Pick<EnrichedParcel, "parcelDescription" | "receiverName" | "parcelId">): string {
  return p.parcelDescription || p.receiverName || "Parcel";
}

export function getParcelImageUrl(p: CustomerParcel): string | null {
  const candidates = [
    p.parcelImageUrl,
    (p as CustomerParcel & { imageUrl?: string }).imageUrl,
    (p as CustomerParcel & { parcelImage?: string }).parcelImage,
    (p as CustomerParcel & { photoUrl?: string }).photoUrl,
  ];
  const url = candidates.find(v => typeof v === "string" && v.trim().length > 0);
  return url?.trim() ?? null;
}

const FALLBACK_GRADIENTS = [
  "from-orange-50 via-white to-orange-100/80",
  "from-slate-50 via-white to-slate-100",
  "from-amber-50/80 via-white to-orange-50",
  "from-stone-50 via-white to-stone-100",
];

export function getParcelFallbackGradient(parcelId: string): string {
  const code = parcelId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[code % FALLBACK_GRADIENTS.length];
}

export function getParcelInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase() || "PK";
}

const STATUS_SORT_ORDER: Record<ParcelDisplayStatus, number> = {
  ready: 0,
  out_for_delivery: 1,
  in_progress: 2,
  delivered: 3,
  collected: 3,
};

export function sortParcelsForReceive(parcels: EnrichedParcel[]): EnrichedParcel[] {
  return [...parcels].sort((a, b) => {
    const byStatus = STATUS_SORT_ORDER[a.displayStatus] - STATUS_SORT_ORDER[b.displayStatus];
    if (byStatus !== 0) return byStatus;
    return (b.arrivedAt ?? b.createdAt ?? 0) - (a.arrivedAt ?? a.createdAt ?? 0);
  });
}

export function isParcelDeliverable(p: EnrichedParcel): boolean {
  return p.displayStatus === "ready" || p.displayStatus === "in_progress";
}

export function isParcelArrived(p: EnrichedParcel): boolean {
  return p.displayStatus === "ready";
}

/** True when any parcel in the batch has not reached the branch yet. */
export function requiresScheduledDelivery(parcels: EnrichedParcel[]): boolean {
  return parcels.some(p => !isParcelArrived(p));
}

export interface DeliverySchedule {
  date: string;
  time: string;
}

export function formatDeliverySchedule(schedule: DeliverySchedule): string {
  const d = new Date(`${schedule.date}T${schedule.time}`);
  if (Number.isNaN(d.getTime())) return `${schedule.date} ${schedule.time}`;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayDateInput(): string {
  return new Date().toISOString().split("T")[0];
}

const DELIVERY_BASE_FEE = 10;
const DELIVERY_EXTRA_PER_PARCEL = 3;

export function estimateDeliveryFee(parcelCount: number): number {
  if (parcelCount <= 0) return 0;
  return DELIVERY_BASE_FEE + Math.max(0, parcelCount - 1) * DELIVERY_EXTRA_PER_PARCEL;
}

export function sumParcelAmounts(parcels: EnrichedParcel[]): number {
  return parcels.reduce((sum, p) => sum + (getAmountToPay(p) ?? 0), 0);
}

export type DeliverySuccessInfo = {
  parcelCount: number;
  paystackReference?: string;
  scheduled?: boolean;
  scheduledAt?: string;
} | null;

export function enrichParcel(p: CustomerParcel, officeNames: Record<string, string> = {}): EnrichedParcel {
  const { status, label, hint } = getDisplayStatus(p);
  return {
    ...p,
    displayStatus: status,
    statusLabel: label,
    statusHint: hint,
    branchName: p.office?.name || p.officeName || (p.officeId && officeNames[p.officeId]) || "",
    arrivedAt: null,
    timeline: buildTimeline(p),
  };
}
