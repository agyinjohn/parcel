import { useState } from "react";
import {
  Building2, Check, CheckCircle2, Clock, Copy, MapPin, Navigation, Package, Phone, Share2, Truck, UserRound, Wallet,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { ParcelThumbnail } from "./ParcelThumbnail";
import {
  EnrichedParcel, STATUS_STYLES, chargeLines, formatTrackCurrency, formatTrackDateTime, getAmountToPay, getParcelTitle, isParcelArrived,
} from "../trackParcelUtils";
import type { DeliverySuccessInfo } from "../trackParcelUtils";

export type ParcelActionSuccess = "delivery" | null;

interface Props {
  parcel: EnrichedParcel;
  actionSuccess: ParcelActionSuccess;
  deliverySuccess: DeliverySuccessInfo;
  onRequestDelivery: () => void;
}

const TYPE_LABEL: Record<string, string> = { PARCEL: "Parcel", ONLINE: "Online order", PICKUP: "Pickup request", TRANSFER: "Transfer" };

/** Google Maps embed (no API key needed) for a point or a place name. */
const embedUrl = (q: string) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
const directionsUrl = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;

const MapBox = ({ query, title }: { query: string; title: string }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
    <iframe title={title} src={embedUrl(query)} className="block h-48 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
  </div>
);

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) =>
  value === undefined || value === null || value === "" ? null : (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-neutral-800">{value}</span>
    </div>
  );

const Section = ({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) => (
  <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <CardContent className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800"><Icon className="h-4 w-4 text-[#ea690c]" />{title}</h2>
      {children}
    </CardContent>
  </Card>
);

export const ParcelDetailView = ({ parcel, actionSuccess, deliverySuccess, onRequestDelivery }: Props) => {
  const [copied, setCopied] = useState(false);
  const amount = getAmountToPay(parcel);
  const lines = chargeLines(parcel);
  const title = getParcelTitle(parcel);
  const office = parcel.office;
  const finished = parcel.displayStatus === "delivered" || parcel.displayStatus === "collected";
  const withRider = parcel.displayStatus === "out_for_delivery";

  const stationQuery = office?.latitude != null && office?.longitude != null
    ? `${office.latitude},${office.longitude}`
    : [office?.name ?? parcel.branchName, office?.address].filter(Boolean).join(", ");
  const hasDeliveryPin = parcel.receiverLatitude != null && parcel.receiverLongitude != null;
  const deliveryQuery = hasDeliveryPin ? `${parcel.receiverLatitude},${parcel.receiverLongitude}` : "";
  const deliveryPlace = [parcel.receiverLocationName, parcel.receiverAddress || parcel.deliveryAddress].filter(Boolean).join(" · ");

  const canRequestDelivery = !actionSuccess && !finished && !withRider && !parcel.homeDelivery;

  const copyId = async () => {
    try { await navigator.clipboard.writeText(parcel.parcelId); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  const share = async () => {
    const text = `Parcel ${parcel.parcelId}: ${parcel.statusLabel}`;
    if (navigator.share) { try { await navigator.share({ title: "Parcel tracking", text, url: window.location.href }); } catch { /* ignore */ } }
    else copyId();
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-300">
      {actionSuccess === "delivery" && deliverySuccess && (
        <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold text-blue-900">{deliverySuccess.scheduled ? "Delivery booked" : "Delivery requested"}</p>
            <p className="mt-1">
              The station has your request{deliverySuccess.scheduledAt ? ` for ${deliverySuccess.scheduledAt}` : ""} and will assign a rider. We'll text you when the rider is on the way.
              {deliverySuccess.paystackReference && <> Payment ref <span className="font-mono text-xs">{deliverySuccess.paystackReference}</span>.</>}
            </p>
          </div>
        </div>
      )}

      {/* Status */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <ParcelThumbnail parcel={parcel} size="hero" className="rounded-none border-0 border-b border-slate-100" />
        <CardContent className="space-y-4 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold leading-snug text-neutral-900">{title}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[parcel.displayStatus]}`}>{parcel.statusLabel}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <button type="button" onClick={copyId} className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-[#ea690c]">
                {parcel.parcelId}{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={share} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#ea690c]"><Share2 className="h-3.5 w-3.5" />Share</button>
            </div>
            <p className="mt-3 text-sm text-slate-600">{parcel.statusHint}</p>
          </div>

          {/* Journey */}
          <ol className="relative ml-1 space-y-3 border-l border-slate-200 pl-5">
            {parcel.timeline.map((e) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${e.completed ? "bg-[#ea690c]" : "bg-slate-300"}`} />
                <p className={`text-sm ${e.completed ? "font-medium text-neutral-800" : "text-slate-400"}`}>{e.label}</p>
                {e.timestamp != null && <p className="text-xs text-slate-400">{formatTrackDateTime(e.timestamp)}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Where it is now */}
      {withRider ? (
        <Section icon={Truck} title="With your rider">
          <Row label="Rider" value={parcel.riderInfo?.riderName || "Assigned"} />
          {parcel.riderInfo?.riderPhoneNumber && (
            <a href={`tel:${parcel.riderInfo.riderPhoneNumber}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-neutral-800 hover:border-[#ea690c] hover:text-[#ea690c]">
              <Phone className="h-4 w-4" />Call the rider
            </a>
          )}
          {hasDeliveryPin && <MapBox query={deliveryQuery} title="Delivery location" />}
          {deliveryPlace && <p className="text-sm text-slate-600"><MapPin className="mr-1 inline h-3.5 w-3.5 text-slate-400" />Delivering to {deliveryPlace}</p>}
        </Section>
      ) : !finished ? (
        <Section icon={Building2} title={parcel.displayStatus === "ready" ? "Where your parcel is" : "Where it's going"}>
          <div>
            <p className="font-semibold text-neutral-900">{parcel.branchName || "Station"}</p>
            {office?.address && <p className="text-sm text-slate-600">{office.address}</p>}
          </div>
          <div className="divide-y divide-slate-100">
            {parcel.displayStatus === "ready" && <Row label="Shelf" value={parcel.shelfName} />}
            <Row label="Opening hours" value={office?.openingHours} />
          </div>
          {stationQuery && <MapBox query={stationQuery} title="Station location" />}
          <div className="grid grid-cols-2 gap-2">
            {office?.phoneNumber ? (
              <a href={`tel:${office.phoneNumber}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-neutral-800 hover:border-[#ea690c] hover:text-[#ea690c]"><Phone className="h-4 w-4" />Call station</a>
            ) : <span />}
            {stationQuery && (
              <a href={directionsUrl(stationQuery)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-neutral-800 hover:border-[#ea690c] hover:text-[#ea690c]"><Navigation className="h-4 w-4" />Directions</a>
            )}
          </div>
          {!stationQuery && <p className="text-xs text-slate-400">The station's address isn't available yet.</p>}
        </Section>
      ) : null}

      {/* Delivery location (when booked, not yet with a rider) */}
      {!withRider && (parcel.homeDelivery || hasDeliveryPin) && (
        <Section icon={MapPin} title={parcel.delivered ? "Delivered to" : "Delivery address"}>
          {deliveryPlace ? <p className="text-sm text-neutral-800">{deliveryPlace}</p> : <p className="text-sm text-slate-500">No address given yet.</p>}
          {hasDeliveryPin && <MapBox query={deliveryQuery} title="Delivery location" />}
        </Section>
      )}

      {/* Payment */}
      <Section icon={Wallet} title={finished ? "Payment" : "To pay"}>
        {finished ? (
          <p className="text-sm text-slate-600">Nothing left to pay.</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {lines.map((l) => <Row key={l.label} label={l.label} value={formatTrackCurrency(l.amount)} />)}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
              <span className="text-sm font-medium text-orange-800">Total</span>
              <span className="text-xl font-bold text-[#ea690c]">{amount != null ? formatTrackCurrency(amount) : "Ask the station"}</span>
            </div>
            <p className="text-xs text-slate-500">
              {parcel.homeDelivery ? "Pay the rider when your parcel arrives." : "Pay at the station when you collect, or online when you book delivery."}
            </p>
          </>
        )}
      </Section>

      {/* Parcel details */}
      <Section icon={Package} title="Parcel details">
        <div className="divide-y divide-slate-100">
          <Row label="Description" value={parcel.parcelDescription} />
          <Row label="Type" value={parcel.typeofParcel ? TYPE_LABEL[parcel.typeofParcel] ?? parcel.typeofParcel : undefined} />
          <Row label="Items" value={(parcel.numberOfItems || parcel.itemQuantity) || undefined} />
          <Row label="Weight" value={parcel.parcelWeight ? `${parcel.parcelWeight} kg` : undefined} />
          <Row label="Handling" value={parcel.fragile ? "Fragile" : undefined} />
          <Row label="Pay on delivery" value={parcel.pod ? "Yes" : undefined} />
          <Row label="From" value={parcel.senderName || undefined} />
          <Row label="For" value={parcel.receiverName || undefined} />
          <Row label="Registered" value={parcel.createdAt ? formatTrackDateTime(parcel.createdAt) : undefined} />
          <Row label="Last update" value={parcel.updatedAt ? formatTrackDateTime(parcel.updatedAt) : undefined} />
        </div>
      </Section>

      {canRequestDelivery && (
        <div className="safe-area-pb fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg gap-2">
            <Button type="button" onClick={onRequestDelivery} className="h-11 w-full rounded-xl bg-[#ea690c] text-white hover:bg-[#d45e0a]">
              <Truck className="mr-2 h-4 w-4" />
              {isParcelArrived(parcel) ? "Deliver it to me" : "Book delivery for when it arrives"}
            </Button>
          </div>
        </div>
      )}
      {!canRequestDelivery && parcel.homeDelivery && !finished && !withRider && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />Delivery is booked for this parcel.</p>
      )}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><UserRound className="h-3 w-3" />Only show this page to people you trust with your parcel.</p>
    </div>
  );
};
