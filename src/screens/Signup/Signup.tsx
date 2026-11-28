import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    AlertCircle, ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff,
    Loader, Lock, Mail, MapPin, Phone, User,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";
import companyService from "../../services/companyService";
import { BrandMark } from "../../components/BrandMark";

const ORANGE = "#ea690c";
const BLUE = "#1e40af";

const inputCls =
    "h-11 rounded-xl border-[#dcdcdc] bg-white pl-10 text-sm shadow-none " +
    "focus-visible:ring-2 focus-visible:ring-[#ea690c]/20 focus-visible:border-[#ea690c]";

const labelCls = "mb-1.5 block text-[13px] font-medium text-neutral-700";

interface FieldProps extends React.ComponentProps<typeof Input> {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    error?: string;
    trailing?: React.ReactNode;
}

const Field = ({ icon: Icon, label, error, trailing, className, ...props }: FieldProps) => (
    <div>
        <Label className={labelCls}>{label}</Label>
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a8a8]" />
            <Input {...props} className={cn(inputCls, error && "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-100", className)} />
            {trailing}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
);

const PLANS = [
    { id: "starter", name: "Starter", detail: "1 branch · 5 users" },
    { id: "growth", name: "Growth", detail: "5 branches · unlimited users", popular: true },
    { id: "enterprise", name: "Enterprise", detail: "Unlimited · custom branding" },
];

/** Normalize a Ghana phone number to the +233XXXXXXXXX form the backend expects. */
const normalizePhoneForBackend = (input: string): string => {
    const trimmed = input.trim().replace(/\s|-/g, "");
    if (!trimmed) return trimmed;
    let digits = trimmed.startsWith("0") ? trimmed.slice(1) : trimmed;
    if (digits.startsWith("+")) digits = digits.slice(1);
    if (digits.startsWith("233")) return `+${digits}`;
    return `+233${digits}`;
};

export const Signup = (): JSX.Element => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [plan, setPlan] = useState("growth");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState("");
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    const [form, setForm] = useState({
        companyName: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        agree: false,
    });

    const setField = (key: keyof typeof form, value: string | boolean) => {
        setForm(f => ({ ...f, [key]: value }));
        setErrors(e => ({ ...e, [key]: "" }));
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};
        if (!form.companyName.trim()) next.companyName = "Company name is required.";
        if (!form.fullName.trim()) next.fullName = "Your name is required.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
        if (!/^(\+?\d{9,15})$/.test(form.phone.replace(/[\s-]/g, ""))) next.phone = "Enter a valid phone number.";
        if (!/^(?=.*[A-Za-z])(?=.*\d).{7,}$/.test(form.password)) {
            next.password = "Password must be at least 7 characters and include a letter and a number.";
        }
        if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
        if (!form.agree) next.agree = "You must accept the terms to continue.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        if (!validate()) return;
        setSubmitting(true);

        const result = await companyService.registerCompany({
            companyName: form.companyName.trim(),
            registerUserName: form.fullName.trim(),
            workEmail: form.email.trim().toLowerCase(),
            phoneNumber: normalizePhoneForBackend(form.phone),
            password: form.password,
            plan,
        });

        setSubmitting(false);
        if (result.success) {
            setDone(true);
            return;
        }
        // Put backend messages on the field they belong to.
        const keyMap: Record<string, string> = {
            companyName: "companyName", registerUserName: "fullName", workEmail: "email", phoneNumber: "phone", password: "password",
        };
        const fieldErrs: Record<string, string> = {};
        Object.entries(result.fieldErrors || {}).forEach(([k, v]) => { if (keyMap[k]) fieldErrs[keyMap[k]] = String(v); });
        if (result.status === 409) {
            const m = result.message.toLowerCase();
            if (m.includes("name")) fieldErrs.companyName = result.message;
            else if (m.includes("email")) fieldErrs.email = result.message;
            else if (m.includes("phone")) fieldErrs.phone = result.message;
        }
        if (Object.keys(fieldErrs).length) setErrors(e => ({ ...e, ...fieldErrs }));
        setSubmitError(Object.keys(fieldErrs).length ? "Please fix the highlighted fields." : result.message);
    };

    const handleResend = async () => {
        setResending(true);
        setResendMessage("");
        const result = await companyService.resendVerification(form.email.trim().toLowerCase());
        setResending(false);
        setResendMessage(result.message);
    };

    return (
        <div className="flex min-h-screen bg-white font-sans antialiased">

            {/* ── Left brand panel ── */}
            <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-orange-100 bg-gradient-to-b from-[#fff4ea] via-[#fbfaf8] to-[#fff7f0] p-10 text-neutral-900 lg:flex xl:p-14">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: "radial-gradient(rgba(20,20,20,0.06) 1px, transparent 1px)",
                        backgroundSize: "26px 26px",
                    }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full opacity-[0.14] blur-3xl"
                    style={{ background: `radial-gradient(circle, ${ORANGE}, transparent 70%)` }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full opacity-[0.12] blur-3xl"
                    style={{ background: `radial-gradient(circle, ${BLUE}, transparent 70%)` }}
                />

                <Link to="/" className="relative flex w-fit items-center">
                    <BrandMark />
                </Link>

                <div className="relative">
                    <h1 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                        Set up your delivery
                        <br />
                        operation in{" "}
                        <span className="bg-gradient-to-r from-[#ea690c] to-[#ff8c3a] bg-clip-text text-transparent">
                            minutes
                        </span>
                        .
                    </h1>
                    <ul className="mt-8 space-y-4">
                        {[
                            "Purpose-built hubs for front desk, dispatch and call center",
                            "Real-time rider tracking and automated reconciliation",
                            "Multi-branch, white-label — your brand on every screen",
                        ].map(item => (
                            <li key={item} className="flex items-start gap-3 text-sm text-neutral-600">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#ea690c]" />
                                {item}
                            </li>
                        ))}
                    </ul>

                    {/* mini route illustration */}
                    <div className="relative mt-10 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 300 120" preserveAspectRatio="none">
                            <path d="M10 100 Q80 30 160 70 T290 20" fill="none" stroke={ORANGE} strokeWidth="2" strokeDasharray="5 5" />
                            <circle cx="10" cy="100" r="4" fill={ORANGE} />
                            <circle cx="290" cy="20" r="4" fill={BLUE} />
                        </svg>
                        <div className="relative flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                                <MapPin className="h-5 w-5 text-[#ea690c]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-800">"What used to take 3 people and a spreadsheet now runs automatically."</p>
                                <p className="mt-1 text-xs text-neutral-400">— Operations Director, Regional Logistics Company</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="relative text-xs text-neutral-400">© 2026 Synergetics Hub · Every parcel. Every branch. One platform.</p>
            </div>

            {/* ── Right form panel ── */}
            <div className="relative flex w-full flex-col lg:w-[55%]">
                <div className="flex items-center justify-between px-6 py-5 sm:px-10">
                    <Link to="/" className="flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Link>
                    <Link to="/" className="flex items-center lg:hidden">
                        <BrandMark size="sm" />
                    </Link>
                    <p className="hidden text-sm text-neutral-500 sm:block">
                        Already have an account?{" "}
                        <Link to="/login" className="font-semibold text-[#ea690c] hover:underline">Log in</Link>
                    </p>
                </div>

                <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
                    {done ? (
                        /* ── Success state ── */
                        <div className="w-full max-w-md text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-neutral-900">
                                Almost there, {form.companyName || "your company"}!
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                                We've sent a verification link to{" "}
                                <span className="font-semibold text-neutral-700">{form.email}</span>. Click it to
                                activate your company and create your admin account — then you can sign in.
                            </p>
                            <button
                                onClick={() => navigate("/login")}
                                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#ea690c] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-colors hover:bg-[#ff7a1a]"
                            >
                                Continue to login <ArrowRight className="h-4 w-4" />
                            </button>
                            <div className="mt-5">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="text-sm font-medium text-neutral-500 hover:text-[#ea690c] disabled:opacity-60"
                                >
                                    {resending ? "Resending..." : "Didn't get the email? Resend verification"}
                                </button>
                                {resendMessage && (
                                    <p className="mt-2 text-xs text-neutral-500">{resendMessage}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
                            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                                Create your company account
                            </h2>
                            <p className="mt-2 text-sm text-neutral-500">
                                Start your free trial — no credit card required.
                            </p>

                            {submitError && (
                                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <span>{submitError}</span>
                                </div>
                            )}

                            {/* Plan selector */}
                            <div className="mt-7">
                                <Label className={labelCls}>Choose a plan</Label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {PLANS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPlan(p.id)}
                                            className={cn(
                                                "relative rounded-xl border px-3 py-2.5 text-left transition-all",
                                                plan === p.id
                                                    ? "border-[#ea690c] bg-orange-50/70 ring-2 ring-[#ea690c]/20"
                                                    : "border-neutral-200 hover:border-neutral-300"
                                            )}
                                        >
                                            {p.popular && (
                                                <span className="absolute -top-2 right-2 rounded-full bg-[#1e40af] px-2 py-0.5 text-[9px] font-bold text-white">
                                                    POPULAR
                                                </span>
                                            )}
                                            <p className="text-[13px] font-bold text-neutral-800">{p.name}</p>
                                            <p className="mt-0.5 text-[10px] leading-tight text-neutral-500">{p.detail}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                <Field
                                    icon={Building2}
                                    label="Company name"
                                    placeholder="e.g. M&M Logistics"
                                    value={form.companyName}
                                    onChange={e => setField("companyName", e.target.value)}
                                    error={errors.companyName}
                                />
                                <Field
                                    icon={User}
                                    label="Your full name"
                                    placeholder="e.g. Ama Mensah"
                                    value={form.fullName}
                                    onChange={e => setField("fullName", e.target.value)}
                                    error={errors.fullName}
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field
                                        icon={Mail}
                                        label="Work email"
                                        type="email"
                                        placeholder="you@company.com"
                                        value={form.email}
                                        onChange={e => setField("email", e.target.value)}
                                        error={errors.email}
                                    />
                                    <Field
                                        icon={Phone}
                                        label="Phone number"
                                        type="tel"
                                        placeholder="+233 24 000 0000"
                                        value={form.phone}
                                        onChange={e => setField("phone", e.target.value)}
                                        error={errors.phone}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field
                                        icon={Lock}
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="7+ chars, letter & number"
                                        value={form.password}
                                        onChange={e => setField("password", e.target.value)}
                                        error={errors.password}
                                        className="pr-10"
                                        trailing={
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(s => !s)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a8a8] hover:text-neutral-600"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        }
                                    />
                                    <Field
                                        icon={Lock}
                                        label="Confirm password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Repeat password"
                                        value={form.confirmPassword}
                                        onChange={e => setField("confirmPassword", e.target.value)}
                                        error={errors.confirmPassword}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-500">
                                        <input
                                            type="checkbox"
                                            checked={form.agree}
                                            onChange={e => setField("agree", e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[#ea690c]"
                                        />
                                        <span>
                                            I agree to the{" "}
                                            <a href="#" className="font-medium text-[#ea690c] hover:underline">Terms of Service</a>{" "}
                                            and{" "}
                                            <a href="#" className="font-medium text-[#ea690c] hover:underline">Privacy Policy</a>.
                                        </span>
                                    </label>
                                    {errors.agree && <p className="mt-1.5 text-xs text-red-500">{errors.agree}</p>}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea690c] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-[#ff7a1a] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting
                                    ? <><Loader className="h-4 w-4 animate-spin" /> Creating your account...</>
                                    : <>Create account <ArrowRight className="h-4 w-4" /></>}
                            </button>

                            <p className="mt-4 text-center text-sm text-neutral-500 sm:hidden">
                                Already have an account?{" "}
                                <Link to="/login" className="font-semibold text-[#ea690c] hover:underline">Log in</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
