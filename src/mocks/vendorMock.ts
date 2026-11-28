/**
 * Sample-data answers for the partner (vendor) portal, mirroring backend-test's /api-vendor endpoints:
 * submit a parcel, list parcels, the status dashboard and earnings. There is no edit endpoint on the
 * backend yet, so none here either. Demo login: 0200000007.
 */
type Handler = (ctx: { params: URLSearchParams; body: any; match: RegExpMatchArray; config?: any }) => unknown;
type On = (method: string, pattern: RegExp, handler: Handler) => void;

interface Ctx {
    parcels: any[];
    offices: any[];
    page: <T>(items: T[], params: URLSearchParams) => unknown;
    serialize: (p: any) => Record<string, unknown>;
}

export const DEMO_VENDOR = { id: "vendor-1", name: "Glow Beauty Shop", phone: "+233200000007" };
const STATUSES = ["PENDING", "RECEIVED", "DELIVERD", "COLLECTED", "FAILED", "REVERSED"];
const DAY = 864e5;

export const registerVendor = (on: On, { parcels, offices, page, serialize }: Ctx) => {
    const officeOf = (id?: string) => offices.find((o) => o.id === id);
    let seq = 0;
    const make = (f: Record<string, any>, ageDays: number) => {
        const createdAt = Date.now() - ageDays * DAY;
        const o = officeOf(f.toOfficeId) ?? offices[0];
        const p = {
            parcelId: `PV${String(510000 + ++seq).padStart(6, "0")}`,
            typeofParcel: "ONLINE",
            vendorId: DEMO_VENDOR.id,
            vendorName: DEMO_VENDOR.name,
            senderName: DEMO_VENDOR.name,
            senderPhoneNumber: DEMO_VENDOR.phone,
            officeId: o.id,
            toOfficeId: o.id,
            to: { id: o.id, name: o.name, code: o.code, address: o.address },
            delivered: false,
            pickedUp: false,
            vendorPayed: false,
            createdAt,
            updatedAt: createdAt,
            ...f,
        };
        parcels.push(p);
        return p;
    };
    // Seed a spread of states across stations.
    const seed: [string, string, number, number, boolean, number][] = [
        ["Adwoa Mensah", "PENDING", 0, 0, false, 0],
        ["Yaw Boateng", "PENDING", 120, 15, true, 1],
        ["Efua Asante", "RECEIVED", 250, 20, true, 2],
        ["Kojo Owusu", "RECEIVED", 0, 0, false, 2],
        ["Ama Darko", "DELIVERD", 180, 15, true, 4],
        ["Kwesi Appiah", "COLLECTED", 95, 0, true, 5],
        ["Akua Sarpong", "FAILED", 300, 20, true, 6],
        ["Nii Lamptey", "DELIVERD", 60, 10, true, 8],
    ];
    seed.forEach(([name, status, item, fee, pod, age], i) =>
        make({
            receiverName: name, recieverPhoneNumber: `+23324${String(1000000 + i * 7919).slice(-7)}`, parcelDescription: ["Hair cream", "Wig", "Perfume set", "Body lotion"][i % 4],
            parcelStatus: status, itemCost: item, vendorDeliveryFee: fee, deliveryCost: fee, pod, parcelWeight: 1 + (i % 3),
            toOfficeId: offices[i % Math.min(3, offices.length)].id,
            delivered: status === "DELIVERD", pickedUp: status === "COLLECTED", hasArrivedAtOffice: status !== "PENDING",
        }, age),
    );

    const mine = () => parcels.filter((p) => p.vendorId === DEMO_VENDOR.id);
    const view = (p: any) => ({ ...serialize(p), parcelStatus: p.parcelStatus, toOfficeId: p.toOfficeId, to: p.to, vendorDeliveryFee: p.vendorDeliveryFee });

    const check = (body: any, n = "") => {
        if (!body?.receiverName || !body?.recieverPhoneNumber || !body?.destinationStationId)
            throw { status: 400, message: `${n}receiverName, recieverPhoneNumber and destinationStationId are required` };
        if (!officeOf(body.destinationStationId)) throw { status: 404, message: `${n}Destination station not found` };
        if (body.pod && !(Number(body.itemCost) > 0 || Number(body.deliveryFee) > 0)) throw { status: 400, message: `${n}POD parcels need an item cost or delivery fee` };
    };
    // Idempotency-Key → the first result, so a retried request doesn't create parcels twice.
    const seen = new Map<string, unknown>();
    const keyOf = (config?: any) => config?.headers?.["Idempotency-Key"] ?? config?.headers?.get?.("Idempotency-Key");

    on("post", /^\/api-vendor\/parcels\/batch$/, ({ body, config }) => {
        const key = keyOf(config);
        if (key && seen.has(key)) return seen.get(key);
        const list: any[] = body?.parcels ?? [];
        if (!list.length) throw { status: 400, message: "No parcels in the batch" };
        list.forEach((b, i) => check(b, `Parcel ${i + 1} (${b?.receiverName || "no name"}): `)); // all or nothing
        const created = list.map((b) => view(create(b)));
        if (key) seen.set(key, created);
        return created;
    });

    const create = (body: any) =>
        make({
            receiverName: body.receiverName, recieverPhoneNumber: body.recieverPhoneNumber, alternativePhoneNumber: body.recieverAlternativePhoneNumber,
            receiverAddress: body.receiverAddress, parcelDescription: body.parcelDescription, parcelWeight: body.parcelWeight, numberOfItems: body.numberOfItems,
            itemCost: Number(body.itemCost) || 0, vendorDeliveryFee: Number(body.deliveryFee) || 0, deliveryCost: Number(body.deliveryFee) || 0,
            pod: !!body.pod, parcelStatus: "PENDING", toOfficeId: body.destinationStationId, hasArrivedAtOffice: false,
        }, 0);

    on("post", /^\/api-vendor\/parcels$/, ({ body, config }) => {
        const key = keyOf(config);
        if (key && seen.has(key)) return seen.get(key);
        check(body);
        const out = view(create(body));
        if (key) seen.set(key, out);
        return out;
    });

    // backend-test has no edit endpoint: answer like Spring does for an unknown path.
    on("put", /^\/api-vendor\/parcels\/[^/]+$/, () => { throw { status: 404, message: "No static resource api-vendor/parcels." }; });

    // Public "become a partner" request (proposed).
    const applications: any[] = [];
    on("post", /^\/api-vendor\/applications$/, ({ body }) => {
        if (!body?.businessName || !body?.contactName || !body?.phoneNumber || !body?.area) throw { status: 400, message: "Business name, your name, phone and area are required" };
        const a = { id: `pa-${applications.length + 1}`, ...body, status: "NEW", createdAt: Date.now() };
        applications.push(a);
        return a;
    });

    on("get", /^\/api-vendor\/parcels$/, ({ params }) => {
        const q = params.get("search")?.toLowerCase();
        const status = params.get("status");
        const to = params.get("toOfficeId");
        const list = mine()
            .filter((p) => (!status || p.parcelStatus === status) && (!to || p.toOfficeId === to))
            .filter((p) => !q || [p.parcelId, p.receiverName, p.recieverPhoneNumber].some((v) => String(v ?? "").toLowerCase().includes(q)))
            .sort((a, b) => b.createdAt - a.createdAt);
        return page(list.map(view), params);
    });

    on("get", /^\/api-vendor\/parcel-status-dashboard$/, ({ params }) => {
        const status = params.get("status");
        const q = params.get("search")?.toLowerCase();
        const list = mine().filter((p) => (!status || p.parcelStatus === status) && (!q || [p.parcelId, p.receiverName].some((v) => String(v ?? "").toLowerCase().includes(q))));
        const statusSummary = Object.fromEntries(STATUSES.map((s) => [s, mine().filter((p) => p.parcelStatus === s).length]));
        const byStation = new Map<string, any[]>();
        list.forEach((p) => byStation.set(p.toOfficeId, [...(byStation.get(p.toOfficeId) ?? []), p]));
        return {
            statusSummary,
            totalParcels: list.length,
            totalStations: byStation.size,
            stations: [...byStation.entries()].map(([id, ps]) => ({
                officeId: id, officeName: officeOf(id)?.name ?? id, parcelCount: ps.length, podCount: ps.filter((p) => p.pod).length,
                totalAmount: ps.reduce((s, p) => s + (p.itemCost || 0) + (p.vendorDeliveryFee || 0), 0),
                parcels: ps.map((p) => ({ parcelId: p.parcelId, receiverName: p.receiverName, recieverPhoneNumber: p.recieverPhoneNumber, parcelDescription: p.parcelDescription, deliveryFee: p.vendorDeliveryFee, itemCost: p.itemCost, parcelStatus: p.parcelStatus, createdAt: p.createdAt, pod: p.pod })),
            })),
        };
    });

    on("get", /^\/api-vendor\/earnings$/, () => {
        const ps = mine();
        const amount = (p: any) => (p.pod ? (p.itemCost || 0) + (p.vendorDeliveryFee || 0) : 0);
        const done = ps.filter((p) => p.parcelStatus === "DELIVERD" || p.parcelStatus === "COLLECTED");
        const open = ps.filter((p) => ["PENDING", "RECEIVED"].includes(p.parcelStatus));
        const ids = [...new Set(ps.map((p) => p.toOfficeId))];
        return {
            totalEarnable: ps.reduce((s, p) => s + amount(p), 0),
            amountReady: done.filter((p) => !p.vendorPayed).reduce((s, p) => s + amount(p), 0),
            pendingPayout: open.reduce((s, p) => s + amount(p), 0),
            failedDeliveriesCount: ps.filter((p) => p.parcelStatus === "FAILED").length,
            collectionRate: ps.length ? Math.round((done.length / ps.length) * 100) : 0,
            earningsByStation: ids.map((id) => {
                const at = ps.filter((p) => p.toOfficeId === id);
                const d = at.filter((p) => done.includes(p));
                return { officeId: id, officeName: officeOf(id)?.name ?? id, parcelCount: at.length, deliveredCount: d.length, collectedAmount: d.reduce((s, p) => s + amount(p), 0), totalAmount: at.reduce((s, p) => s + amount(p), 0) };
            }),
            collectedParcels: done.map((p) => ({ parcelId: p.parcelId, receiverName: p.receiverName, stationName: officeOf(p.toOfficeId)?.name, itemCost: p.itemCost, deliveryFee: p.vendorDeliveryFee, total: amount(p), createdAt: p.createdAt })),
        };
    });
};
