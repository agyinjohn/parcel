import { CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { GhanaPhoneInput } from "../../../components/GhanaPhoneInput";
import { validatePhoneNumber } from "../../../utils/dataHelpers";
import { BrandWordmark } from "../../../components/BrandMark";

interface Props {
  phone: string;
  loading: boolean;
  error: string;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
}

/** Customer portal home: search by the phone number the parcel was sent to. Works for every company on ParcelFlow. */
export const CustomerReceiveLanding = ({ phone, loading, error, onPhoneChange, onSubmit }: Props) => (
  <div className="animate-in fade-in duration-300">
    <div className="mb-5 text-center">
      <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-3xl">
        Track and receive <br className="sm:hidden" />your parcels
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
        For parcels sent through any delivery company on <BrandWordmark className="text-sm" />. Enter the phone number the parcel was sent to.
      </p>
    </div>

    <form
      onSubmit={(e) => { e.preventDefault(); if (!loading && validatePhoneNumber(phone)) onSubmit(); }}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <label htmlFor="track-phone" className="block text-sm font-medium text-neutral-800">Phone number</label>
      <GhanaPhoneInput
        id="track-phone"
        value={phone}
        onChange={onPhoneChange}
        disabled={loading}
        placeholder="24 123 4567"
        className="rounded-xl border-slate-200 bg-slate-50/60 py-3.5 focus:bg-white"
      />
      {error && (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <Button type="submit" disabled={loading || !validatePhoneNumber(phone)} className="h-12 w-full rounded-xl bg-[#ea690c] text-base font-semibold text-white hover:bg-[#d45e0a]">
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching…</> : <><Search className="mr-2 h-4 w-4" />Find my parcels</>}
      </Button>
    </form>

    <ul className="mt-5 space-y-2 px-1 text-sm text-slate-600">
      {["See which station has your parcel, with directions", "Know exactly what to pay before you go", "Book delivery to your door and pay online"].map((t) => (
        <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />{t}</li>
      ))}
    </ul>
    <p className="mt-5 px-1 text-xs text-slate-500">Got an SMS from us? Open the link in it to go straight to your parcel.</p>
  </div>
);
