/**
 * Sample-data answers for the customer pages (/receive): phone search, the SMS link, one-time
 * codes, delivery quotes and delivery requests. Mirrors docs/BACKEND_TODO.md "Customer pages".
 * Demo: open /receive?t=demo-link, or search 024 123 4567 (code 123456).
 */
type Handler = (ctx: { params: URLSearchParams; body: any; match: RegExpMatchArray }) => unknown;
type On = (method: string, pattern: RegExp, handler: Handler) => void;

interface Ctx {
    parcels: any[];
    offices: any[];
    serialize: (p: any) => Record<string, unknown>;
    /** The station's delivery price for one parcel to this point (distance-based pricing). */
    quote: (officeId: string, lat: number, lng: number, weightKg?: number) => number;
}

export const DEMO_CUSTOMER_PHONE = "+233241234567";
const DEMO_TOKEN = "demo-link";
const DEMO_CODE = "123456";

export const registerCustomer = (on: On, { parcels, offices, serialize, quote }: Ctx) => {
    const officeOf = (id?: string) => offices.find((o) => o.id === id) ?? offices[0];
    const digits = (s?: string) => (s ?? "").replace(/\D/g, "").slice(-9);

    // Give the demo customer four parcels in different states.
    const pick = (test: (p: any) => boolean, used: Set<string>) => {
        const p = parcels.find((x) => test(x) && !used.has(x.parcelId));
        if (p) used.add(p.parcelId);
        return p;
    };
    const used = new Set<string>();
    const demo = [
        pick((p) => !!p.shelfName && !p.delivered && !p.pickedUp && !p.parcelAssigned && !p.homeDelivery, used),
        pick((p) => !p.delivered && !p.pickedUp && !!p.parcelAssigned && !!p.riderInfo, used),
        pick((p) => !!p.delivered, used),
        pick((p) => !p.delivered && !p.pickedUp && !p.parcelAssigned && !p.homeDelivery, used),
    ].filter(Boolean);
    demo.forEach((p) => { p.recieverPhoneNumber = DEMO_CUSTOMER_PHONE; p.receiverName = "Akosua Boateng"; });
    // One of them is from another company and station.
    if (demo[1] && offices[2]) demo[1].officeId = offices[2].id;
    // The last one hasn't reached the station yet.
    const transit = demo[3];
    if (transit) { transit.shelfName = undefined; transit.shelfId = undefined; transit.hasArrivedAtOffice = false; }

    /** The customer view: the parcel plus its station's public details, without staff-only fields. */
    const view = (p: any) => {
        const o = officeOf(p.officeId);
        const { callerName, callerPhoneNumber, callCenterRemark, callOutCome, driverPhoneNumber, companyId, notes, ...rest } = serialize(p) as any;
        void callerName; void callerPhoneNumber; void callCenterRemark; void callOutCome; void driverPhoneNumber; void companyId; void notes;
        // The portal serves every company: sample parcels come from two of them.
        const companyName = o.id === offices[1]?.id || o.id === offices[2]?.id ? "Swift Couriers" : "M&M Delivery";
        return {
            ...rest,
            companyName,
            officeName: o.name,
            office: { id: o.id, name: o.name, address: o.address, phoneNumber: o.phoneNumber, latitude: o.latitude, longitude: o.longitude, openingHours: "Mon–Sat, 8am–6pm" },
        };
    };
    const forPhone = (phone: string) => parcels.filter((p) => digits(p.recieverPhoneNumber) === digits(phone) && !p.returned);

    const tokens = new Map<string, string>([[DEMO_TOKEN, DEMO_CUSTOMER_PHONE]]);
    const phoneFor = (token?: string) => (token ? tokens.get(token) : undefined);

    on("get", /^\/api-user\/parcel-search$/, ({ params }) => forPhone(params.get("phoneNumber") ?? "").map(view));

    on("get", /^\/api-user\/customer-links\/([^/]+)$/, ({ match }) => {
        const phone = phoneFor(decodeURIComponent(match[1]));
        if (!phone) throw { status: 404, message: "This link has expired. Search with your phone number instead." };
        return { phoneNumber: phone, receiverName: "Akosua Boateng", parcels: forPhone(phone).map(view) };
    });

    on("post", /^\/api-user\/customer-otp\/send$/, ({ body }) => {
        if (!forPhone(body?.phoneNumber).length) throw { status: 404, message: "No parcels for this phone number." };
        return { message: `Code sent (demo code ${DEMO_CODE})` };
    });
    on("post", /^\/api-user\/customer-otp\/verify$/, ({ body }) => {
        if (String(body?.code) !== DEMO_CODE) throw { status: 400, message: "That code is wrong or has expired." };
        const token = `otp-${Date.now()}`;
        tokens.set(token, body.phoneNumber);
        return { token };
    });

    const checkRequest = (body: any) => {
        const phone = phoneFor(body?.token);
        if (!phone || digits(phone) !== digits(body?.phoneNumber)) throw { status: 401, message: "Please verify your phone again." };
        const ps = (body?.parcelIds ?? []).map((id: string) => parcels.find((p) => p.parcelId === id));
        if (!ps.length || ps.some((p: any) => !p || digits(p.recieverPhoneNumber) !== digits(phone))) throw { status: 403, message: "Those parcels aren't yours." };
        if (ps.some((p: any) => p.delivered || p.pickedUp || p.parcelAssigned || p.homeDelivery)) throw { status: 409, message: "Delivery is already booked or done for one of these parcels." };
        return ps;
    };
    const charges = (p: any) =>
        (p.inboudPayed ? 0 : p.inboundCost || 0) + (p.storageCost || 0) + (p.pickUpCost || 0) + (p.pod ? p.itemCost || 0 : 0);

    on("post", /^\/api-user\/delivery-requests\/quote$/, ({ body }) => {
        const ps = checkRequest(body);
        // One trip: the farthest/heaviest parcel's price, plus GHC 5 for each extra parcel.
        const prices = ps.map((p: any) => { try { return quote(p.officeId, body.latitude, body.longitude, p.parcelWeight); } catch { return 15; } });
        const deliveryFee = Math.max(...prices) + 5 * (ps.length - 1);
        const parcelCharges = Math.round(ps.reduce((s: number, p: any) => s + charges(p), 0) * 100) / 100;
        return { deliveryFee, parcelCharges, total: deliveryFee + parcelCharges, quoteId: `q-${Date.now()}` };
    });
    on("post", /^\/api-user\/delivery-requests$/, ({ body }) => {
        const ps = checkRequest(body);
        if (!body?.paystackReference) throw { status: 400, message: "Payment reference missing." };
        ps.forEach((p: any) => {
            p.homeDelivery = true;
            p.receiverLatitude = body.latitude;
            p.receiverLongitude = body.longitude;
            p.receiverLocationName = body.address || "Pinned by customer";
            p.specialInstructions = body.notes;
        });
        return { requestId: `dr-${Date.now()}`, status: "PENDING", message: "Delivery request received" };
    });
};
