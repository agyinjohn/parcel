import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "../../config/api";
import { BrandMark } from "../../components/BrandMark";

const inputCls = "h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-[#ea690c] focus:ring-2 focus:ring-orange-100";
// The API takes a number: a typical weekly count for each range.
const VOLUMES: [number, string][] = [[5, "Fewer than 10"], [30, "10–50"], [100, "50–200"], [250, "More than 200"]];

/**
 * Public "become a partner" request. Partner accounts are created by an admin (User Management →
 * role Vendor); this sends the request to them. Proposed endpoint: POST /api-vendor/applications.
 */
export const PartnerApply = (): JSX.Element => {
    const [f, setF] = useState({ businessName: "", contactName: "", phoneNumber: "", email: "", area: "", parcelsPerWeek: "", message: "" });
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
    const digits = f.phoneNumber.replace(/\D/g, "");
    const phoneOk = digits.length >= 9 && digits.length <= 12;
    const emailOk = !f.email.trim() || /^\S+@\S+\.\S+$/.test(f.email.trim());
    const ok = f.businessName.trim() && f.contactName.trim() && phoneOk && emailOk && f.area.trim();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ok || sending) return;
        setSending(true);
        setError("");
        const local = digits.replace(/^233/, "").replace(/^0/, "");
        try {
            await axios.post(`${API_ENDPOINTS.VENDOR}/applications`, {
                ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || undefined])),
                phoneNumber: `+233${local}`,
                parcelsPerWeek: f.parcelsPerWeek ? Number(f.parcelsPerWeek) : undefined,
            }, { headers: { "Content-Type": "application/json" }, timeout: 15000 });
            setDone(true);
        } catch (err: any) {
            const status = err?.response?.status;
            setError(status === 404 || status === 405
                ? "Online partner requests aren't open yet. Please call or visit your nearest station and ask for a partner account."
                : err?.response?.data?.message || "We couldn't send your request. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff4ea] via-[#fbfaf8] to-white px-4 py-8">
            <div className="mx-auto max-w-xl">
                <div className="mb-6 flex items-center justify-between">
                    <Link to="/"><BrandMark /></Link>
                    <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" />Home</Link>
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                    {done ? (
                        <div className="py-6 text-center">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                            <h1 className="mt-4 text-xl font-bold">Thanks, we've got your request</h1>
                            <p className="mt-2 text-sm text-neutral-500">Our team will call you on {f.phoneNumber} to set up your partner account. You'll then sign in with that phone number.</p>
                            <Link to="/" className="mt-6 inline-block rounded-xl bg-[#ea690c] px-5 py-2.5 text-sm font-semibold text-white">Back to home</Link>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ea690c] text-white"><Handshake className="h-5 w-5" /></div>
                                <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Become a partner</h1>
                                <p className="mt-1 text-sm text-neutral-500">For online shops and businesses that send parcels to customers. Tell us about you and we'll set up your partner account.</p>
                            </div>
                            <label className="block text-sm font-medium text-neutral-700">Business name *<input value={f.businessName} onChange={set("businessName")} className={`mt-1 ${inputCls}`} placeholder="e.g. Glow Beauty Shop" /></label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-neutral-700">Your name *<input value={f.contactName} onChange={set("contactName")} className={`mt-1 ${inputCls}`} /></label>
                                <label className="block text-sm font-medium text-neutral-700">Phone *<input value={f.phoneNumber} onChange={set("phoneNumber")} inputMode="tel" className={`mt-1 ${inputCls}`} placeholder="024 123 4567" /></label>
                            </div>
                            <label className="block text-sm font-medium text-neutral-700">Email<input value={f.email} onChange={set("email")} type="email" className={`mt-1 ${inputCls}`} placeholder="Optional" /></label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-neutral-700">Area or nearest station *<input value={f.area} onChange={set("area")} className={`mt-1 ${inputCls}`} placeholder="e.g. East Legon" /></label>
                                <label className="block text-sm font-medium text-neutral-700">Parcels per week
                                    <select value={f.parcelsPerWeek} onChange={set("parcelsPerWeek")} className={`mt-1 ${inputCls}`}>
                                        <option value="">Choose</option>
                                        {VOLUMES.map(([n, l]) => <option key={n} value={n}>{l}</option>)}
                                    </select>
                                </label>
                            </div>
                            <label className="block text-sm font-medium text-neutral-700">Anything else?<textarea value={f.message} onChange={set("message")} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#ea690c] focus:ring-2 focus:ring-orange-100" /></label>
                            {!phoneOk && f.phoneNumber && <p className="text-xs text-red-600">Enter a valid phone number.</p>}
                            {!emailOk && <p className="text-xs text-red-600">Enter a valid email, or leave it empty.</p>}
                            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                            <button type="submit" disabled={!ok || sending} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ea690c] text-sm font-semibold text-white disabled:opacity-50">
                                {sending && <Loader2 className="h-4 w-4 animate-spin" />}Send request
                            </button>
                            <p className="text-center text-xs text-neutral-500">Already a partner? <Link to="/login" className="font-semibold text-[#ea690c] hover:underline">Sign in</Link></p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
