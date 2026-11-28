import { Package } from "lucide-react";

/**
 * The ParcelFlow wordmark: "Parcel" in ink, "Flow" in the brand orange gradient, set in Bricolage
 * Grotesque (loaded in index.html). Use it wherever the product name appears.
 */
export const BrandWordmark = ({ className = "text-xl" }: { className?: string }) => (
    <span className={`font-brand font-extrabold leading-none tracking-[-0.035em] ${className}`}>
        <span className="text-neutral-900">Parcel</span>
        <span className="bg-gradient-to-r from-[#ea690c] via-[#f97316] to-[#c2470a] bg-clip-text text-transparent">Flow</span>
    </span>
);

export const BrandMark = ({ size = "md", showIcon = true }: { size?: "sm" | "md" | "lg"; showIcon?: boolean }) => {
    const box = size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-11 w-11 rounded-2xl" : "h-9 w-9 rounded-xl";
    const icon = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
    const text = size === "sm" ? "text-lg" : size === "lg" ? "text-[1.7rem]" : "text-[1.4rem]";
    return (
        <span className="inline-flex items-center gap-2.5">
            {showIcon && (
                <span className={`flex ${box} items-center justify-center bg-gradient-to-br from-[#ea690c] to-[#c2470a] shadow-lg shadow-orange-200`}>
                    <Package className={`${icon} text-white`} strokeWidth={2.2} />
                </span>
            )}
            <BrandWordmark className={text} />
        </span>
    );
};

/** A company name in the brand typeface; "ParcelFlow" itself gets the two-tone wordmark. */
export const CompanyName = ({ name, className = "text-[15px]" }: { name: string; className?: string }) =>
    name.trim().toLowerCase() === "parcelflow"
        ? <BrandWordmark className={className} />
        : <span className={`font-brand font-extrabold leading-tight tracking-[-0.02em] bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent ${className}`}>{name}</span>;
