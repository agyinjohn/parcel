import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/BrandMark";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  subtitle?: string;
}

/** Header for the customer portal. ParcelFlow-branded: the portal serves every company and station. */
export const TrackHeader = ({ onBack, backLabel = "Back", subtitle }: Props) => (
  <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
    <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-3 sm:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <Link to="/receive" className="min-w-0 shrink-0" aria-label="ParcelFlow parcel tracking">
        <BrandMark size="sm" />
      </Link>
      {subtitle && <span className="ml-auto truncate text-xs font-medium text-slate-500">{subtitle}</span>}
    </div>
  </header>
);
