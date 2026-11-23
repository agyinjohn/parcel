/**
 * Sample data for mock API mode (`npm run dev:mock`).
 *
 * Everything here is generated deterministically from a fixed seed so the
 * screens look the same on every reload. Timestamps are relative to "now" so
 * today's dashboards always have something to show.
 */

import { encodePolyline, estimatePlan, orderStops, type PlanStop } from "../utils/routePlan";

// ── Deterministic RNG ───────────────────────────────────────────
let seed = 20251121;
const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

// ── Reference data ──────────────────────────────────────────────
const FIRST = ["Kwame", "Ama", "Kofi", "Akosua", "Yaw", "Abena", "Kojo", "Efua", "Kwabena", "Adwoa", "Kwesi", "Esi", "Nana", "Afia", "Fiifi", "Akua", "Selorm", "Dzifa", "Elikem", "Mawuli"];
const LAST = ["Mensah", "Owusu", "Boateng", "Asante", "Osei", "Addo", "Agyeman", "Appiah", "Darko", "Ofori", "Quaye", "Tetteh", "Amoah", "Badu", "Nkrumah", "Sarpong"];
const AREAS = ["East Legon, Accra", "Osu, Accra", "Madina, Accra", "Spintex Road, Accra", "Dansoman, Accra", "Achimota, Accra", "Labone, Accra", "Adenta, Accra", "Kasoa", "Airport Residential, Accra", "Cantonments, Accra", "Teshie, Accra", "Haatso, Accra", "Dzorwulu, Accra"];
// Rough centres and well-known landmarks, used for pinned delivery locations in demo data.
const AREA_PLACES: Record<string, { lat: number; lng: number; landmarks: string[] }> = {
    "East Legon, Accra": { lat: 5.6370, lng: -0.1610, landmarks: ["A&C Mall", "American House", "Shiashie Junction"] },
    "Osu, Accra": { lat: 5.5560, lng: -0.1820, landmarks: ["Danquah Circle", "Osu Castle", "Koala Supermarket"] },
    "Madina, Accra": { lat: 5.6680, lng: -0.1650, landmarks: ["Madina Market", "Zongo Junction", "UPSA"] },
    "Spintex Road, Accra": { lat: 5.6250, lng: -0.1100, landmarks: ["Palace Mall", "Coca-Cola Roundabout", "Baatsonaa Total"] },
    "Dansoman, Accra": { lat: 5.5480, lng: -0.2660, landmarks: ["Dansoman Roundabout", "Sakaman Junction", "Shell Dansoman"] },
    "Achimota, Accra": { lat: 5.6200, lng: -0.2250, landmarks: ["Achimota Mall", "Achimota School", "Neoplan Station"] },
    "Labone, Accra": { lat: 5.5650, lng: -0.1700, landmarks: ["Labone Junction", "Kofi Annan Peacekeeping Centre"] },
    "Adenta, Accra": { lat: 5.7080, lng: -0.1600, landmarks: ["Adenta Barrier", "SDA Junction"] },
    "Kasoa": { lat: 5.5340, lng: -0.4240, landmarks: ["Kasoa Toll Booth", "Kasoa Market"] },
    "Airport Residential, Accra": { lat: 5.6030, lng: -0.1780, landmarks: ["Marina Mall", "Airport Shell"] },
    "Cantonments, Accra": { lat: 5.5800, lng: -0.1720, landmarks: ["US Embassy", "37 Military Hospital"] },
    "Teshie, Accra": { lat: 5.5850, lng: -0.1050, landmarks: ["Teshie Tsuibleoo", "Teshie First Junction"] },
    "Haatso, Accra": { lat: 5.6620, lng: -0.1950, landmarks: ["Haatso Station", "Atomic Junction"] },
    "Dzorwulu, Accra": { lat: 5.6080, lng: -0.1990, landmarks: ["Dzorwulu Junction", "Fiesta Royale"] },
};

const STREETS = ["Lagos Ave", "Boundary Rd", "Oxford St", "Liberation Rd", "Ring Rd East", "Mission St", "Palm St", "Kwame Nkrumah Ave", "Independence Ave", "Akosombo Rd"];
const ITEMS = ["Phone accessories", "Clothing", "Documents", "Shoes", "Laptop", "Cosmetics", "Food items", "Books", "Kitchen appliance", "Electronics", "Bag", "Hair products", "Medication", "Gift box", "Spare parts"];
const VEHICLES = ["GR-2341-22", "AS-1187-21", "GT-9921-23", "GW-4410-20", "GN-7765-24", "WR-3302-22"];

const phone = () => `0${pick(["24", "54", "55", "20", "50", "27", "26"])}${int(1000000, 9999999)}`;
const person = () => `${pick(FIRST)} ${pick(LAST)}`;

// ── Locations & offices ─────────────────────────────────────────
export const LOCATIONS = [
    { id: "loc-accra", name: "Accra", region: "Greater Accra", country: "Ghana" },
    { id: "loc-kumasi", name: "Kumasi", region: "Ashanti", country: "Ghana" },
    { id: "loc-tema", name: "Tema", region: "Greater Accra", country: "Ghana" },
    { id: "loc-takoradi", name: "Takoradi", region: "Western", country: "Ghana" },
];

const officeRows: Array<[string, string, string, string, string]> = [
    ["off-accra", "Accra Central", "ACC", "12 Kojo Thompson Rd, Adabraka", "loc-accra"],
    ["off-eastlegon", "East Legon", "ELG", "5 Lagos Ave, East Legon", "loc-accra"],
    ["off-kumasi", "Kumasi Adum", "KAD", "Adum Main St, Kumasi", "loc-kumasi"],
    ["off-tema", "Tema Community 1", "TM1", "Harbour Rd, Community 1", "loc-tema"],
    ["off-takoradi", "Takoradi Market Circle", "TKD", "Market Circle, Takoradi", "loc-takoradi"],
];

// Proposed backend fields (handoff Part E1). Accra Central matches where demo routes start.
const OFFICE_POSITIONS: Record<string, [number, number]> = {
    "off-accra": [5.5560, -0.2050],
    "off-eastlegon": [5.6370, -0.1600],
    "off-kumasi": [6.6930, -1.6240],
    "off-tema": [5.6700, -0.0170],
    "off-takoradi": [4.8970, -1.7560],
};

const PICKUP_CHARGES: Record<string, number | undefined> = {
    "off-accra": 10, "off-eastlegon": 0, "off-kumasi": 15, "off-tema": 0, "off-takoradi": undefined,
};

export const OFFICES = officeRows.map(([id, name, code, address, locationId]) => {
    const loc = LOCATIONS.find((l) => l.id === locationId)!;
    return {
        id, name, code, address,
        latitude: OFFICE_POSITIONS[id][0],
        longitude: OFFICE_POSITIONS[id][1],
        // Proposed (handoff Part J): pickup-request charge per station. Takoradi isn't configured yet.
        ...(PICKUP_CHARGES[id] !== undefined ? { pickupChargeEnabled: PICKUP_CHARGES[id]! > 0, pickupChargeAmount: PICKUP_CHARGES[id]! > 0 ? PICKUP_CHARGES[id] : null } : {}),
        phoneNumber: phone(),
        locationName: loc.name,
        managerName: person(),
        location: loc,
        createdAt: now - 200 * DAY,
        updatedAt: now - 10 * DAY,
    };
});

export const HOME_OFFICE = OFFICES[0];
const officeRef = (o = HOME_OFFICE) => ({ id: o.id, name: o.name, code: o.code, address: o.address });

export const locationsWithOffices = () =>
    LOCATIONS.map((l) => ({
        ...l,
        offices: OFFICES.filter((o) => o.location.id === l.id).map(({ location: _location, ...o }) => o),
    }));

// ── Shelves ─────────────────────────────────────────────────────
export const SHELVES = OFFICES.flatMap((o) =>
    ["A1", "A2", "B1", "B2", "C1", "Fragile"].map((n, i) => ({
        id: `shelf-${o.code}-${i}`,
        name: n,
        office: officeRef(o),
    }))
);

// ── Demo login accounts (any password works) ────────────────────
// Roles use the backend's spelling (SUPERADMIN, CALLCENTER), as /api-user/login returns them.
export const DEMO_ACCOUNTS: Record<string, { name: string; role: string; email: string }> = {
    "0200000001": { name: "Abena Owusu", role: "ADMIN", email: "admin@demo.parcelflow" },
    "0200000002": { name: "Kofi Mensah", role: "MANAGER", email: "manager@demo.parcelflow" },
    "0200000003": { name: "Akosua Boateng", role: "FRONTDESK", email: "frontdesk@demo.parcelflow" },
    "0200000004": { name: "Esi Addo", role: "CALLCENTER", email: "caller@demo.parcelflow" },
    "0200000005": { name: "Kwame Asante", role: "RIDER", email: "rider@demo.parcelflow" },
    "0200000006": { name: "Nana Osei", role: "SUPERADMIN", email: "super@demo.parcelflow" },
};

// ── Riders ──────────────────────────────────────────────────────
export const RIDERS = [
    { userId: "rider-1", name: "Kwame Asante", phoneNumber: "0200000005" },
    { userId: "rider-2", name: "Yaw Darko", phoneNumber: phone() },
    { userId: "rider-3", name: "Kojo Appiah", phoneNumber: phone() },
    { userId: "rider-4", name: "Fiifi Quaye", phoneNumber: phone() },
    { userId: "rider-5", name: "Elikem Tetteh", phoneNumber: phone() },
].map((r, i) => ({
    ...r,
    email: `${r.name.split(" ")[0].toLowerCase()}@demo.parcelflow`,
    officeId: HOME_OFFICE.id,
    role: "RIDER" as const,
    status: "ACTIVE" as const,
    riderStatus: i === 3 ? "OFFLINE" : i === 1 ? "ON_TRIP" : "READY",
    // Fiifi Quaye (index 3) has no GPS tracker, so /riders/location answers 422 for him.
    deviceImei: i === 3 ? undefined : `35${String(8810000000000 + i * 7919).slice(0, 13)}`,
}));

/**
 * Sample GPS behaviour for /api-admin/riders/location. Each rider circles a point in Accra,
 * so positions change between refreshes. Elikem's tracker last reported 2 hours ago and
 * Kojo's tracker is on but has no fix.
 */
const RIDER_ROUTES: Record<string, { lat: number; lng: number; radius: number; minutesBehind?: number; noFix?: boolean }> = {
    "rider-1": { lat: 5.6145, lng: -0.1720, radius: 0.012 },
    "rider-2": { lat: 5.5800, lng: -0.2200, radius: 0.010 },
    "rider-3": { lat: 5.6500, lng: -0.1650, radius: 0.008, noFix: true },
    "rider-5": { lat: 5.6350, lng: -0.2350, radius: 0.006, minutesBehind: 120 },
};

const utcStamp = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

/**
 * Sample GPS history for /api-admin/riders/track. Built once per rider and day from that day's
 * finished deliveries: the rider leaves the station, rides to each drop-off in order (15-35 km/h,
 * one point a minute), waits 8-20 minutes, and returns. Delivery times are then aligned with the
 * visits. On busy days one delivery is marked done without the rider going there, so the
 * delivery check has something to catch.
 */
type TrackPoint = { lat: number; lng: number; speed: number; gpsTime: string; direction: number; altitude: number; posType: number };
const TRACKS = new Map<string, TrackPoint[]>(); // key: riderId|dayStartMs

export const buildRiderTracks = () => {
    const DAY = 24 * 60 * 60_000;
    const station = { lat: 5.5560, lng: -0.2050 }; // Accra Central
    const finished = ASSIGNMENTS.filter((a) => a.completedAt && (a.status === "DELIVERED" || a.status === "RETURNED"));
    const byRiderDay = new Map<string, MockAssignment[]>();
    finished.forEach((a) => {
        const route = RIDER_ROUTES[a.riderId];
        if (!route || route.noFix) return;
        const key = `${a.riderId}|${Math.floor(a.completedAt! / DAY) * DAY}`;
        byRiderDay.set(key, [...(byRiderDay.get(key) ?? []), a]);
    });

    byRiderDay.forEach((list, key) => {
        const [riderId, dayStr] = key.split("|");
        const day = Number(dayStr);
        const route = RIDER_ROUTES[riderId];
        let seed = (day / DAY) * 31 + riderId.charCodeAt(riderId.length - 1) * 977;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        list.sort((x, y) => x.completedAt! - y.completedAt!);
        const skip = list.length >= 3 ? list.findIndex((a, i) => i >= 2 && a.status === "DELIVERED") : -1;

        const stopFor = (a: MockAssignment) => {
            const p = a.parcels[0];
            return p.receiverLatitude != null
                ? { lat: p.receiverLatitude as number, lng: p.receiverLongitude as number }
                : { lat: route.lat + (rnd() - 0.5) * 0.05, lng: route.lng + (rnd() - 0.5) * 0.05 };
        };
        const visits = list.map((a, i) => ({ a, target: stopFor(a), skipped: i === skip, dwell: 8 + Math.floor(rnd() * 13) }));

        // Plan legs first so today's day can be placed to finish before "now".
        const legMinutes: number[] = [];
        let pos = station;
        [...visits.filter((v) => !v.skipped).map((v) => v.target), station].forEach((t) => {
            const km = Math.hypot((t.lat - pos.lat) * 111, (t.lng - pos.lng) * 111);
            legMinutes.push(Math.max(3, Math.round((km / 25) * 60 * 1.3)));
            pos = t;
        });
        // Busy days include one off-task side trip after the second drop-off (see detour below).
        const real = visits.filter((v) => !v.skipped);
        const detour = real.length >= 3 ? { out: 9 + Math.floor(rnd() * 4), stay: 20 + Math.floor(rnd() * 11), dir: rnd() < 0.5 ? 1 : -1 } : null;
        const total = legMinutes.reduce((x, y) => x + y, 0) + real.reduce((x, v) => x + v.dwell, 0)
            + (detour ? detour.out * 2 + detour.stay : 0);
        const isToday = day + DAY > Date.now();
        let t = isToday
            ? Math.max(day + 6 * 60 * 60_000, Date.now() - (route.minutesBehind ?? 0) * 60_000 - 10 * 60_000 - total * 60_000)
            : day + (8 * 60 + 20 + Math.floor(rnd() * 25)) * 60_000;
        t = Math.floor(t / 60_000) * 60_000;
        // Parcels are handed over before the rider leaves the station.
        list.forEach((a) => {
            a.assignedAt = Math.min(a.assignedAt, t - 20 * 60_000);
            a.acceptedAt = Math.min(a.acceptedAt ?? a.assignedAt, t - 10 * 60_000);
        });
        // The plan the manager confirmed that morning: station -> every drop-off in order -> station
        // (straight-line estimate, as demo mode has no Google). It includes the delivery that gets skipped.
        {
            const planStops: PlanStop[] = visits.map((v) => ({ id: v.a.parcels[0].parcelId, lat: v.target.lat, lng: v.target.lng, label: "" }));
            const plan = estimatePlan(planStops, station, station);
            const stored = {
                method: plan.method, stopOrder: plan.order,
                totalKm: Math.round(plan.totalKm * 10) / 10, totalMinutes: Math.round(plan.totalMinutes),
                legs: plan.legs, encodedPath: encodePolyline(plan.path),
                startLatitude: station.lat, startLongitude: station.lng, edited: false, plannedAt: t - 25 * 60_000,
            };
            list.forEach((a) => (a.routePlan = stored));
        }

        const pts: TrackPoint[] = [];
        const ride = (from: { lat: number; lng: number }, to: { lat: number; lng: number }, minutes: number) => {
            const cruise = 18 + rnd() * 17;
            const heading = (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
            for (let m = 0; m < minutes; m++) {
                const f = m / minutes;
                const wobble = Math.sin(m * 1.7) * 0.0005 * Math.sin(f * Math.PI);
                pts.push({
                    lat: from.lat + (to.lat - from.lat) * f + wobble, lng: from.lng + (to.lng - from.lng) * f - wobble,
                    speed: Math.round(cruise * (0.6 + 0.8 * Math.abs(Math.sin(m * 0.9)))),
                    direction: Math.round((heading + 360) % 360), altitude: 40 + Math.round(rnd() * 30), gpsTime: utcStamp(t), posType: 1,
                });
                t += 60_000;
            }
        };
        const wait = (at: { lat: number; lng: number }, minutes: number) => {
            for (let m = 0; m < minutes; m++) {
                pts.push({ lat: at.lat, lng: at.lng, speed: 0, direction: 0, altitude: 45, gpsTime: utcStamp(t), posType: 1 });
                t += 60_000;
            }
        };

        pos = station;
        let leg = 0;
        let lastVisitEnd = t;
        let reached = 0;
        visits.forEach((v) => {
            if (v.skipped) return;
            if (detour && reached === 2) {
                // Off-task: ride ~3-4 km away at right angles to the next leg, wait, come back.
                const dLat = v.target.lat - pos.lat, dLng = v.target.lng - pos.lng;
                const len = Math.hypot(dLat, dLng) || 1;
                const side = { lat: pos.lat + (-dLng / len) * 0.033 * detour.dir, lng: pos.lng + (dLat / len) * 0.033 * detour.dir };
                const back = { ...pos };
                ride(pos, side, detour.out);
                wait(side, detour.stay);
                ride(side, back, detour.out);
            }
            ride(pos, v.target, legMinutes[leg++]);
            reached++;
            const arrived = t;
            wait(v.target, v.dwell);
            pos = v.target;
            const done = arrived + Math.round(v.dwell * 0.6) * 60_000;
            v.a.completedAt = done;
            v.a.parcels.forEach((p) => (p.deliveryDate = done));
            lastVisitEnd = t;
        });
        ride(pos, station, legMinutes[leg]);
        // The skipped delivery is "marked delivered" while the rider is somewhere else.
        visits.filter((v) => v.skipped).forEach((v) => {
            v.a.completedAt = lastVisitEnd - 5 * 60_000;
            v.a.parcels.forEach((p) => (p.deliveryDate = v.a.completedAt));
        });
        // Never leave a delivery time in the future (very early in the day the plan may not fit).
        const latest = Date.now() - 5 * 60_000;
        list.forEach((a) => { if (a.completedAt! > latest) a.completedAt = latest; });
        TRACKS.set(key, pts);
    });
};

export const riderTrackPoints = (riderId: string, begin: number, end: number) => {
    const route = RIDER_ROUTES[riderId];
    if (!route || route.noFix) return [];
    const until = Math.min(end, Date.now() - (route.minutesBehind ?? 0) * 60_000);
    const DAY = 24 * 60 * 60_000;
    const out: TrackPoint[] = [];
    for (let day = Math.floor(begin / DAY) * DAY; day <= until; day += DAY) out.push(...(TRACKS.get(`${riderId}|${day}`) ?? []));
    return out.filter((p) => {
        const ms = Date.parse(p.gpsTime.replace(" ", "T") + "Z");
        return ms >= begin && ms <= until;
    });
};

export const riderLocationNow = (riderId: string) => {
    const r = RIDERS.find((x) => x.userId === riderId);
    if (!r) return { status: 404 as const };
    if (!r.deviceImei) return { status: 422 as const };
    const route = RIDER_ROUTES[riderId];
    const at = Date.now() - (route?.minutesBehind ?? 0) * 60_000;
    const angle = (at / 60_000 / 12) * Math.PI * 2 + riderId.length; // one lap every 12 minutes
    const base = {
        riderId: r.userId, riderName: r.name, riderPhoneNumber: r.phoneNumber, deviceImei: r.deviceImei,
        deviceStatus: route?.minutesBehind ? "OFFLINE" : "ONLINE",
    };
    if (!route || route.noFix) return { status: 200 as const, body: { ...base, located: false, accStatus: "OFF" } };
    return {
        status: 200 as const,
        body: {
            ...base,
            lat: +(route.lat + Math.sin(angle) * route.radius).toFixed(6),
            lng: +(route.lng + Math.cos(angle) * route.radius).toFixed(6),
            speed: route.minutesBehind ? 0 : 18 + Math.round(Math.abs(Math.sin(angle * 3)) * 22),
            accStatus: route.minutesBehind ? "OFF" : "ON",
            gpsTime: utcStamp(at),
            located: true,
        },
    };
};

// ── Users (admin user management) ───────────────────────────────
export const USERS = [
    ...Object.entries(DEMO_ACCOUNTS).map(([phoneNumber, a], i) => ({
        userId: `user-${i + 1}`, name: a.name, phoneNumber, email: a.email, role: a.role,
        deviceImei: RIDERS.find((r) => r.phoneNumber === phoneNumber)?.deviceImei as string | undefined,
    })),
    ...RIDERS.slice(1).map((r) => ({ userId: r.userId, name: r.name, phoneNumber: r.phoneNumber, email: r.email, role: "RIDER", deviceImei: r.deviceImei })),
    ...Array.from({ length: 8 }, (_, i) => ({
        userId: `user-x${i}`, name: person(), phoneNumber: phone(),
        email: undefined as string | undefined, role: pick(["FRONTDESK", "MANAGER", "CALLCENTER", "FRONTDESK"]),
    })),
].map((u, i) => {
    const o = i < 6 ? HOME_OFFICE : pick(OFFICES);
    return {
        ...u,
        status: i === 13 ? "SUSPENDED" : "ACTIVE",
        officeId: o.id,
        officeIds: [o.id],
        companyId: "company-demo",
        availability: true,
        createdAt: now - int(20, 300) * DAY,
        updatedAt: now - int(0, 20) * DAY,
    };
});

// ── Parcels ─────────────────────────────────────────────────────
type Stage = "shelf" | "called" | "assigned" | "delivered" | "returned" | "picked";

export interface MockParcel {
    parcelId: string;
    [key: string]: any;
}

const makeParcel = (i: number, stage: Stage, createdAt: number, office = HOME_OFFICE): MockParcel => {
    const homeDelivery = stage === "assigned" || stage === "delivered" || stage === "returned" || rand() < 0.4;
    const inboundCost = pick([10, 15, 20, 25, 30]);
    const deliveryCost = homeDelivery ? pick([15, 20, 25, 30, 35, 40]) : 0;
    const shelf = pick(SHELVES.filter((s) => s.office.id === office.id));
    const driverName = person();
    const pod = rand() < 0.25;
    const area = pick(AREAS);
    const place = AREA_PLACES[area];
    // ~1 in 8 home-delivery parcels predate the location feature and have no pin.
    const pinned = homeDelivery && rand() > 0.12;
    const landmark = pick(place.landmarks);
    return {
        parcelId: `PF${String(240000 + i * 37).padStart(6, "0")}`,
        senderName: person(),
        senderPhoneNumber: phone(),
        receiverName: person(),
        recieverPhoneNumber: phone(),
        alternativePhoneNumber: rand() < 0.3 ? phone() : undefined,
        receiverAddress: homeDelivery ? `${int(1, 60)} ${pick(STREETS)}, ${area}` : undefined,
        // Proposed backend fields (docs/BACKEND_HANDOFF.md)
        receiverLatitude: pinned ? +(place.lat + (rand() - 0.5) * 0.012).toFixed(6) : undefined,
        receiverLongitude: pinned ? +(place.lng + (rand() - 0.5) * 0.012).toFixed(6) : undefined,
        receiverLocationName: pinned ? `Near ${landmark}` : undefined,
        receiverLocationSource: pinned ? (rand() < 0.7 ? "SEARCH" : "MAP_PIN") : undefined,
        parcelDescription: pick(ITEMS),
        driverName,
        driverPhoneNumber: phone(),
        driverId: `drv-${int(1, 6)}`,
        vehicleNumber: pick(VEHICLES),
        inboundCost,
        pickUpCost: 0,
        deliveryCost,
        storageCost: rand() < 0.15 ? 5 : 0,
        itemCost: pod ? pick([120, 250, 400, 680, 1200]) : undefined,
        shelfNumber: shelf.name,
        shelfName: shelf.name,
        shelfId: shelf.id,
        officeId: office.id,
        companyId: "company-demo",
        pod,
        fragile: rand() < 0.15,
        homeDelivery,
        typeofParcel: pick(["PARCEL", "PARCEL", "PARCEL", "ONLINE"]),
        parcelWeight: Math.round((0.3 + rand() * 8) * 10) / 10,
        hasCalled: stage !== "shelf",
        inboudPayed: rand() < 0.7,
        parcelAssigned: stage === "assigned",
        delivered: stage === "delivered" || stage === "picked",
        pickedUp: stage === "picked",
        returned: stage === "returned",
        cancelled: false,
        returnCount: stage === "returned" ? 1 : 0,
        parcelStatus: stage === "delivered" || stage === "picked" ? "DELIVERD" : stage === "returned" ? "FAILED" : "RECEIVED",
        registeredDate: createdAt,
        createdAt,
        updatedAt: createdAt + int(1, 30) * HOUR,
        barCode: `PF${240000 + i * 37}`,
        images: [],
        imageUrls: [],
    };
};

const stages: Stage[] = [];
// A realistic mix for the home branch
for (let i = 0; i < 18; i++) stages.push("shelf");
for (let i = 0; i < 12; i++) stages.push("called");
for (let i = 0; i < 14; i++) stages.push("assigned");
for (let i = 0; i < 30; i++) stages.push("delivered");
for (let i = 0; i < 4; i++) stages.push("returned");
for (let i = 0; i < 10; i++) stages.push("picked");

export const PARCELS: MockParcel[] = stages.map((stage, i) => {
    const ageDays = stage === "assigned" ? 0 : stage === "shelf" ? int(0, 3) : int(0, 9);
    return makeParcel(i, stage, now - ageDays * DAY - int(1, 9) * HOUR);
});

// A few parcels at other branches so admin views look system-wide
OFFICES.slice(1).forEach((o, oi) => {
    for (let k = 0; k < 6; k++) {
        PARCELS.push(makeParcel(200 + oi * 10 + k, pick(["shelf", "delivered", "called", "picked"] as Stage[]), now - int(0, 8) * DAY, o));
    }
});

// ── Rider assignments ───────────────────────────────────────────
export interface MockAssignment {
    assignmentId: string;
    riderId: string;
    status: string;
    assignedAt: number;
    acceptedAt?: number;
    completedAt?: number;
    payed: boolean;
    paymentMethod?: string;
    returnReason?: string;
    /** Route plan confirmed when the parcels were assigned (handoff Part F). */
    routePlan?: Record<string, unknown>;
    /** What the manager recorded at reconciliation (handoff Part K). */
    amountPayed?: number;
    reconciliationLines?: Array<Record<string, unknown>>;
    parcels: MockParcel[];
}

export const ASSIGNMENTS: MockAssignment[] = [];

const homeParcels = PARCELS.filter((p) => p.officeId === HOME_OFFICE.id);
const assignedParcels = homeParcels.filter((p) => p.parcelAssigned);
const deliveredHomeParcels = homeParcels.filter((p) => (p.delivered && !p.pickedUp) || p.returned);

// Active: the logged-in demo rider (rider-1) gets six of today's parcels
assignedParcels.forEach((p, idx) => {
    const rider = idx < 6 ? RIDERS[0] : RIDERS[1 + (idx % 4)];
    const assignedAt = Math.max(startOfToday + 7 * HOUR + idx * 9 * 60 * 1000, now - 6 * HOUR);
    p.riderId = rider.userId;
    p.riderInfo = { riderId: rider.userId, riderName: rider.name, riderPhoneNumber: rider.phoneNumber };
    ASSIGNMENTS.push({
        assignmentId: `asg-${p.parcelId}`,
        riderId: rider.userId,
        status: idx % 3 === 0 ? "ASSIGNED" : "ACCEPTED",
        assignedAt,
        acceptedAt: assignedAt + 10 * 60 * 1000,
        payed: false,
        parcels: [p],
    });
});

// Completed: spread across riders and days. rider-1 gets a good history.
deliveredHomeParcels.forEach((p, idx) => {
    const rider = idx % 2 === 0 ? RIDERS[0] : RIDERS[1 + (idx % 4)];
    // First few of rider-1's are today so "today collected" has a value
    const dayOffset = idx < 6 ? 0 : idx < 16 ? 1 : int(2, 9);
    const assignedAt = startOfToday - dayOffset * DAY + int(8, 11) * HOUR;
    const completedAt = Math.min(assignedAt + int(1, 5) * HOUR, now - 5 * 60 * 1000);
    p.riderId = rider.userId;
    p.riderInfo = { riderId: rider.userId, riderName: rider.name, riderPhoneNumber: rider.phoneNumber };
    p.deliveryDate = completedAt;
    ASSIGNMENTS.push({
        assignmentId: `asg-${p.parcelId}`,
        riderId: rider.userId,
        status: p.returned ? "RETURNED" : "DELIVERED",
        assignedAt,
        acceptedAt: assignedAt + 5 * 60 * 1000,
        completedAt,
        payed: dayOffset > 1,
        paymentMethod: p.returned ? undefined : pick(["cash", "momo"]),
        parcels: [p],
    });
});

buildRiderTracks();

// Today's open deliveries for the demo rider get a planned order, as if the manager had
// confirmed a route when assigning them (straight-line estimate; no Google in demo mode).
{
    const open = ASSIGNMENTS.filter((a) => a.riderId === "rider-1" && (a.status === "ASSIGNED" || a.status === "ACCEPTED"));
    const station = { lat: OFFICE_POSITIONS["off-accra"][0], lng: OFFICE_POSITIONS["off-accra"][1] };
    const stops: PlanStop[] = open.flatMap((a) => a.parcels)
        .filter((p) => p.receiverLatitude != null)
        .map((p) => ({ id: p.parcelId, lat: p.receiverLatitude, lng: p.receiverLongitude, label: p.receiverName }));
    if (stops.length) {
        const plan = estimatePlan(orderStops(stops, station, station), station, station);
        const stored = {
            method: plan.method, stopOrder: plan.order,
            totalKm: Math.round(plan.totalKm * 10) / 10, totalMinutes: Math.round(plan.totalMinutes),
            legs: plan.legs, encodedPath: encodePolyline(plan.path),
            startLatitude: station.lat, startLongitude: station.lng, edited: false, plannedAt: open[0].assignedAt,
        };
        open.forEach((a) => (a.routePlan = stored));
    }
}

// Some past reconciliations where the manager recorded a difference (handoff Part K).
{
    const reasons = ["Customer paid less", "Rider short on cash", "Discount approved", "Overpaid / tip"];
    ASSIGNMENTS.filter((a) => a.payed && a.status === "DELIVERED").forEach((a, i) => {
        const lines = a.parcels.map((p) => {
            const system = (p.inboundCost || 0) + (p.pickUpCost || 0) + (p.deliveryCost || 0) + (p.storageCost || 0);
            const diff = i % 4 === 0 ? (reasons[i % reasons.length] === "Overpaid / tip" ? 5 : -5) : 0;
            return {
                parcelId: p.parcelId, systemAmount: system, collectedAmount: system + diff, variance: diff,
                ...(diff ? { varianceReason: reasons[i % reasons.length], varianceNote: i % 8 === 0 ? "Recipient said they'd pay the rest at the station" : undefined } : {}),
            };
        });
        a.reconciliationLines = lines;
        a.amountPayed = lines.reduce((s, l) => s + l.collectedAmount, 0);
    });
}

export const parcelAmount = (p: MockParcel) =>
    (p.inboundCost || 0) + (p.pickUpCost || 0) + (p.deliveryCost || 0) + (p.storageCost || 0);

// Field lists copied from the backend OpenAPI spec (/shortly/v3/api-docs).
// Responses are trimmed to these so the mock can't hide a field the real API lacks.
const PARCEL_FIELDS = ["parcelId", "barCode", "parcelDescription", "inboundCost", "deliveryCost", "storageCost", "hasCalled", "pickedUp", "driverId", "officeId", "companyId", "paymentMethod", "driverName", "driverPhoneNumber", "vehicleNumber", "senderName", "senderPhoneNumber", "receiverName", "receiverAddress", "recieverPhoneNumber", "alternativePhoneNumber", "shelfName", "inboudPayed", "shelfId", "homeDelivery", "returnCount", "riderId", "riderInfo", "typeofParcel", "from", "to", "fromOfficeId", "toOfficeId", "hasArrivedAtOffice", "parcelTransfer", "pickupAddress", "pickupContactName", "pickupContactPhoneNumber", "pickupInstructions", "deliveryAddress", "deliveryContactName", "deliveryContactPhoneNumber", "specialInstructions", "pickUpCost", "parcelStatus", "imageUrls", "vendorName", "vendorId", "vendorDeliveryFee", "numberOfItems", "itemQuantity", "parcelWeight", "createdAt", "updatedAt", "callerName", "callerPhoneNumber", "notes", "hasCallCenterSpokenToClient", "callOutCome", "callCenterRemark", "pod", "delivered", "parcelAssigned", "itemCost", "vendorPayed", "fragile", "itemOwnerPaid",
    // Proposed: pinned delivery location (docs/BACKEND_HANDOFF.md)
    "receiverLatitude", "receiverLongitude", "receiverLocationName", "receiverPlaceId", "receiverLocationSource"];
const PARCEL_INFO_FIELDS = ["parcelId", "receiverName", "receiverPhoneNumber", "alternativePhoneNumber", "receiverAddress", "senderName", "senderPhoneNumber", "parcelAmount", "parcelWeight", "payed", "returned", "delivered", "paymentMethod", "inboundCost", "deliveryCost", "imageUrls", "storageCost", "pickUpCost", "pickedUp", "homeDelivery", "vehicleNumber", "driverName", "driverPhoneNumber", "driverId", "officeId", "shelfName", "inboudPayed", "shelfId", "typeofParcel", "pickupAddress", "pickupContactName", "pickupContactPhoneNumber", "pickupInstructions", "deliveryAddress", "deliveryContactName", "deliveryContactPhoneNumber", "specialInstructions", "pod", "itemCost", "fragile",
    // Proposed: pinned delivery location (docs/BACKEND_HANDOFF.md)
    "receiverLatitude", "receiverLongitude", "receiverLocationName"];
export const USER_FIELDS = ["userId", "name", "officeId", "companyId", "phoneNumber", "email", "availability", "status", "officeIds", "role", "departmentRole", "deviceImei", "createdAt", "updatedAt"];

export const only = (obj: Record<string, any>, fields: string[]) =>
    Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

export const serializeParcel = (p: MockParcel) => only(p, PARCEL_FIELDS);

const serializeParcelInfo = (p: MockParcel, a?: MockAssignment) =>
    only({ ...p, receiverPhoneNumber: p.recieverPhoneNumber, parcelAmount: parcelAmount(p), payed: a?.payed, paymentMethod: a?.paymentMethod }, PARCEL_INFO_FIELDS);

const riderInfo = (riderId: string) => {
    const r = RIDERS.find((x) => x.userId === riderId)!;
    return { riderId: r.userId, riderName: r.name, riderPhoneNumber: r.phoneNumber, stationName: HOME_OFFICE.name };
};

/** Shape of DeliveryAssignments in the spec. */
export const serializeAssignment = (a: MockAssignment) => ({
    assignmentId: a.assignmentId,
    riderInfo: riderInfo(a.riderId),
    parcels: a.parcels.map((p) => serializeParcelInfo(p, a)),
    officeId: HOME_OFFICE.id,
    companyId: "company-demo",
    status: a.status,
    assignedAt: a.assignedAt,
    acceptedAt: a.acceptedAt,
    completedAt: a.completedAt,
    payementMethod: a.paymentMethod,
    payed: a.payed,
    amount: a.parcels.reduce((s, p) => s + parcelAmount(p), 0),
    inboundCost: a.parcels.reduce((s, p) => s + (p.inboundCost || 0), 0),
    deliveryCost: a.parcels.reduce((s, p) => s + (p.deliveryCost || 0), 0),
    returnReason: a.returnReason,
    amountPayed: a.amountPayed ?? (a.payed ? a.parcels.reduce((s, p) => s + parcelAmount(p), 0) : undefined),
    reconciliationLines: a.reconciliationLines,
    payedAt: a.payed ? a.completedAt : undefined,
    createdAt: a.assignedAt,
    updatedAt: a.completedAt ?? a.acceptedAt ?? a.assignedAt,
    routePlan: a.routePlan,
});

// ── Driver (inbound) assignments for the driver tracker ─────────
export const DRIVER_ASSIGNMENTS = homeParcels
    .filter((p) => !p.inboudPayed)
    .map((p, i) => ({
        id: `drva-${i}`,
        driverName: p.driverName,
        driverPhoneNumber: p.driverPhoneNumber,
        officeId: HOME_OFFICE.id,
        parcelId: p.parcelId,
        parcelInfo: serializeParcelInfo(p),
        payed: false,
        amount: p.inboundCost,
        delivered: !!p.delivered,
        createdAt: p.createdAt,
    }));

// ── Transfers ───────────────────────────────────────────────────
const transfer = (i: number, from: (typeof OFFICES)[number], to: (typeof OFFICES)[number]) => ({
    ...makeParcel(500 + i, "shelf", now - int(0, 3) * DAY, from),
    parcelTransfer: true,
    fromOfficeId: from.id,
    toOfficeId: to.id,
    destinationOfficeId: to.id,
    from: { officeId: from.id, officeName: from.name },
    to: { officeId: to.id, officeName: to.name },
    typeofParcel: "TRANSFER",
    hasArrivedAtOffice: false,
});
export const INCOMING_TRANSFERS = Array.from({ length: 5 }, (_, i) => transfer(i, OFFICES[1 + (i % 4)], HOME_OFFICE));
export const OUTGOING_TRANSFERS = Array.from({ length: 4 }, (_, i) => transfer(10 + i, HOME_OFFICE, OFFICES[1 + (i % 4)]));

// ── Fuel requests ───────────────────────────────────────────────
export const FUEL_REQUESTS = Array.from({ length: 7 }, (_, i) => {
    const rider = RIDERS[i % RIDERS.length];
    const createdAt = now - i * 1.3 * DAY - int(1, 5) * HOUR;
    return {
        id: `fuel-${i}`,
        status: (["PENDING", "APPROVED", "APPROVED", "APPROVED", "REJECTED", "APPROVED", "APPROVED"] as const)[i],
        riderInfo: { riderId: rider.userId, riderName: rider.name, riderPhoneNumber: rider.phoneNumber, stationName: HOME_OFFICE.name },
        officeId: HOME_OFFICE.id,
        station: pick(["Shell Ring Road", "GOIL Airport", "Total Osu", "Star Oil Madina"]),
        notes: i === 0 ? "Running low before afternoon route" : "",
        tank: pick(["FULL_TANK", "HALF_TANK", "LITRES"]),
        amount: i === 0 ? null : pick([80, 120, 150, 200]),
        fuleStationPhoneNumber: phone(),
        attendantPhoneNumber: phone(),
        createdAt,
        updatedAt: createdAt + 2 * HOUR,
    };
});

// ── Addresses (delivery zones & prices) ─────────────────────────
export const ADDRESSES = AREAS.map((name, i) => ({ id: `addr-${i + 1}`, name, officeId: HOME_OFFICE.id, cost: [20, 25, 30, 35, 40][i % 5] }));

// ── Audit log ───────────────────────────────────────────────────
export const USER_ACTIONS = Array.from({ length: 40 }, (_, i) => {
    const u = pick(USERS);
    return {
        id: `act-${i}`,
        userId: u.userId,
        userName: u.name,
        role: u.role,
        action: pick(["LOGIN", "CREATE_PARCEL", "UPDATE_PARCEL", "ASSIGN_PARCEL", "RECONCILE", "DELIVER_PARCEL"]),
        description: pick(["Registered parcel", "Updated shelf location", "Assigned 4 parcels to rider", "Reconciled rider payments", "Signed in"]),
        officeId: u.officeId,
        createdAt: now - i * 47 * 60 * 1000,
        timestamp: now - i * 47 * 60 * 1000,
    };
});
