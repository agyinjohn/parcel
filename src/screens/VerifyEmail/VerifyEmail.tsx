import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    AlertCircle, ArrowRight, CheckCircle2, Loader, Package, XCircle,
} from "lucide-react";
import companyService from "../../services/companyService";

type Status = "verifying" | "success" | "error";

export const VerifyEmail = (): JSX.Element => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [status, setStatus] = useState<Status>("verifying");
    const [message, setMessage] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [companyName, setCompanyName] = useState("");

    const [resendEmail, setResendEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");

    // A verification token works once; don't send it twice (React StrictMode runs effects twice in dev).
    const sentFor = useRef<string | null>(null);

    useEffect(() => {
        if (sentFor.current === token) return;
        sentFor.current = token;
        if (!token) {
            setStatus("error");
            setMessage("This verification link is missing its token. Please use the link from your email.");
            return;
        }

        const verify = async () => {
            const result = await companyService.verifyEmail(token);
            if (result.success) {
                setStatus("success");
                setMessage(result.message);
                setAdminEmail(result.data?.adminEmail || "");
                setCompanyName(result.data?.displayName || result.data?.companyName || "");
            } else {
                setStatus("error");
                setMessage(result.message);
            }
        };

        verify();
    }, [token]);

    const handleResend = async () => {
        if (!resendEmail.trim()) return;
        setResending(true);
        setResendMessage("");
        const result = await companyService.resendVerification(resendEmail.trim().toLowerCase());
        setResending(false);
        setResendMessage(result.message);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fff4ea] via-[#fbfaf8] to-[#fff7f0] px-6 py-12">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
                <Link to="/" className="mb-6 inline-flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ea690c] to-[#c2470a] shadow-lg shadow-orange-200">
                        <Package className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-neutral-900">ParcelFlow</span>
                </Link>

                {status === "verifying" && (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                            <Loader className="h-8 w-8 animate-spin text-[#ea690c]" />
                        </div>
                        <h2 className="mt-6 text-xl font-extrabold tracking-tight text-neutral-900">
                            Verifying your email...
                        </h2>
                        <p className="mt-3 text-sm text-neutral-500">
                            Hang tight, this only takes a moment.
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-neutral-900">
                            {companyName ? `${companyName} is verified!` : "Email verified!"}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                            {adminEmail
                                ? <>Your admin account (<span className="font-semibold text-neutral-700">{adminEmail}</span>) is ready. Sign in to start setting up your branches.</>
                                : message}
                        </p>
                        <Link
                            to="/login"
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#ea690c] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-colors hover:bg-[#ff7a1a]"
                        >
                            Continue to login <ArrowRight className="h-4 w-4" />
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="mt-6 text-xl font-extrabold tracking-tight text-neutral-900">
                            Verification failed
                        </h2>
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-left text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{message}</span>
                        </p>

                        <div className="mt-6 border-t border-neutral-100 pt-6">
                            <p className="text-sm font-medium text-neutral-700">Request a new verification link</p>
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="email"
                                    placeholder="you@company.com"
                                    value={resendEmail}
                                    onChange={e => setResendEmail(e.target.value)}
                                    className="h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-sm focus:border-[#ea690c] focus:outline-none focus:ring-2 focus:ring-[#ea690c]/20"
                                />
                                <button
                                    onClick={handleResend}
                                    disabled={resending || !resendEmail.trim()}
                                    className="rounded-lg bg-[#ea690c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#ff7a1a] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {resending ? "Sending..." : "Resend"}
                                </button>
                            </div>
                            {resendMessage && (
                                <p className="mt-2 text-xs text-neutral-500">{resendMessage}</p>
                            )}
                        </div>

                        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-[#ea690c] hover:underline">
                            Back to login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};
