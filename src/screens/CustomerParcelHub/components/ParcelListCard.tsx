import { ChevronRight, MapPin } from "lucide-react";
import {
  EnrichedParcel,
  STATUS_STYLES,
  formatTrackCurrency,
  getAmountToPay,
  getParcelTitle,
} from "../trackParcelUtils";

interface Props {
  parcel: EnrichedParcel;
  isSelected: boolean;
  showCheckbox: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
}

/** One parcel in the list: compact enough for a 320px screen. */
export const ParcelListCard = ({ parcel, isSelected, showCheckbox, onToggleSelect, onOpen }: Props) => {
  const title = getParcelTitle(parcel);
  const amount = getAmountToPay(parcel);
  const where = [parcel.companyName, parcel.branchName].filter(Boolean).join(" · ");

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-2xl border bg-white transition-shadow ${
        isSelected ? "border-[#ea690c]/50 ring-2 ring-[#ea690c]/15" : "border-slate-200 shadow-sm"
      }`}
    >
      {showCheckbox && (
        <label className="flex shrink-0 cursor-pointer items-start pl-3 pt-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded accent-[#ea690c]"
            aria-label={`Select ${title} for delivery`}
          />
        </label>
      )}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 p-3 pl-3 text-left">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[parcel.displayStatus]}`}>
            {parcel.statusLabel}
          </span>
          <p className="line-clamp-2 break-words font-semibold leading-snug text-neutral-900">{title}</p>
          <p className="truncate font-mono text-[11px] text-slate-400">{parcel.parcelId}</p>
          {(where || parcel.shelfName) && (
            <p className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{[where, parcel.shelfName && `Shelf ${parcel.shelfName}`].filter(Boolean).join(" · ")}</span>
            </p>
          )}
          {amount != null && amount > 0 && (
            <p className="text-sm font-semibold text-[#ea690c]">
              {formatTrackCurrency(amount)} <span className="text-xs font-normal text-slate-500">to pay{parcel.pod ? " (incl. item value)" : ""}</span>
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
      </button>
    </div>
  );
};
