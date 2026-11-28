import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";
import {
  PhoneIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  TruckIcon,
  MapPinIcon,
  AlertCircleIcon,
  Loader,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useStation, normalizeRole } from "../../contexts/StationContext";
import authService from "../../services/authService";

export const Login = (): JSX.Element => {
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { setUser, setStation, isAuthenticated, userRole } = useStation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && userRole) {
      const timer = setTimeout(() => {
        if (userRole === "SUPER_ADMIN") {
          navigate("/admin/dashboard", { replace: true });
        } else if (userRole === "ADMIN") {
          navigate("/admin/dashboard", { replace: true });
        } else if (userRole === "MANAGER") {
          navigate("/delivery/search", { replace: true });
        } else if (userRole === "FRONTDESK") {
          navigate("/parcel/search", { replace: true });
        } else if (userRole === "CALLER") {
          navigate("/delivery/call-center", { replace: true });
        } else if (userRole === "RIDER") {
          navigate("/rider/dashboard", { replace: true });
        } else if (userRole === "VENDOR") {
          navigate("/partner", { replace: true });
        } else {
          navigate("/parcel/intake", { replace: true });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, userRole, navigate]);

  const normalizePhoneForBackend = (input: string): string => {
    const trimmed = input.trim().replace(/\s|-/g, "");
    if (!trimmed) return trimmed;
    let digits = trimmed.startsWith("0") ? trimmed.slice(1) : trimmed;
    if (digits.startsWith("+")) digits = digits.slice(1);
    if (digits.startsWith("233")) return `+${digits}`;
    return `+233${digits}`;
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.trim().replace(/\s|-/g, "");
    const ghanaPattern = /^(0\d{9}|\d{9}|\+233\d{9})$/;
    return ghanaPattern.test(cleaned);
  };

  const formatPhoneInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.startsWith("0")) {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setPhoneNumber(formatted);
    setError("");
    if (formatted.length >= 10) {
      setPhoneValid(validatePhone(formatted));
    } else {
      setPhoneValid(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!phoneNumber.trim()) {
        setError("Phone number is required.");
        setLoading(false);
        return;
      }
      const phoneForBackend = normalizePhoneForBackend(phoneNumber);
      const response = await authService.loginWithPhone(phoneForBackend, password);

      if (!response.success) {
        setError(response.message);
        setLoading(false);
        return;
      }

      if (response.data) {
        const userData = response.data.user;
        const normalizedRole = normalizeRole(userData.role);

        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: normalizedRole as any,
          stationId: userData.stationId,
          office: userData.office,
        });

        if (userData.stationId) {
          setStation({
            id: userData.stationId,
            name: `Station ${userData.stationId}`,
            location: "Location",
          });
        } else {
          setStation(null);
        }

        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedPhone", phoneNumber);
        }

        setTimeout(() => {
          if (normalizedRole === "SUPER_ADMIN") {
            navigate("/admin/dashboard", { replace: true });
          } else if (normalizedRole === "ADMIN") {
            navigate("/admin/dashboard", { replace: true });
          } else if (normalizedRole === "MANAGER") {
            navigate("/delivery/search", { replace: true });
          } else if (normalizedRole === "FRONTDESK") {
            navigate("/parcel/search", { replace: true });
          } else if (normalizedRole === "CALLER") {
            navigate("/delivery/call-center", { replace: true });
          } else if (normalizedRole === "RIDER") {
            navigate("/rider/dashboard", { replace: true });
          } else if (normalizedRole === "VENDOR") {
            navigate("/partner", { replace: true });
          } else {
            navigate("/parcel/intake", { replace: true });
          }
        }, 500);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const rememberMe = localStorage.getItem("rememberMe") === "true";
    if (rememberMe) {
      const savedPhone = localStorage.getItem("rememberedPhone");
      if (savedPhone) {
        setPhoneNumber(savedPhone);
      }
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full overflow-x-hidden flex flex-col lg:flex-row bg-white">
      {/* LEFT SIDE - Brand Hero (Desktop Only) */}
      <div className="relative hidden overflow-hidden border-r border-orange-100 bg-gradient-to-b from-[#fff4ea] via-[#fbfaf8] to-[#fff7f0] lg:flex lg:w-[45%] lg:min-h-screen lg:flex-col lg:justify-between p-10 xl:p-14">
        {/* dotted texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(rgba(20,20,20,0.06) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "radial-gradient(circle, #ea690c, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full opacity-[0.12] blur-3xl"
          style={{ background: "radial-gradient(circle, #1e40af, transparent 70%)" }}
        />

        {/* logo */}
        <div className="relative flex items-center gap-3">
          <div>
            <BrandMark size="lg" />
            <p className="mt-1 text-sm text-neutral-500">Sign in to your company's workspace</p>
          </div>
        </div>

        {/* headline + features */}
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 xl:text-4xl">
            Fast, reliable delivery
            <br />
            <span className="bg-gradient-to-r from-[#ea690c] to-[#ff8c3a] bg-clip-text text-transparent">across Ghana.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-500">
            Manage parcels, track deliveries, and streamline operations — all from one purpose-built workspace.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: MapPinIcon, label: "Real-time delivery tracking across every branch" },
              { icon: Zap, label: "Fast parcel intake and rider dispatch" },
              { icon: TruckIcon, label: "Reliable fleet and automated reconciliation" },
            ].map((f) => (
              <li key={f.label} className="flex items-start gap-3 text-sm text-neutral-600">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <f.icon className="h-4 w-4 text-[#ea690c]" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>

          {/* stat strip */}
          <div className="mt-10 flex items-center gap-6">
            {[
              { value: "10K+", label: "Parcels delivered" },
              { value: "10+", label: "Active stations" },
              { value: "99%", label: "Success rate" },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? "border-l border-neutral-200 pl-6" : ""}>
                <p className="text-2xl font-extrabold text-neutral-900">{s.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-neutral-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-neutral-400">© 2026 Mealex &amp; Mailex · Every parcel. Every branch. One platform.</p>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="flex w-full flex-1 items-start justify-center overflow-y-auto bg-white px-4 py-8 sm:items-center sm:px-6 lg:w-[55%] lg:min-h-screen lg:p-8">
        <div className="mx-auto w-full max-w-md min-w-0">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 min-w-0 lg:hidden">
            <div className="min-w-0">
              <BrandMark />
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">Sign in to your company's workspace</p>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">Welcome back</h2>
              <p className="mt-1.5 text-sm text-gray-500 sm:text-base">Sign in to access your dashboard.</p>
            </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
                  <AlertCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 flex-1">{error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-neutral-800">
                    Phone Number
                  </Label>
                  <div className="relative group">
                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#ea690c] transition-colors pointer-events-none z-10" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="055-012-3456"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      disabled={loading}
                      required
                      className={`pl-11 pr-11 h-11 sm:h-12 w-full min-w-0 rounded-xl border-2 bg-white text-neutral-800 placeholder:text-gray-400 focus:ring-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${phoneValid === true
                          ? "border-green-400 focus:border-green-500 focus:ring-green-100"
                          : phoneValid === false
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                            : "border-gray-200 focus:border-[#ea690c] focus:ring-orange-100"
                        }`}
                    />
                    {phoneValid === true && (
                      <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 animate-fade-in" />
                    )}
                    {phoneValid === false && (
                      <AlertCircleIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 animate-fade-in" />
                    )}
                  </div>
                  {phoneValid === false && (
                    <p className="text-xs text-red-600 flex items-center gap-1 animate-fade-in">
                      <AlertCircleIcon className="w-3 h-3" />
                      Please enter a valid Ghana phone number
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-neutral-800">
                    Password
                  </Label>
                  <div className="relative group">
                    <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#ea690c] transition-colors pointer-events-none z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      onKeyDown={handleKeyDown}
                      onKeyUp={handleKeyUp}
                      disabled={loading}
                      placeholder="Enter your password"
                      required
                      className="pl-11 pr-12 h-11 sm:h-12 w-full min-w-0 rounded-xl border-2 border-gray-200 bg-white text-neutral-800 placeholder:text-gray-400 focus:border-[#ea690c] focus:ring-4 focus:ring-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ea690c] transition-colors z-10 disabled:opacity-50"
                      tabIndex={-1}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {capsLockOn && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg animate-fade-in">
                      <AlertCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">Caps Lock is ON</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#ea690c] focus:ring-[#ea690c] focus:ring-offset-0 cursor-pointer shrink-0"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-[#ea690c] hover:text-orange-700 transition-colors sm:text-right"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 bg-[#ea690c] text-white hover:bg-orange-700 rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 mt-4 sm:mt-6"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="font-semibold text-[#ea690c] hover:underline">
                  Create one
                </Link>
              </p>

              <div className="mt-6 border-t border-gray-100 pt-5 text-center">
                <p className="text-xs text-gray-400">Version 1.0.0 · Secure API Integration</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
