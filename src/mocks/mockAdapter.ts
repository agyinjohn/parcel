/**
 * Axios adapter that answers API calls from in-memory sample data.
 * Only loaded when the app runs with VITE_USE_MOCK_API=true (see ./setup.ts).
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
    ADDRESSES, ASSIGNMENTS, OFFICES, DEMO_ACCOUNTS, DRIVER_ASSIGNMENTS, FUEL_REQUESTS, HOME_OFFICE,
    INCOMING_TRANSFERS, OUTGOING_TRANSFERS, PARCELS, RIDERS, SHELVES, USERS, USER_ACTIONS,
    locationsWithOffices, serializeAssignment, serializeParcel, only, USER_FIELDS, riderLocationNow, riderTrackPoints, MockParcel,
} from "./mockData";
import API_BASE_URL from "../config/api";
import { analyzeOffTask, checkDeliveries, normalizePoints, summarize, type DeliveryStop } from "../screens/RiderMap/trackUtils";

/** Builds a DeliveryCheckResponse (updated backend) from the sample track and assignments. */
const serverDeliveryCheck = (rider: (typeof RIDERS)[number], begin: number, end: number) => {
    const points = normalizePoints(riderTrackPoints(rider.userId, begin, end));
    const stops: DeliveryStop[] = ASSIGNMENTS
        .filter((a) => a.riderId === rider.userId)
        .flatMap((a) => a.parcels.map((p) => ({
            id: `${a.assignmentId}:${p.parcelId}`,
            parcelId: p.parcelId,
            receiverName: p.receiverName,
            locationName: p.receiverLocationName,
            lat: p.receiverLatitude,
            lng: p.receiverLongitude,
            assignedAt: a.assignedAt,
            completedAt: a.completedAt,
            status: a.status,
            assignmentId: a.assignmentId,
        })))
        .filter((st) => (st.completedAt != null ? st.completedAt >= begin && st.completedAt <= end : (st.assignedAt ?? 0) <= end && !["DELIVERED", "RETURNED"].includes(st.status)));
    const checks = points.length ? checkDeliveries(points, stops, { start: begin, end }) : stops.map((stop) => ({ kind: stop.lat == null ? "no-location" : "no-data", stop } as const));
    const summary = summarize(points);
    const off = points.length ? analyzeOffTask(points, checks, summary.stops, {}) : null;
    const RESULT = { visited: "REACHED", "not-visited": "NOT_REACHED", pending: "NOT_FINISHED", "no-location": "NO_PIN", "no-data": "NO_GPS" } as const;
    const deliveries = checks.map((c) => {
        const st = c.stop as DeliveryStop & { assignmentId?: string };
        const marked = "markedAwayM" in c ? c.markedAwayM : undefined;
        return {
            assignmentId: st.assignmentId, parcelId: st.parcelId, receiverName: st.receiverName, receiverLocationName: st.locationName,
            receiverLatitude: st.lat, receiverLongitude: st.lng, status: st.status, completedAt: st.completedAt,
            result: RESULT[c.kind],
            arrivedAt: c.kind === "visited" ? c.arrivedAt : undefined,
            leftAt: c.kind === "visited" ? c.leftAt : undefined,
            minutesThere: c.kind === "visited" ? Math.round((c.leftAt - c.arrivedAt) / 60_000) : undefined,
            closestDistanceM: "closestM" in c && c.closestM != null && Number.isFinite(c.closestM) ? Math.round(c.closestM) : undefined,
            closestAt: c.kind === "not-visited" ? c.closestAt : undefined,
            markedDistanceFromDropoffM: marked != null ? Math.round(marked) : undefined,
            markedAway: marked != null,
        };
    });
    const count = (r: string) => deliveries.filter((d) => d.result === r).length;
    return {
        riderId: rider.userId,
        riderName: rider.name,
        summary: {
            deliveries: deliveries.length, reached: count("REACHED"), notReached: count("NOT_REACHED"), notFinished: count("NOT_FINISHED"),
            noPin: count("NO_PIN"), noGps: count("NO_GPS"), markedAway: deliveries.filter((d) => d.markedAway).length,
            distanceKm: Math.round(summary.distanceKm * 10) / 10, movingMinutes: Math.round(summary.movingMs / 60_000), stoppedMinutes: Math.round(summary.stoppedMs / 60_000),
        },
        deliveries,
        offTask: off
            ? {
                judged: off.judged, reason: off.reason, directKm: off.directKm, distanceKm: summary.distanceKm,
                offRouteMinutes: Math.round(off.offRouteMs / 60_000), offRouteKm: off.offRouteKm,
                detours: off.detours.map((d) => {
                    const [fromLabel, toLabel] = d.leg.split(" → ");
                    return { start: d.start, end: d.end, fromLabel, toLabel, maxOffRouteM: Math.round(d.maxOffM), kmRidden: Math.round(d.km * 10) / 10 };
                }),
                offTaskStops: off.unexplainedStops.map((st) => ({ start: st.start, end: st.end, lat: st.lat, lng: st.lng, minutes: Math.round((st.end - st.start) / 60_000) })),
                offTaskStopMinutes: Math.round(off.unexplainedStops.reduce((t, st) => t + st.end - st.start, 0) / 60_000),
            }
            : { judged: false, reason: "No GPS points in this period." },
    };
};

type Handler = (ctx: { params: URLSearchParams; body: any; match: RegExpMatchArray; config: InternalAxiosRequestConfig }) => unknown;
interface Route { method: string; pattern: RegExp; handler: Handler; }

const routes: Route[] = [];
const on = (method: string, pattern: RegExp, handler: Handler) => routes.push({ method, pattern, handler });

// ── Helpers ─────────────────────────────────────────────────────
const page = <T,>(items: T[], params: URLSearchParams) => {
    const size = Number(params.get("size") ?? 50) || 50;
    const number = Number(params.get("page") ?? 0) || 0;
    const content = items.slice(number * size, number * size + size);
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    return {
        content, totalElements: items.length, totalPages, number, size,
        first: number === 0, last: number >= totalPages - 1,
        numberOfElements: content.length, empty: content.length === 0,
    };
};

const bool = (v: string | null) => (v === null ? undefined : v === "true");
const byNewest = (a: MockParcel, b: MockParcel) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
const officeIdOf = (p: MockParcel) => p.officeId as string;
const parcelPage = (items: MockParcel[], params: URLSearchParams) => page(items.map(serializeParcel), params);

const filterParcels = (params: URLSearchParams, scopeToHome: boolean) => {
    const office = params.get("officeId") || (scopeToHome ? HOME_OFFICE.id : null);
    const isDelivered = bool(params.get("isDelivered"));
    const isAssigned = bool(params.get("isParcelAssigned"));
    const isPOD = bool(params.get("isPOD"));
    const hasCalled = bool(params.get("hasCalled"));
    return PARCELS.filter((p) =>
        (!office || officeIdOf(p) === office) &&
        (isDelivered === undefined || !!p.delivered === isDelivered) &&
        (isAssigned === undefined || !!p.parcelAssigned === isAssigned) &&
        (isPOD === undefined || !!p.pod === isPOD) &&
        (hasCalled === undefined || !!p.hasCalled === hasCalled)
    ).sort(byNewest);
};

const ok = (message = "Success (mock)") => ({ message, success: true, id: `mock-${Date.now()}` });
const findParcel = (id: string) => PARCELS.find((p) => p.parcelId === id);
const homeParcels = () => PARCELS.filter((p) => officeIdOf(p) === HOME_OFFICE.id);

// ── Auth ────────────────────────────────────────────────────────
on("post", /^\/api-user\/login$/, ({ body }) => {
    const phone = String(body?.phoneNumber ?? "").replace(/\D/g, "").replace(/^233/, "0");
    const byEmail = Object.entries(DEMO_ACCOUNTS).find(([, a]) => a.email === body?.email);
    const [phoneNumber, acct] = DEMO_ACCOUNTS[phone] ? [phone, DEMO_ACCOUNTS[phone]] : byEmail ?? ["0200000002", DEMO_ACCOUNTS["0200000002"]];
    const user = USERS.find((u) => u.phoneNumber === phoneNumber);
    const userId = acct.role === "RIDER" ? "rider-1" : user?.userId ?? "user-2";
    // UserLoginResponse
    return {
        userId, token: `mock-token-${acct.role.toLowerCase()}`, phoneNumber, name: acct.name, role: acct.role,
        companyId: "company-demo", companyName: "M&M Demo",
        office: {
            id: HOME_OFFICE.id, name: HOME_OFFICE.name, companyId: "company-demo", code: HOME_OFFICE.code,
            address: HOME_OFFICE.address, phoneNumber: HOME_OFFICE.phoneNumber, location: HOME_OFFICE.location,
            latitude: HOME_OFFICE.latitude, longitude: HOME_OFFICE.longitude,
            createdAt: HOME_OFFICE.createdAt, updatedAt: HOME_OFFICE.updatedAt,
        },
    };
});
on("post", /\/auth\/refresh-token$/, () => ({ token: "mock-token-refreshed" }));

// ── Offices, locations, shelves ─────────────────────────────────
on("get", /^\/api\/offices\/locations$/, () => locationsWithOffices());
on("get", /^\/api\/offices\/locations?\/([^/]+)$/, ({ match }) => locationsWithOffices().find((l) => l.id === match[1]));
on("get", /^\/api-user\/shelf\/office\/([^/]+)$/, ({ match }) => SHELVES.filter((s) => s.office.id === match[1]));

// ── Frontdesk parcels ───────────────────────────────────────────
on("get", /^\/api-frontdesk\/parcels$/, ({ params }) => parcelPage(filterParcels(params, true), params));
on("get", /^\/api-frontdesk\/parcels-uncalled$/, ({ params }) => parcelPage(homeParcels().filter((p) => !p.hasCalled).sort(byNewest), params));
on("get", /^\/api-frontdesk\/parcels\/home-delivery$/, ({ params }) =>
    parcelPage(homeParcels().filter((p) => p.homeDelivery && !p.delivered && !p.parcelAssigned && !p.returned), params));
// Not in the backend spec; kept because frontdeskService.getDeliveredParcels still calls it.
on("get", /^\/api-frontdesk\/parcels\/delivered$/, ({ params }) => parcelPage(homeParcels().filter((p) => p.delivered).sort(byNewest), params));
on("get", /^\/api-frontdesk\/parcels\/transfer\/in-transit$/, ({ params }) => parcelPage(INCOMING_TRANSFERS, params));
on("get", /^\/api-frontdesk\/parcels\/transfer\/outgoing$/, ({ params }) => parcelPage(OUTGOING_TRANSFERS, params));
on("get", /^\/api-frontdesk\/riders\/office$/, () => RIDERS.map((r) => only(r, USER_FIELDS)));
on("get", /^\/api-frontdesk\/addresses$/, ({ params }) => {
    const q = params.get("name")?.toLowerCase();
    return q ? ADDRESSES.filter((a) => a.name.toLowerCase().includes(q)) : ADDRESSES;
});
on("get", /^\/api-frontdesk\/parcel-assignment$/, ({ params }) => {
    const parcelId = params.get("parcelId");
    const status = params.get("status");
    const list = ASSIGNMENTS.filter((a) =>
        (!parcelId || a.parcels.some((p) => p.parcelId === parcelId)) && (!status || a.status === status));
    return page(list.sort((a, b) => b.assignedAt - a.assignedAt).map(serializeAssignment), params);
});
on("get", /^\/api-frontdesk\/rider\/([^/]+)\/assignments$/, ({ match, params }) => {
    const payed = bool(params.get("payed"));
    return ASSIGNMENTS.filter((a) => a.riderId === match[1] && (payed === undefined || a.payed === payed)).map(serializeAssignment);
});
on("get", /^\/api-frontdesk\/driver\/([^/]+)\/parcels$/, ({ match }) => homeParcels().filter((p) => p.driverId === match[1]).map(serializeParcel));
on("get", /^\/api-frontdesk\/driver-assignments\/unpaid$/, ({ params }) => {
    const phone = params.get("driverPhoneNumber");
    return page(DRIVER_ASSIGNMENTS.filter((d) => !d.payed && (!phone || d.driverPhoneNumber === phone)), params);
});
const reconciledOn = (params: URLSearchParams) => {
    const start = Number(params.get("date")) || new Date().setHours(0, 0, 0, 0);
    const end = start + 24 * 60 * 60 * 1000;
    return page(ASSIGNMENTS.filter((a) => a.payed && (a.completedAt ?? 0) >= start && (a.completedAt ?? 0) < end).map(serializeAssignment), params);
};
on("get", /^\/api-frontdesk\/reconciliations\/by-date$/, ({ params }) => reconciledOn(params));
on("get", /^\/api-frontdesk\/fuel-requests$/, ({ params }) => page(FUEL_REQUESTS, params));
on("get", /^\/api-tracking\/([^/]+)(\/track)?$/, ({ match }) => {
    const p = findParcel(match[1]);
    if (!p) return undefined;
    return { ...serializeParcel(p), status: p.delivered ? "DELIVERED" : p.parcelAssigned ? "OUT_FOR_DELIVERY" : "AT_STATION" };
});

on("post", /^\/api-frontdesk\/parcel$/, ({ body }) => {
    const parcel: MockParcel = {
        ...body,
        parcelId: `PF${Math.floor(300000 + Math.random() * 600000)}`,
        officeId: HOME_OFFICE.id,
        createdAt: Date.now(), registeredDate: Date.now(), updatedAt: Date.now(),
        delivered: false, parcelAssigned: false, hasCalled: false,
    };
    PARCELS.unshift(parcel);
    return serializeParcel(parcel);
});
on("put", /^\/api-frontdesk\/parcel\/([^/]+)$/, ({ match, body }) => {
    const p = findParcel(match[1]);
    if (p) Object.assign(p, body, { updatedAt: Date.now() });
    return p ? serializeParcel(p) : ok();
});
on("delete", /^\/api-frontdesk\/parcel\/([^/]+)$/, ({ match }) => {
    const i = PARCELS.findIndex((p) => p.parcelId === match[1]);
    if (i >= 0) PARCELS.splice(i, 1);
    return ok("Parcel deleted");
});
on("post", /^\/api-frontdesk\/parcel\/picked-up$/, ({ body }) => {
    const p = findParcel(body?.parcelId);
    if (p) Object.assign(p, { pickedUp: true, delivered: true, updatedAt: Date.now() });
    return ok("Parcel marked as picked up");
});
on("post", /^\/api-frontdesk\/assign-parcels$/, ({ body }) => {
    const ids: string[] = body?.parcelIds ?? [];
    const parcels = ids.map(findParcel).filter(Boolean) as MockParcel[];
    parcels.forEach((p) => (p.parcelAssigned = true));
    // Proposed: the confirmed route plan is stored with the assignment (handoff Part F).
    ASSIGNMENTS.unshift({ assignmentId: `asg-${Date.now()}`, riderId: body?.riderId ?? "rider-1", status: "ASSIGNED", assignedAt: Date.now(), payed: false, parcels, routePlan: body?.routePlan });
    return ok(`${parcels.length} parcel(s) assigned`);
});
const markPaid: Handler = ({ body }) => {
    // Updated backend sends { items: [...] }; the current one a single object or a list.
    const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [body];
    const ids: string[] = items.map((x: any) => (typeof x === "string" ? x : x?.assignmentId));
    ASSIGNMENTS.forEach((a) => {
        const item: any = items.find((x: any) => x?.assignmentId === a.assignmentId);
        if (!ids.includes(a.assignmentId)) return;
        a.payed = true;
        // Proposed (handoff Part K): keep what the manager actually received, per parcel.
        if (item?.payedAmount !== undefined) a.amountPayed = Number(item.payedAmount);
        if (Array.isArray(item?.lines)) a.reconciliationLines = item.lines;
    });
    DRIVER_ASSIGNMENTS.forEach((d) => ids.includes(d.id) && (d.payed = true));
    return ok("Payments reconciled");
};
on("post", /^\/api-frontdesk\/reconcilation-parcels$/, markPaid);
on("put", /^\/api-frontdesk\/driver-assignments\/pay$/, markPaid); // PUT in the spec
on("post", /^\/api-frontdesk\/addresses$/, ({ body }) => {
    const a = { id: `addr-${ADDRESSES.length + 1}`, name: body?.name, officeId: HOME_OFFICE.id, cost: Number(body?.cost) || 0 };
    ADDRESSES.push(a);
    return a;
});

// Station settings (pickup charge is a proposed field, handoff Part J).
const applyStationUpdate = (officeId: string, body: any) => {
    const office = OFFICES.find((x) => x.id === officeId);
    if (!office) throw { status: 404, message: "Office not found" };
    if (body?.name) office.name = body.name;
    if (body?.address !== undefined) office.address = body.address;
    if (body?.pickupChargeEnabled !== undefined) {
        (office as any).pickupChargeEnabled = !!body.pickupChargeEnabled;
        (office as any).pickupChargeAmount = body.pickupChargeEnabled ? Number(body.pickupChargeAmount) || 0 : null;
    }
    return ok("Station updated");
};
on("put", /^\/api-admin\/office\/([^/]+)$/, ({ match, body }) => applyStationUpdate(match[1], body));
on("put", /^\/api-frontdesk\/office\/pickup-charge$/, ({ body }) => applyStationUpdate(HOME_OFFICE.id, body));

// ── Admin ───────────────────────────────────────────────────────
on("get", /^\/api-admin\/parcels$/, ({ params }) => parcelPage(filterParcels(params, false), params));
on("get", /^\/api-admin\/users$/, ({ params }) => {
    const office = params.get("officeId");
    return page(USERS.filter((u) => !office || u.officeId === office).map((u) => only(u, USER_FIELDS)), params);
});
on("get", /^\/api-admin\/user-actions$/, ({ params }) => page(USER_ACTIONS, params));
on("get", /^\/api-admin\/reconciliations\/by-date$/, ({ params }) => reconciledOn(params));

// Dashboards: figures are derived from the sample parcels and assignments so they add up.
const DAY_MS = 24 * 60 * 60 * 1000;
const dashboardWindow = (params: URLSearchParams) => {
    const end = Number(params.get("endDate")) || Date.now();
    const start = Number(params.get("startDate")) || end - 30 * DAY_MS; // API default: last 30 days
    const office = params.get("officeId");
    return { start, end, inScope: (officeId: string) => !office || officeId === office };
};
const amountOf = (p: MockParcel) => (p.inboundCost || 0) + (p.pickUpCost || 0) + (p.deliveryCost || 0) + (p.storageCost || 0);

on("get", /^\/api-admin\/revenue-dashboard$/, ({ params }) => {
    const { start, end, inScope } = dashboardWindow(params);
    const inRange = (t?: number) => (t ?? 0) >= start && (t ?? 0) <= end;
    const parcels = PARCELS.filter((p) => inScope(officeIdOf(p)) && inRange(p.createdAt));
    const done = ASSIGNMENTS.filter((a) => a.status === "DELIVERED" && inScope(HOME_OFFICE.id) && inRange(a.completedAt));
    const pickedUp = parcels.filter((p) => p.pickedUp);
    const totalRevenue = parcels.reduce((s, p) => s + amountOf(p), 0);
    const collected = done.reduce((s, a) => s + a.parcels.reduce((t, p) => t + amountOf(p), 0), 0) + pickedUp.reduce((s, p) => s + amountOf(p), 0);
    const outstanding = done.filter((a) => !a.payed).reduce((s, a) => s + a.parcels.reduce((t, p) => t + amountOf(p), 0), 0);
    const driverPayments = parcels.filter((p) => p.inboudPayed).reduce((s, p) => s + (p.inboundCost || 0), 0);
    const pod = parcels.filter((p) => p.pod).reduce((s, p) => s + amountOf(p), 0);
    const round = (n: number) => Math.round(n * 100) / 100;
    const total = (a: (typeof ASSIGNMENTS)[number]) => a.parcels.reduce((t, p) => t + amountOf(p), 0);
    const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
    const days: string[] = [];
    for (let t = start; t <= end; t += DAY_MS) days.push(ymd(t));
    const paid = done.filter((a) => a.payed);
    const methodOf = (a: (typeof ASSIGNMENTS)[number]) => (a.paymentMethod === "momo" ? "MOMO" : a.paymentMethod === "cash" ? "CASH" : "OTHER");
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
        totalRevenue: round(totalRevenue), collected: round(collected), outstanding: round(outstanding), driverPayments: round(driverPayments),
        collectionRate: totalRevenue ? Math.round((collected / totalRevenue) * 1000) / 10 : 0,
        avgPerParcel: parcels.length ? Math.round((totalRevenue / parcels.length) * 100) / 100 : 0,
        revenueVsCollectedTrend: days.map((d) => ({
            date: d,
            revenue: round(parcels.filter((p) => ymd(p.createdAt) === d).reduce((s, p) => s + amountOf(p), 0)),
            collected: round(paid.filter((a) => ymd(a.completedAt ?? 0) === d).reduce((s, a) => s + total(a), 0)),
            outstanding: round(done.filter((a) => !a.payed && ymd(a.completedAt ?? 0) === d).reduce((s, a) => s + total(a), 0)),
        })),
        revenueByStation: OFFICES.filter((o) => inScope(o.id)).map((o) => {
            const mine = parcels.filter((p) => officeIdOf(p) === o.id);
            const rev = mine.reduce((s, p) => s + amountOf(p), 0);
            const col = o.id === HOME_OFFICE.id ? collected : mine.filter((p) => p.delivered).reduce((s, p) => s + amountOf(p), 0);
            const out = o.id === HOME_OFFICE.id ? outstanding : 0;
            return { officeId: o.id, stationName: o.name, parcels: mine.length, revenue: round(rev), collected: round(col), outstanding: round(out), collectionRate: rev ? Math.round((col / rev) * 1000) / 10 : 0 };
        }).sort((a, b) => b.revenue - a.revenue),
        paymentMethodTrend: days.map((d) => {
            const today = paid.filter((a) => ymd(a.completedAt ?? 0) === d);
            const by = (m: string) => round(today.filter((a) => methodOf(a) === m).reduce((s, a) => s + total(a), 0));
            return { date: d, cash: by("CASH"), momo: by("MOMO"), other: by("OTHER") };
        }),
        revenueByType: { pod: round(pod), nonPod: round(totalRevenue - pod) },
        paymentMethods: ["CASH", "MOMO"].map((m) => {
            const list = paid.filter((a) => methodOf(a) === m);
            return { method: m, amount: round(list.reduce((s, a) => s + total(a), 0)), count: list.length };
        }),
        revenueByDayOfWeek: weekday.map((day, i) => ({ day, revenue: round(parcels.filter((p) => new Date(p.createdAt).getDay() === i).reduce((s, p) => s + amountOf(p), 0)) })),
    };
});

on("get", /^\/api-admin\/dashboard$/, ({ params }) => {
    const { start, end, inScope } = dashboardWindow(params);
    const inRange = (t?: number) => (t ?? 0) >= start && (t ?? 0) <= end;
    const parcels = PARCELS.filter((p) => inScope(officeIdOf(p)) && inRange(p.createdAt));
    const finished = ASSIGNMENTS.filter((a) => inScope(HOME_OFFICE.id) && inRange(a.completedAt));
    const delivered = finished.filter((a) => a.status === "DELIVERED");
    const failed = finished.filter((a) => a.status === "RETURNED");
    const assignmentTotal = (a: (typeof ASSIGNMENTS)[number]) => a.parcels.reduce((t, p) => t + amountOf(p), 0);
    const totalRevenue = parcels.reduce((s, p) => s + amountOf(p), 0);
    const collected = delivered.filter((a) => a.payed).reduce((s, a) => s + assignmentTotal(a), 0)
        + parcels.filter((p) => p.pickedUp).reduce((s, p) => s + amountOf(p), 0);
    const outstanding = delivered.filter((a) => !a.payed).reduce((s, a) => s + assignmentTotal(a), 0);
    const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
    const days: string[] = [];
    for (let t = start; t <= end; t += DAY_MS) days.push(ymd(t));
    const onDay = <T,>(list: T[], at: (x: T) => number | undefined, d: string) => list.filter((x) => ymd(at(x) ?? 0) === d);
    const deliveredCount = delivered.length + parcels.filter((p) => p.pickedUp).length;
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        totalRevenue: round(totalRevenue),
        totalParcels: parcels.length,
        successRate: deliveredCount + failed.length ? Math.round((deliveredCount / (deliveredCount + failed.length)) * 1000) / 10 : 0,
        activeRiders: new Set(finished.map((a) => a.riderId)).size,
        collected: round(collected),
        outstanding: round(outstanding),
        driverPaymentsOwed: round(parcels.filter((p) => !p.inboudPayed).reduce((s, p) => s + (p.inboundCost || 0), 0)),
        revenueVsCollected: days.map((d) => {
            const revenue = onDay(parcels, (p) => p.createdAt, d).reduce((s, p) => s + amountOf(p), 0);
            const paid = onDay(delivered, (a) => a.completedAt, d);
            const col = paid.filter((a) => a.payed).reduce((s, a) => s + assignmentTotal(a), 0);
            const out = paid.filter((a) => !a.payed).reduce((s, a) => s + assignmentTotal(a), 0);
            return { date: d, revenue: round(revenue), collected: round(col), outstanding: round(out) };
        }),
        deliveredVsFailed: days.map((d) => ({ date: d, delivered: onDay(delivered, (a) => a.completedAt, d).length, failed: onDay(failed, (a) => a.completedAt, d).length })),
        parcelPipeline: {
            registered: parcels.length,
            contacted: parcels.filter((p) => p.hasCalled).length,
            readyForDelivery: parcels.filter((p) => p.hasCalled && !p.parcelAssigned && !p.delivered && !p.returned).length,
            assigned: parcels.filter((p) => p.parcelAssigned).length,
            outForDelivery: ASSIGNMENTS.filter((a) => inScope(HOME_OFFICE.id) && ["ACCEPTED", "IN_TRANSIT"].includes(a.status)).length,
            delivered: parcels.filter((p) => p.delivered).length,
            failed: parcels.filter((p) => p.returned).length,
        },
        stationSnapshot: OFFICES.filter((o) => inScope(o.id)).map((o) => {
            const mine = parcels.filter((p) => officeIdOf(p) === o.id);
            const ok = mine.filter((p) => p.delivered).length;
            const bad = mine.filter((p) => p.returned).length;
            return {
                officeId: o.id, stationName: o.name, parcels: mine.length,
                revenue: round(mine.reduce((s, p) => s + amountOf(p), 0)),
                successRate: ok + bad ? Math.round((ok / (ok + bad)) * 1000) / 10 : 0,
            };
        }).sort((a, b) => b.revenue - a.revenue),
        topRiders: RIDERS.map((r) => {
            const mine = delivered.filter((a) => a.riderId === r.userId);
            return { riderId: r.userId, riderName: r.name, deliveries: mine.length, revenue: round(mine.reduce((s, a) => s + assignmentTotal(a), 0)) };
        }).filter((r) => r.deliveries > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
});

on("get", /^\/api-admin\/rider-performance-dashboard$/, ({ params }) => {
    const { start, end, inScope } = dashboardWindow(params);
    const finished = ASSIGNMENTS.filter((a) => inScope(HOME_OFFICE.id) && (a.completedAt ?? 0) >= start && (a.completedAt ?? 0) <= end);
    const rows = RIDERS.map((r) => {
        const mine = finished.filter((a) => a.riderId === r.userId);
        const delivered = mine.filter((a) => a.status === "DELIVERED");
        const sum = (list: typeof mine) => list.reduce((s, a) => s + a.parcels.reduce((t, p) => t + amountOf(p), 0), 0);
        return {
            riderId: r.userId, riderName: r.name,
            deliveries: delivered.length,
            failed: mine.filter((a) => a.status === "RETURNED").length,
            revenue: sum(delivered),
            outstanding: sum(delivered.filter((a) => !a.payed)),
            rating: 4.6, avgTimeHours: 2.1,
        };
    }).sort((a, b) => b.revenue - a.revenue).map((r, i) => ({ rank: i + 1, ...r }));
    return { earningsTrend: [], monthlyEarnings: [], riderLeaderboard: rows };
});

// Updated backend: every rider at once; riders without a device come back with located=false and no IMEI.
on("get", /^\/api-admin\/riders\/locations$/, () =>
    RIDERS.map((r) => {
        const res = riderLocationNow(r.userId);
        return res.status === 200
            ? res.body
            : { riderId: r.userId, riderName: r.name, riderPhoneNumber: r.phoneNumber, located: false };
    })
);

// Updated backend: server-side delivery and off-task check, worked out here with the same rules as the UI.
on("get", /^\/api-admin\/riders\/delivery-check$/, ({ params }) => {
    const parse = (v: string | null) => {
        const m = v?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
        return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN;
    };
    const begin = parse(params.get("beginTime"));
    const end = parse(params.get("endTime"));
    if (!Number.isFinite(begin) || !Number.isFinite(end)) throw { status: 400, message: "Times must be in UTC format: yyyy-MM-dd HH:mm:ss" };
    const rider = RIDERS.find((r) => r.phoneNumber === params.get("phoneNumber"));
    if (!rider) throw { status: 404, message: "Rider not found" };
    return serverDeliveryCheck(rider, begin, end);
});

// Rider GPS: 422 when no device is assigned, 404 for unknown phone numbers.
on("get", /^\/api-admin\/riders\/location$/, ({ params }) => {
    const phone = params.get("phoneNumber") ?? "";
    const rider = RIDERS.find((r) => r.phoneNumber === phone);
    const res = riderLocationNow(rider?.userId ?? "");
    if (res.status === 200) return res.body;
    throw { status: res.status, message: res.status === 422 ? "Rider has no GPS device assigned" : "Rider not found" };
});

// Rider GPS history. Enforces the documented limits: UTC "yyyy-MM-dd HH:mm:ss", max 2 days, last 3 months.
on("get", /^\/api-admin\/riders\/track$/, ({ params }) => {
    const parse = (v: string | null) => {
        const m = v?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
        return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN;
    };
    const begin = parse(params.get("beginTime"));
    const end = parse(params.get("endTime"));
    if (!Number.isFinite(begin) || !Number.isFinite(end)) throw { status: 400, message: "Times must be in UTC format: yyyy-MM-dd HH:mm:ss" };
    if (end - begin > 2 * 24 * 60 * 60_000) throw { status: 400, message: "Max range is 2 days" };
    if (begin < Date.now() - 90 * 24 * 60 * 60_000) throw { status: 400, message: "History is only kept for 3 months" };
    const rider = RIDERS.find((r) => r.phoneNumber === params.get("phoneNumber"));
    if (!rider) throw { status: 404, message: "Rider not found" };
    if (!rider.deviceImei) throw { status: 422, message: "Rider has no GPS device assigned" };
    return { riderId: rider.userId, riderName: rider.name, deviceImei: rider.deviceImei, trackPoints: riderTrackPoints(rider.userId, begin, end) };
});

// Assign a GPS tracker. Like the real API, answers are plain strings.
on("put", /^\/api-admin\/riders\/device$/, ({ body }) => {
    const phone = String(body?.phoneNumber ?? "");
    const user = USERS.find((u) => u.phoneNumber === phone);
    const rider = RIDERS.find((r) => r.phoneNumber === phone);
    if (!user && !rider) throw { status: 404, message: "Rider not found" };
    if (!rider) throw { status: 400, message: "User is not a rider" };
    rider.deviceImei = String(body?.deviceImei ?? "");
    if (user) (user as { deviceImei?: string }).deviceImei = rider.deviceImei;
    return "Device assigned successfully";
});

// ── Call center ─────────────────────────────────────────────────
on("get", /^\/api-call-center\/stats$/, () => ({ totalDeliveredYesterday: 23, reached: 15, unreachable: 3, notCalled: 5 }));
on("get", /^\/api-call-center\/parcels\/uncalled$/, ({ params }) => parcelPage(homeParcels().filter((p) => !p.hasCalled && !p.delivered).sort(byNewest), params));
on("get", /^\/api-call-center\/parcels\/not-delivered-uncalled$/, ({ params }) => parcelPage(homeParcels().filter((p) => !p.delivered).sort(byNewest), params));
on("get", /^\/api-call-center\/parcels\/delivered-uncalled$/, ({ params }) => parcelPage(homeParcels().filter((p) => p.delivered), params));

// ── Rider ───────────────────────────────────────────────────────
const riderAssignments = () => ASSIGNMENTS.filter((a) => a.riderId === "rider-1").sort((a, b) => b.assignedAt - a.assignedAt);
// The spec returns a plain array here, not a page. onlyUndelivered=true drops finished ones.
on("get", /^\/api-rider\/assignments$/, ({ params }) =>
    riderAssignments()
        .filter((a) => params.get("onlyUndelivered") !== "true" || !["DELIVERED", "RETURNED", "COMPLETED", "CANCELLED"].includes(a.status))
        .map(serializeAssignment));
on("put", /^\/api-rider\/(?:manager\/)?assignments\/([^/]+)\/status$/, ({ match, body }) => {
    const a = ASSIGNMENTS.find((x) => x.assignmentId === match[1]);
    if (!a) return ok();
    a.status = body?.status ?? a.status;
    if (body?.returnReason) a.returnReason = body.returnReason;
    if (body?.status === "DELIVERED" || body?.status === "RETURNED") {
        a.completedAt = Date.now();
        a.paymentMethod = body?.payementMethod;
        a.parcels.forEach((p) => {
            p.parcelAssigned = false;
            p.delivered = body.status === "DELIVERED";
            p.returned = body.status === "RETURNED";
            p.deliveryDate = Date.now();
        });
    }
    return serializeAssignment(a);
});
on("put", /^\/api-rider\/rider-status$/, () => ok("Status updated"));
on("get", /^\/api-rider\/fuel-requests$/, ({ params }) => page(FUEL_REQUESTS.filter((f) => f.riderInfo.riderId === "rider-1"), params));
on("post", /^\/api-rider\/fuel-request$/, ({ body }) => {
    const r = RIDERS[0];
    const req = {
        id: `fuel-${Date.now()}`, status: "PENDING" as const,
        riderInfo: { riderId: r.userId, riderName: r.name, riderPhoneNumber: r.phoneNumber, stationName: HOME_OFFICE.name },
        officeId: HOME_OFFICE.id, station: body?.station ?? "", notes: body?.notes ?? "", tank: body?.tank ?? "FULL_TANK",
        amount: null, fuleStationPhoneNumber: body?.fuelStationNumber ?? "", attendantPhoneNumber: body?.attendantNumber ?? "",
        createdAt: Date.now(), updatedAt: Date.now(),
    };
    FUEL_REQUESTS.unshift(req as any);
    return req;
});

// ── Adapter ─────────────────────────────────────────────────────
const basePath = new URL(API_BASE_URL, window.location.origin).pathname.replace(/\/$/, "");

const toPath = (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    const joined = /^https?:\/\//.test(url) || !config.baseURL
        ? url
        : `${config.baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
    const u = new URL(joined, window.location.origin);
    let path = u.pathname.replace(/\/$/, "");
    if (basePath && path.startsWith(basePath)) path = path.slice(basePath.length);
    const params = new URLSearchParams(u.search);
    if (config.params) Object.entries(config.params).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
    return { path: path || "/", params };
};

export const mockAdapter: AxiosAdapter = async (config) => {
    const method = (config.method ?? "get").toLowerCase();
    const { path, params } = toPath(config);
    let body: any = config.data;
    if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { /* leave as string */ }
    }

    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180)); // feel like a network
    // Demo-only: keep recent writes visible for manual checks and browser tests.
    if (method !== "get") {
        const log = ((window as any).__mockRequests ??= []) as unknown[];
        log.push({ method, path, body });
        if (log.length > 50) log.shift();
    }

    const respond = (status: number, data: unknown): AxiosResponse => ({
        data, status, statusText: status === 200 ? "OK" : "Error", headers: {}, config, request: {},
    });

    for (const r of routes) {
        if (r.method !== method) continue;
        const match = path.match(r.pattern);
        if (!match) continue;
        let data: unknown;
        try {
            data = r.handler({ params, body, match, config });
        } catch (e: any) {
            if (typeof e?.status !== "number") throw e;
            const err: any = new Error(`Request failed with status code ${e.status}`);
            err.response = respond(e.status, config.url?.includes("/riders/device") ? e.message : { message: e.message });
            err.config = config;
            throw err;
        }
        if (data === undefined) {
            const err: any = new Error(`Mock: not found ${method.toUpperCase()} ${path}`);
            err.response = respond(404, { message: "Not found" });
            err.config = config;
            throw err;
        }
        return respond(200, JSON.parse(JSON.stringify(data)));
    }

    // Path exists but not for this method: answer like Spring would, so mismatches show up.
    if (routes.some((r) => r.pattern.test(path))) {
        console.warn(`[mock api] ${method.toUpperCase()} ${path} is not allowed; the API expects ${routes.filter((r) => r.pattern.test(path)).map((r) => r.method.toUpperCase()).join("/")}`);
        const err: any = new Error(`Request failed with status code 405`);
        err.response = respond(405, { message: "Method Not Allowed" });
        err.config = config;
        throw err;
    }

    // Unknown endpoint: answer with an empty list so screens render their empty state.
    console.info(`[mock api] no handler for ${method.toUpperCase()} ${path}; returning []`);
    return respond(200, method === "get" ? [] : ok());
};
