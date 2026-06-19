import { Input } from "./ui/input";
import { normalizePhoneNumber } from "../utils/dataHelpers";

interface GhanaPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const displayDigits = (phone: string) => {
  if (!phone || phone === "+233") return "";
  return phone.startsWith("+233") ? phone.substring(4) : phone.replace(/\D/g, "").substring(0, 10);
};

export const GhanaPhoneInput = ({
  value,
  onChange,
  placeholder = "0XXXXXXXXX or XXXXXXXXX",
  className = "",
  disabled,
  id,
}: GhanaPhoneInputProps) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-medium pointer-events-none z-10">
      +233
    </span>
    <Input
      id={id}
      type="tel"
      value={displayDigits(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").substring(0, 10);
        onChange(digits ? normalizePhoneNumber(digits) : "");
      }}
      placeholder={placeholder}
      className={`pl-14 ${className}`}
      maxLength={10}
      disabled={disabled}
    />
  </div>
);
