import { useEffect, useRef, useState } from "react";
import { useToast } from "../../components/ui/toast";
import { fetchOfficeNameMap, openCustomerLink, searchParcelsByPhone, sendCustomerOtp, toApiPhone, verifyCustomerOtp } from "../../services/customerService";
import { validatePhoneNumber } from "../../utils/dataHelpers";
import { DeliveryRequestModal } from "./components/DeliveryRequestModal";
import { CustomerReceiveLanding } from "./components/CustomerReceiveLanding";
import { OtpVerifyStep } from "./components/OtpVerifyStep";
import { ParcelDetailView, type ParcelActionSuccess } from "./components/ParcelDetailView";
import { ParcelListStep } from "./components/ParcelListStep";
import { ReceiveFooter } from "./components/ReceiveFooter";
import { TrackHeader } from "./components/TrackHeader";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import {
  EnrichedParcel,
  TrackStep,
  DeliverySuccessInfo,
  DeliverySchedule,
  enrichParcel,
  formatDeliverySchedule,
  isParcelDeliverable,
  maskPhone,
} from "./trackParcelUtils";

const HEADER_SUBTITLES: Record<TrackStep, string> = {
  search: "",
  otp: "Verify your phone",
  list: "Your parcels",
  detail: "Parcel details",
};

/**
 * Public customer portal (/receive): track parcels by phone, open the SMS link, book delivery.
 * ParcelFlow-branded: it serves every company (tenant) and station; each parcel shows its own company.
 */
export const CustomerParcelHub = (): JSX.Element => {
  const { showToast } = useToast();

  const [step, setStep] = useState<TrackStep>("search");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [parcels, setParcels] = useState<EnrichedParcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<EnrichedParcel | null>(null);
  const [deliveryParcels, setDeliveryParcels] = useState<EnrichedParcel[] | null>(null);
  const [pendingDeliveryParcels, setPendingDeliveryParcels] = useState<EnrichedParcel[] | null>(null);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [actionSuccess, setActionSuccess] = useState<ParcelActionSuccess>(null);
  const [deliverySuccess, setDeliverySuccess] = useState<DeliverySuccessInfo>(null);
  const [officeNames, setOfficeNames] = useState<Record<string, string>>({});

  const [searchLoading, setSearchLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState("");
  // Proof the customer holds the phone: from the SMS link (?t=...) or a verified one-time code.
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [otpReturnStep, setOtpReturnStep] = useState<TrackStep>("list");
  const [searchPending, setSearchPending] = useState(false);

  // Opened from the landing page with a number: /receive?phone=0241234567 searches straight away.
  const autoPhone = useRef<string | null>(new URLSearchParams(window.location.search).get("phone"));
  useEffect(() => {
    const ph = autoPhone.current;
    if (!ph || new URLSearchParams(window.location.search).get("t")) return;
    autoPhone.current = null;
    const normalized = toApiPhone(ph);
    if (validatePhoneNumber(normalized)) {
      setPhone(normalized);
      setSearchPending(true);
    }
  }, []);
  useEffect(() => {
    if (searchPending && phone) { setSearchPending(false); void handleSearch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPending, phone]);

  // Opened from the SMS: /receive?t=<token>[&parcel=<parcelId>]
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t");
    if (!token) return;
    const wanted = params.get("parcel");
    setLinkLoading(true);
    openCustomerLink(token).then((r) => {
      setLinkLoading(false);
      if (!r.success) {
        setError(r.message);
        return;
      }
      const list = r.data.parcels.map((p) => enrichParcel(p));
      setLinkToken(token);
      setPhone(r.data.phoneNumber);
      setParcels(list);
      const one = list.find((p) => p.parcelId === wanted) ?? (list.length === 1 ? list[0] : null);
      if (one) {
        setSelectedParcel(one);
        setStep("detail");
      } else {
        setStep("list");
      }
    });
  }, []);

  useEffect(() => {
    fetchOfficeNameMap().then(setOfficeNames);
    import("virtual:pwa-register").then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }, []);

  useEffect(() => {
    if (!Object.keys(officeNames).length) return;
    setParcels(prev => (prev.length ? prev.map(p => enrichParcel(p, officeNames)) : prev));
    setSelectedParcel(prev => (prev ? enrichParcel(prev, officeNames) : null));
  }, [officeNames]);

  // Each step starts at the top of the screen.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const resetAll = () => {
    setStep("search");
    setPhone("");
    setOtp("");
    setParcels([]);
    setSelectedParcel(null);
    setDeliveryParcels(null);
    setPendingDeliveryParcels(null);
    setSelectedDeliveryIds(new Set());
    setActionSuccess(null);
    setDeliverySuccess(null);
    setError("");
  };

  const toggleDeliverySelect = (parcelId: string) => {
    setSelectedDeliveryIds(prev => {
      const next = new Set(prev);
      if (next.has(parcelId)) next.delete(parcelId);
      else next.add(parcelId);
      return next;
    });
  };

  const selectAllDeliverable = () => {
    setSelectedDeliveryIds(new Set(parcels.filter(isParcelDeliverable).map(p => p.parcelId)));
  };

  const handleSearch = async () => {
    setError("");
    if (!validatePhoneNumber(phone)) {
      setError("Enter a valid Ghana phone number.");
      return;
    }

    setSearchLoading(true);
    try {
      const result = await searchParcelsByPhone(phone);
      if (!result.success || !result.data) {
        setError(result.message || "Search failed. Please try again.");
        return;
      }

      if (result.data.length === 0) {
        setError("No parcels found for this phone number.");
        return;
      }

      setParcels(result.data.map(p => enrichParcel(p, officeNames)));
      setStep("list");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearchLoading(false);
      setOtpSending(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtpSending(true);
    const result = await sendCustomerOtp(toApiPhone(phone));
    setOtpSending(false);
    if (result.success) showToast("New code sent.", "success");
    else setError(result.message);
  };

  const handleVerifyOtp = async () => {
    setError("");
    setOtpLoading(true);
    try {
      const result = await verifyCustomerOtp(toApiPhone(phone), otp);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setLinkToken(result.data.token);
      setStep(otpReturnStep);
      if (pendingDeliveryParcels?.length) {
        setDeliveryParcels(pendingDeliveryParcels);
        setPendingDeliveryParcels(null);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  /** The modal has taken payment and the backend accepted the request. */
  const handleDeliverySubmit = (info: { requestId: string; paystackReference: string; schedule: DeliverySchedule | null }) => {
    const ids = new Set((deliveryParcels ?? []).map(p => p.parcelId));
    const count = ids.size;
    setDeliveryParcels(null);
    setSelectedDeliveryIds(new Set());
    setDeliverySuccess({
      parcelCount: count,
      paystackReference: info.paystackReference,
      scheduled: info.schedule != null,
      scheduledAt: info.schedule ? formatDeliverySchedule(info.schedule) : undefined,
    });
    // Show the booking straight away; the next search reads it from the server.
    const booked = (p: EnrichedParcel) => (ids.has(p.parcelId) ? enrichParcel({ ...p, homeDelivery: true }, officeNames) : p);
    setParcels(prev => prev.map(booked));
    setSelectedParcel(prev => (prev ? booked(prev) : prev));
    if (step === "detail") setActionSuccess("delivery");
    showToast(`Delivery booked for ${count} parcel${count !== 1 ? "s" : ""}.`, "success");
  };

  const openDeliveryModal = async (items: EnrichedParcel[]) => {
    if (items.length === 0) return;
    if (linkToken) {
      setDeliveryParcels(items);
      return;
    }
    // Not opened from the SMS link: prove the phone first with a one-time code.
    setError("");
    setOtp("");
    setOtpSending(true);
    const sent = await sendCustomerOtp(toApiPhone(phone));
    setOtpSending(false);
    if (!sent.success) {
      showToast(sent.message, "error");
      return;
    }
    setPendingDeliveryParcels(items);
    setOtpReturnStep(step);
    setStep("otp");
    showToast(`Code sent to ${maskPhone(phone)}.`, "success");
  };

  const handleBack = () => {
    if (step === "detail") {
      setSelectedParcel(null);
      setActionSuccess(null);
      setDeliverySuccess(null);
      setStep("list");
      return;
    }
    if (step === "otp") {
      setPendingDeliveryParcels(null);
      setStep(otpReturnStep);
      return;
    }
    if (step === "list") {
      resetAll();
    }
  };

  const backLabel = step === "detail" ? "← All parcels" : "Back";

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/80 via-slate-50 to-slate-100 flex flex-col">
      <TrackHeader
        onBack={step !== "search" ? handleBack : undefined}
        backLabel={backLabel}
        subtitle={HEADER_SUBTITLES[step]}
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-3 py-5 sm:px-4 sm:py-6">
        <PwaInstallBanner />

        {linkLoading && (
          <p className="py-10 text-center text-sm text-slate-500">Opening your parcels…</p>
        )}

        {step === "search" && !linkLoading && (
          <CustomerReceiveLanding
            phone={phone}
            loading={searchLoading}
            error={error}
            onPhoneChange={value => {
              setPhone(value);
              setError("");
            }}
            onSubmit={handleSearch}
          />
        )}

        {step === "otp" && (
          <OtpVerifyStep
            phone={phone}
            parcelCount={parcels.length}
            loading={otpLoading}
            sending={otpSending}
            error={error}
            otp={otp}
            onOtpChange={value => {
              setOtp(value);
              setError("");
            }}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        )}

        {step === "list" && (
          <>
            {deliverySuccess && (
              <div className="mb-4 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                <p className="font-semibold text-blue-900">
                  {deliverySuccess.scheduled ? "Scheduled delivery booked & paid" : "Delivery requested & paid"}
                </p>
                <p className="mt-1">
                  {deliverySuccess.parcelCount} parcel{deliverySuccess.parcelCount !== 1 ? "s" : ""} will be delivered
                  together.
                  {deliverySuccess.scheduled && deliverySuccess.scheduledAt && (
                    <> Preferred: <span className="font-medium">{deliverySuccess.scheduledAt}</span></>
                  )}
                  {deliverySuccess.paystackReference && (
                    <> · Ref: <span className="font-mono text-xs">{deliverySuccess.paystackReference}</span></>
                  )}
                </p>
              </div>
            )}
            <ParcelListStep
              phone={maskPhone(phone)}
              parcels={parcels}
              selectedIds={selectedDeliveryIds}
              onToggleSelect={toggleDeliverySelect}
              onSelectAllDeliverable={selectAllDeliverable}
              onClearSelection={() => setSelectedDeliveryIds(new Set())}
              onSelect={parcel => {
                setSelectedParcel(parcel);
                setActionSuccess(null);
                setDeliverySuccess(null);
                setStep("detail");
              }}
              onRequestDelivery={openDeliveryModal}
              onNewSearch={resetAll}
            />
            <ReceiveFooter />
          </>
        )}

        {step === "detail" && selectedParcel && (
          <ParcelDetailView
            parcel={selectedParcel}
            actionSuccess={actionSuccess}
            deliverySuccess={deliverySuccess}
            onRequestDelivery={() => openDeliveryModal([selectedParcel])}
          />
        )}
      </main>


      {deliveryParcels && deliveryParcels.length > 0 && (
        <DeliveryRequestModal
          parcels={deliveryParcels}
          customerPhone={toApiPhone(phone)}
          token={linkToken ?? undefined}
          onClose={() => setDeliveryParcels(null)}
          onSubmit={handleDeliverySubmit}
        />
      )}
    </div>
  );
};
