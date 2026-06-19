import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  PackageIcon,
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
import { Card, CardContent } from "../../components/ui/card";
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
    console.log("Checking authentication - isAuthenticated:", isAuthenticated, "userRole:", userRole);
    if (isAuthenticated && userRole) {
      console.log("User is authenticated with role:", userRole);

      const timer = setTimeout(() => {
        if (userRole === "ADMIN") {
          console.log("Redirecting to admin dashboard");
          navigate("/admin/financial", { replace: true });
          return;
        } else if (userRole === "RIDER") {
          navigate("/rider/dashboard", { replace: true });
        } else if (userRole === "CALLER") {
          navigate("/call-center", { replace: true });
        } else if (userRole === "VENDOR") {
          navigate("/partner", { replace: true });
        } else {
          navigate("/parcel-search", { replace: true });
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
      console.log("Login response:", response);

      if (!response.success) {
        setError(response.message);
        setLoading(false);
        return;
      }

      if (response.data) {
        const userData = response.data.user;
        const normalizedRole = normalizeRole(userData.role);

        console.log("Setting user with role:", normalizedRole);

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

        console.log("Redirecting with role:", normalizedRole);
        setTimeout(() => {
          console.log("Navigating based on role:", normalizedRole);
          if (normalizedRole === "ADMIN") {
            console.log("Navigate to admin dashboard");
            navigate("/admin/dashboard", { replace: true });
          } else if (normalizedRole === "RIDER") {
            navigate("/rider/dashboard", { replace: true });
          } else if (normalizedRole === "CALLER") {
            navigate("/call-center", { replace: true });
          } else if (normalizedRole === "VENDOR") {
            navigate("/partner", { replace: true });
          } else {
            navigate("/parcel-search", { replace: true });
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
    <div className="min-h-screen min-h-[100dvh] w-full overflow-x-hidden flex flex-col lg:flex-row">
      {/* LEFT SIDE - Brand Hero (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 lg:min-h-screen bg-gradient-to-br from-[#ea690c] via-orange-600 to-orange-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 animate-float" style={{ animationDelay: '0s' }}>
            <PackageIcon className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
            <TruckIcon className="w-40 h-40 text-white" />
          </div>
          <div className="absolute bottom-20 left-20 animate-float" style={{ animationDelay: '2s' }}>
            <MapPinIcon className="w-36 h-36 text-white" />
          </div>
          <div className="absolute bottom-40 right-10 animate-float" style={{ animationDelay: '1.5s' }}>
            <PackageIcon className="w-28 h-28 text-white" />
          </div>
          <div className="absolute top-1/2 left-1/4 animate-float" style={{ animationDelay: '0.5s' }}>
            <Zap className="w-24 h-24 text-white" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl p-2">
                <img src="/logo-1.png" alt="M&M Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Mealex & Mailex</h1>
                <p className="text-orange-100 text-lg">Parcel Delivery System</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-bold leading-tight">
              Fast, Reliable Delivery
              <br />
              <span className="text-orange-200">Across Ghana</span>
            </h2>
            <p className="text-orange-100 text-lg leading-relaxed">
              Manage parcels, track deliveries, and streamline operations with our comprehensive delivery management platform.
            </p>

            <div className="flex flex-wrap gap-3 pt-4">
              {[
                { icon: CheckCircle2, label: "Real-time Tracking" },
                { icon: Zap, label: "Fast Processing" },
                { icon: TruckIcon, label: "Reliable Fleet" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                  <f.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-12 left-16 right-16 grid grid-cols-3 gap-8">
            {[
              { value: "10K+", label: "Parcels Delivered" },
              { value: "10+", label: "Active Stations" },
              { value: "99%", label: "Success Rate" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold mb-1">{s.value}</p>
                <p className="text-orange-200 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 lg:min-h-screen flex flex-1 items-start sm:items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md min-w-0 mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg p-2 shrink-0">
              <img src="/logo-1.png" alt="M&M Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-neutral-800 leading-tight">Mealex & Mailex</h1>
              <p className="text-xs sm:text-sm text-gray-500">Parcel Delivery System</p>
            </div>
          </div>
          <Card className="border-0 shadow-xl bg-white rounded-2xl">
            <CardContent className="p-5 sm:p-8">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2">Welcome Back!</h2>
                <p className="text-sm sm:text-base text-gray-500">Sign in to access your dashboard</p>
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
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#ea690c] transition-colors pointer-events-none z-10" />
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

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Version 1.0.0 · Secure API Integration
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
