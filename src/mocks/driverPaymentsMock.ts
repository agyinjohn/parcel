/**
 * Sample-data answers for driver payments (handoff Part M), built from the mock driver fees so
 * `npm run dev:mock` can show the Driver Payments page. Mirrors the backend-test API shapes.
 */
type Handler = (ctx: { params: URLSearchParams; body: any; match: RegExpMatchArray; config?: any }) => unknown;
type On = (method: string, pattern: RegExp, handler: Handler) => void;

interface Ctx {
    driverAssignments: any[];
    findParcel: (id: string) => any;
    officeId: string;
    page: <T>(items: T[], params: URLSearchParams) => unknown;
    now?: () => number;
}

const DAY = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const digits = (p?: string) => (p ?? "").replace(/\D/g, "").replace(/^233/, "0");
const localDay = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface MockPayout { [k: string]: any }
export interface MockAdjustment { [k: string]: any }

/** Shared with the counter cash-up handlers: cash paid to drivers comes out of the drawer. */
export const DRIVER_CASH = { payouts: [] as MockPayout[], adjustments: [] as MockAdjustment[] };

export const registerDriverPayments = (on: On, ctx: Ctx) => {
    const now = ctx.now ?? Date.now;
    // ── Seed drivers, trips and fee lines ──────────────────────
    const drivers: any[] = [];
    const byPhone = new Map<string, any>();
    const trips: any[] = [];
    const lines: any[] = [];
    const holds = new Map<string, { reason: string; at: number }>();
    const payouts = DRIVER_CASH.payouts;
    const adjustments = DRIVER_CASH.adjustments;
    const networks = ["MTN", "TELECEL", "MTN", "AIRTELTIGO"];

    // Sample parcels each have a random driver; fold them into a few regular drivers so statements look real.
    const pool = ctx.driverAssignments.slice(0, 5).map((a) => ({ phone: digits(a.driverPhoneNumber) || "0240000000", name: a.driverName }));
    ctx.driverAssignments.forEach((a, idx) => {
        const who = pool[idx % Math.max(1, pool.length)];
        a.driverPhoneNumber = who.phone;
        a.driverName = who.name;
        const phone = who.phone;
        let d = byPhone.get(phone);
        if (!d) {
            const i = drivers.length;
            d = {
                id: `drv-${i + 1}`, officeIds: [ctx.officeId], name: a.driverName || `Driver ${i + 1}`, phoneNumbers: [phone],
                momoNumber: i % 3 === 2 ? undefined : phone, momoNetwork: i % 3 === 2 ? undefined : networks[i % networks.length],
                vehicles: [], company: i === 3 ? "STC Courier" : undefined, status: "ACTIVE", createdAt: now() - 60 * DAY,
            };
            drivers.push(d);
            byPhone.set(phone, d);
        }
        const p = ctx.findParcel(a.parcelId);
        const vehicle = d.vehicles[0] ?? (p?.vehicleNumber || a.parcelInfo?.vehicleNumber || "Unknown");
        if (vehicle && !d.vehicles.includes(vehicle)) d.vehicles.push(vehicle);
        const minute = Math.floor((a.createdAt ?? now()) / DAY); // one trip per driver, vehicle and day
        let t = trips.find((x) => x.driverId === d.id && x.vehicleNumber === vehicle && x._minute === minute);
        if (!t) {
            const dayStart = new Date(a.createdAt ?? now()); dayStart.setHours(6, 40 + (trips.length % 5) * 7, 0, 0);
            t = { tripId: `trip-${trips.length + 1}`, driverId: d.id, driverName: d.name, vehicleNumber: vehicle, origin: ["Kumasi", "Takoradi", "Ho", "Tamale", "Cape Coast"][drivers.indexOf(d) % 5], arrivedAt: Math.min(dayStart.getTime(), a.createdAt ?? now()), receivedByName: "Akosua Boateng", _minute: minute, note: undefined };
            trips.push(t);
        }
        lines.push({ id: a.id, parcelId: a.parcelId, tripId: t.tripId, driverId: d.id, amount: a.amount || 0, payoutId: undefined as string | undefined });
    });
    trips.forEach((t, i) => {
        const n = lines.filter((l) => l.tripId === t.tripId).length;
        t.receivedCount = n;
        t.declaredCount = i === 1 ? n + 1 : n; // one trip arrives a parcel short
    });

    const lineState = (l: any) => {
        const p = ctx.findParcel(l.parcelId);
        if (l.payoutId) return { state: "PAID" };
        if (holds.has(l.id)) return { state: "ON_HOLD", holdReason: holds.get(l.id)!.reason };
        if (p?.returned) return { state: "NOT_PAYABLE" };
        if (p?.pickedUp) return { state: "READY", readyReason: "PICKED_UP", readyAt: p.updatedAt ?? p.createdAt };
        if (p?.delivered) return { state: "READY", readyReason: "DELIVERED", readyAt: p.updatedAt ?? p.createdAt };
        return { state: "WAITING" };
    };
    const lineOut = (l: any) => {
        const p = ctx.findParcel(l.parcelId);
        return { id: l.id, parcelId: l.parcelId, receiverName: p?.receiverName, amount: l.amount, shelfName: p?.shelfName, payoutId: l.payoutId, ...lineState(l) };
    };
    const tripOut = (t: any) => {
        const ls = lines.filter((l) => l.tripId === t.tripId).map(lineOut);
        const { _minute, ...rest } = t;
        return {
            ...rest,
            feeTotal: round2(ls.reduce((s, l) => s + l.amount, 0)),
            readyAmount: round2(ls.filter((l) => l.state === "READY").reduce((s, l) => s + l.amount, 0)),
            fullyPaid: ls.length > 0 && ls.every((l) => l.state === "PAID" || l.state === "NOT_PAYABLE"),
            flagged: (t.receivedCount ?? 0) < (t.declaredCount ?? 0),
            lines: ls,
        };
    };
    const balances = (driverId: string) => {
        const ls = lines.filter((l) => l.driverId === driverId).map(lineOut);
        const sum = (st: string) => round2(ls.filter((l) => l.state === st).reduce((s, l) => s + l.amount, 0));
        const count = (st: string) => ls.filter((l) => l.state === st).length;
        const paid30 = payouts.filter((p) => p.driverId === driverId && !p.reversed && (p.paidAt ?? 0) > now() - 30 * DAY).reduce((s, p) => s + p.netAmount, 0);
        return { readyAmount: sum("READY"), readyCount: count("READY"), waitingAmount: sum("WAITING"), waitingCount: count("WAITING"), onHoldAmount: sum("ON_HOLD"), onHoldCount: count("ON_HOLD"), paidLast30Days: round2(paid30) };
    };
    const findDriver = (id: string) => {
        const d = drivers.find((x) => x.id === id);
        if (!d) throw { status: 404, message: "Driver not found" };
        return d;
    };

    // Seed one paid-out trip yesterday so history isn't empty.
    const seedDriver = drivers[1];
    if (seedDriver) {
        const ready = lines.filter((l) => l.driverId === seedDriver.id && lineState(l).state === "READY").slice(0, 2);
        if (ready.length) {
            const gross = round2(ready.reduce((s, l) => s + l.amount, 0));
            const p = {
                id: "po-1", receiptNo: "DP-00412", officeId: ctx.officeId, driverId: seedDriver.id, driverName: seedDriver.name, driverPhone: seedDriver.phoneNumbers[0],
                lineIds: ready.map((l) => l.id), tripCount: new Set(ready.map((l) => l.tripId)).size, adjustments: [], grossAmount: gross, deductions: 0, bonuses: 0, netAmount: gross,
                paymentMethod: "CASH", paidByName: "Kofi Mensah", paidAt: now() - DAY, businessDate: localDay(now() - DAY), confirmed: true, confirmedAt: now() - DAY + 120000, reversed: false,
            };
            ready.forEach((l) => (l.payoutId = p.id));
            payouts.push(p);
        }
        adjustments.push({ id: "adj-1", driverId: drivers[0]?.id, officeId: ctx.officeId, type: "ADVANCE", amount: 50, reason: "Fuel advance", paymentMethod: "CASH", businessDate: localDay(now() - 3 * DAY), open: true, repaidAmount: 0, createdAt: now() - 3 * DAY, createdByName: "Kofi Mensah" });
    }

    registerDriverReports(on, ctx, { drivers, trips, lines, lineState, tripOut });

    // ── Handlers ───────────────────────────────────────────────
    on("get", /^\/api-frontdesk\/driver-payments\/summary$/, () => {
        const all = lines.map((l) => ({ ...lineOut(l), driverId: l.driverId }));
        const weekAgo = now() - 7 * DAY;
        const week = payouts.filter((p) => !p.reversed && (p.paidAt ?? 0) > weekAgo);
        const weekAmt = week.reduce((s, p) => s + p.netAmount, 0);
        const momoAmt = week.filter((p) => p.paymentMethod === "MOMO").reduce((s, p) => s + p.netAmount, 0);
        const sum = (st: string) => round2(all.filter((l) => l.state === st).reduce((s, l) => s + l.amount, 0));
        return {
            readyAmount: sum("READY"), readyDrivers: new Set(all.filter((l) => l.state === "READY").map((l) => l.driverId)).size,
            waitingAmount: sum("WAITING"), waitingParcels: all.filter((l) => l.state === "WAITING").length,
            paidThisWeekAmount: round2(weekAmt), paidThisWeekCount: week.length, paidThisWeekMomoPercent: weekAmt ? Math.round((momoAmt / weekAmt) * 100) : 0,
            onHoldAmount: sum("ON_HOLD"), onHoldCount: all.filter((l) => l.state === "ON_HOLD").length,
        };
    });

    on("get", /^\/api-frontdesk\/driver-balances$/, ({ params }) => {
        const q = (params.get("search") ?? "").toLowerCase();
        const state = params.get("state") ?? "READY";
        const rows = drivers
            .filter((d) => !q || d.name.toLowerCase().includes(q) || d.phoneNumbers.some((p: string) => p.includes(q.replace(/\D/g, "") || "~")) || d.vehicles.some((v: string) => v.toLowerCase().includes(q)))
            .map((d) => {
                const b = balances(d.id);
                const last = Math.max(0, ...trips.filter((t) => t.driverId === d.id).map((t) => t.arrivedAt ?? 0));
                return { driverId: d.id, name: d.name, phone: d.phoneNumbers[0], vehicles: d.vehicles, company: d.company, readyAmount: b.readyAmount, readyCount: b.readyCount, waitingAmount: b.waitingAmount, onHoldAmount: b.onHoldAmount, paidLast30Days: b.paidLast30Days, lastTripAt: last || undefined };
            })
            .filter((r) => (state === "READY" ? r.readyAmount > 0 : state === "ON_HOLD" ? r.onHoldAmount > 0 : true))
            .sort((a, b) => b.readyAmount - a.readyAmount);
        return ctx.page(rows, params);
    });

    on("get", /^\/api-frontdesk\/drivers\/([^/]+)\/statement$/, ({ match, params }) => {
        const d = findDriver(match[1]);
        const from = Number(params.get("from")) || 0;
        // `from` limits only paid history: a trip with any unpaid fee is always included.
        const keep = (t: any) => (t.arrivedAt ?? 0) >= from || tripOut(t).lines.some((l: any) => l.state !== "PAID" && l.state !== "NOT_PAYABLE");
        return {
            driver: d,
            balances: balances(d.id),
            trips: trips.filter((t) => t.driverId === d.id && keep(t)).sort((a, b) => (b.arrivedAt ?? 0) - (a.arrivedAt ?? 0)).map(tripOut),
            payouts: payouts.filter((p) => p.driverId === d.id).sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0)),
            openAdjustments: adjustments.filter((a) => a.driverId === d.id && a.open),
        };
    });

    on("get", /^\/api-frontdesk\/drivers$/, ({ params }) => {
        const q = (params.get("search") ?? "").toLowerCase();
        return ctx.page(drivers.filter((d) => !q || d.name.toLowerCase().includes(q) || d.phoneNumbers.join(" ").includes(q) || d.vehicles.join(" ").toLowerCase().includes(q)), params);
    });
    on("post", /^\/api-frontdesk\/drivers$/, ({ body }) => {
        if (!body?.name || !(body?.phoneNumbers ?? []).length) throw { status: 400, message: "Name and phone are required" };
        const d = { id: `drv-${drivers.length + 1}`, officeIds: [ctx.officeId], status: "ACTIVE", createdAt: now(), vehicles: [], ...body, phoneNumbers: body.phoneNumbers.map(digits) };
        drivers.push(d);
        return d;
    });
    on("put", /^\/api-frontdesk\/drivers\/([^/]+)$/, ({ match, body }) => {
        const d = findDriver(match[1]);
        Object.assign(d, body, { phoneNumbers: (body?.phoneNumbers ?? d.phoneNumbers).map(digits), updatedAt: now() });
        trips.filter((t) => t.driverId === d.id).forEach((t) => (t.driverName = d.name));
        return d;
    });

    on("get", /^\/api-frontdesk\/drivers\/([^/]+)\/adjustments$/, ({ match, params }) =>
        adjustments.filter((a) => a.driverId === match[1] && (params.get("open") !== "true" || a.open)));
    on("post", /^\/api-frontdesk\/drivers\/([^/]+)\/adjustments$/, ({ match, body }) => {
        findDriver(match[1]);
        if (!(Number(body?.amount) > 0)) throw { status: 400, message: "Amount must be positive" };
        const a = { id: `adj-${adjustments.length + 1}`, driverId: match[1], officeId: ctx.officeId, type: body.type, amount: Number(body.amount), reason: body.reason, parcelId: body.parcelId, paymentMethod: body.type === "ADVANCE" ? body.paymentMethod ?? "CASH" : undefined, businessDate: localDay(now()), open: true, repaidAmount: 0, createdAt: now(), createdByName: "Kofi Mensah" };
        adjustments.push(a);
        return a;
    });

    on("get", /^\/api-frontdesk\/driver-trips$/, ({ params }) => {
        const from = Number(params.get("from")) || 0;
        const to = Number(params.get("to")) || Infinity;
        const driverId = params.get("driverId");
        return trips.filter((t) => (!driverId || t.driverId === driverId) && (t.arrivedAt ?? 0) >= from && (t.arrivedAt ?? 0) <= to).map(tripOut);
    });

    on("put", /^\/api-frontdesk\/driver-fee-lines\/([^/]+)\/hold$/, ({ match, body }) => {
        const l = lines.find((x) => x.id === match[1]);
        if (!l) throw { status: 404, message: "Fee line not found" };
        if (!body?.reason) throw { status: 400, message: "A reason is required" };
        holds.set(l.id, { reason: body.reason, at: now() });
        return lineOut(l);
    });
    on("put", /^\/api-frontdesk\/driver-fee-lines\/([^/]+)\/release$/, ({ match }) => {
        holds.delete(match[1]);
        const l = lines.find((x) => x.id === match[1]);
        return l ? lineOut(l) : undefined;
    });

    on("get", /^\/api-frontdesk\/driver-payouts$/, ({ params }) => {
        const from = Number(params.get("from")) || 0;
        const to = Number(params.get("to")) || Infinity;
        return payouts.filter((p) => (p.paidAt ?? 0) >= from && (p.paidAt ?? 0) <= to && (!params.get("driverId") || p.driverId === params.get("driverId")) && (params.get("unconfirmed") !== "true" || (!p.confirmed && !p.reversed)));
    });
    on("get", /^\/api-frontdesk\/driver-payouts\/([^/]+)$/, ({ match }) => payouts.find((p) => p.id === match[1]) ?? undefined);
    const seenKeys = new Map<string, any>();
    on("post", /^\/api-frontdesk\/driver-payouts$/, ({ body, config }) => {
        // Idempotency-Key: a retried payout returns the first result instead of paying twice.
        const key = config?.headers?.["Idempotency-Key"] ?? config?.headers?.get?.("Idempotency-Key");
        if (key && seenKeys.has(key)) return seenKeys.get(key);
        const d = findDriver(body?.driverId);
        if (d.status === "BLOCKED") throw { status: 409, message: "This driver is blocked" };
        const chosen = (body?.lineIds ?? []).map((id: string) => lines.find((l) => l.id === id));
        if (!chosen.length || chosen.some((l: any) => !l || l.driverId !== d.id || lineState(l).state !== "READY")) throw { status: 409, message: "Some parcels aren't ready to pay" };
        if (body.paymentMethod === "MOMO" && !body.momoReference) throw { status: 400, message: "MoMo transaction ID is required" };
        const adj = (body.adjustments ?? []) as any[];
        const gross = round2(chosen.reduce((s: number, l: any) => s + l.amount, 0));
        const deductions = round2(adj.filter((a) => a.type !== "BONUS").reduce((s, a) => s + Number(a.amount), 0));
        const bonuses = round2(adj.filter((a) => a.type === "BONUS").reduce((s, a) => s + Number(a.amount), 0));
        const net = round2(gross - deductions + bonuses);
        if (net < 0) throw { status: 400, message: "Deductions are more than the amount owed" };
        if (body.expectedNetAmount != null && Math.abs(Number(body.expectedNetAmount) - net) > 0.009)
            throw { status: 409, message: `The total is now GHC ${net.toFixed(2)}, not GHC ${Number(body.expectedNetAmount).toFixed(2)}` };
        for (const a of adj.filter((x) => x.adjustmentId)) {
            const o = adjustments.find((x) => x.id === a.adjustmentId);
            if (!o || !o.open) throw { status: 409, message: "An advance or adjustment was already settled" };
            if (o.type === "ADVANCE" && Number(a.amount) > round2(o.amount - (o.repaidAmount || 0)) + 0.009) throw { status: 409, message: "That's more than the advance still owed" };
        }
        const p: MockPayout = {
            id: `po-${payouts.length + 1}`, receiptNo: `DP-${String(412 + payouts.length).padStart(5, "0")}`, officeId: ctx.officeId, driverId: d.id, driverName: d.name, driverPhone: d.phoneNumbers[0],
            lineIds: chosen.map((l: any) => l.id), tripCount: new Set(chosen.map((l: any) => l.tripId)).size, adjustments: adj, grossAmount: gross, deductions, bonuses, netAmount: net,
            paymentMethod: body.paymentMethod, momoNumber: body.momoNumber, momoReference: body.momoReference, note: body.note, businessDate: localDay(now()), paidByName: "Kofi Mensah", paidAt: now(), confirmed: false, reversed: false,
        };
        chosen.forEach((l: any) => (l.payoutId = p.id));
        adj.filter((a) => a.adjustmentId).forEach((a) => {
            const o = adjustments.find((x) => x.id === a.adjustmentId);
            if (o) { o.repaidAmount = round2((o.repaidAmount || 0) + Number(a.amount)); o.open = o.type === "ADVANCE" ? o.repaidAmount < o.amount : false; o.appliedPayoutId = p.id; }
        });
        const b = balances(d.id);
        p.balanceReadyAfter = b.readyAmount;
        p.balanceWaitingAfter = b.waitingAmount;
        payouts.push(p);
        if (key) seenKeys.set(key, p);
        // Test hook (sample data only): record the payout, then lose the reply like a dropped connection.
        if ((globalThis as any).__mockDropPayoutReply) { (globalThis as any).__mockDropPayoutReply = false; throw new Error("Network Error"); }
        return p;
    });
    on("post", /^\/api-frontdesk\/driver-payouts\/([^/]+)\/send-code$/, ({ match }) => {
        const p = payouts.find((x) => x.id === match[1]);
        if (!p) throw { status: 404, message: "Payout not found" };
        p._code = "4812"; // sample data: the "SMS" code is always 4812
        return { message: "Code sent" };
    });
    on("put", /^\/api-frontdesk\/driver-payouts\/([^/]+)\/confirm$/, ({ match, body }) => {
        const p = payouts.find((x) => x.id === match[1]);
        if (!p) throw { status: 404, message: "Payout not found" };
        if (!p._code || body?.code !== p._code) throw { status: 400, message: "That code didn't match. Send a new one if needed." };
        Object.assign(p, { confirmed: true, confirmedAt: now() });
        return p;
    });
    on("post", /^\/api-frontdesk\/driver-payouts\/([^/]+)\/reverse$/, ({ match, body }) => {
        const p = payouts.find((x) => x.id === match[1]);
        if (!p) throw { status: 404, message: "Payout not found" };
        if (!body?.reason) throw { status: 400, message: "A reason is required" };
        if (p.reversed) throw { status: 409, message: "This payout was already reversed" };
        Object.assign(p, { reversed: true, reversedReason: body.reason, reversedAt: now(), reversedByName: "Kofi Mensah" });
        lines.filter((l) => l.payoutId === p.id).forEach((l) => (l.payoutId = undefined));
        // Undo what the payout settled: advance repayments and saved deductions/bonuses reopen.
        (p.adjustments ?? []).filter((a: any) => a.adjustmentId).forEach((a: any) => {
            const o = adjustments.find((x) => x.id === a.adjustmentId);
            if (!o) return;
            o.repaidAmount = round2(Math.max(0, (o.repaidAmount || 0) - Number(a.amount)));
            o.open = true;
            o.appliedPayoutId = undefined;
        });
        return p;
    });
};

/** Admin reports on driver payments (handoff M8). Registered by registerDriverPayments. */
const registerDriverReports = (on: On, ctx: Ctx, data: { drivers: any[]; trips: any[]; lines: any[]; lineState: (l: any) => any; tripOut: (t: any) => any }) => {
    const now = ctx.now ?? Date.now;
    const inDays = (day?: string, from?: string | null, to?: string | null) => !!day && (!from || day >= from) && (!to || day <= to);
    on("get", /^\/api-admin\/driver-payouts\/summary$/, ({ params }) => {
        const list = DRIVER_CASH.payouts.filter((p) => !p.reversed && inDays(p.businessDate, params.get("from"), params.get("to")) && (!params.get("officeId") || p.officeId === params.get("officeId")));
        const total = (rows: any[], key: Record<string, unknown>) => ({
            ...key, payouts: rows.length, gross: round2(rows.reduce((s, p) => s + p.grossAmount, 0)), deductions: round2(rows.reduce((s, p) => s + (p.deductions || 0), 0)),
            bonuses: round2(rows.reduce((s, p) => s + (p.bonuses || 0), 0)), net: round2(rows.reduce((s, p) => s + p.netAmount, 0)),
            cash: round2(rows.filter((p) => p.paymentMethod === "CASH").reduce((s, p) => s + p.netAmount, 0)), momo: round2(rows.filter((p) => p.paymentMethod === "MOMO").reduce((s, p) => s + p.netAmount, 0)),
            unconfirmed: rows.filter((p) => !p.confirmed).length,
        });
        const offices = [...new Set(list.map((p) => p.officeId))];
        const drivers = [...new Set(list.map((p) => p.driverId))];
        return {
            byStation: offices.map((o) => total(list.filter((p) => p.officeId === o), { officeId: o })),
            byDriver: drivers.map((d) => { const rows = list.filter((p) => p.driverId === d); return total(rows, { driverId: d, driverName: rows[0]?.driverName, officeId: rows[0]?.officeId }); }),
        };
    });
    on("get", /^\/api-admin\/driver-fee-lines\/long-waiting$/, ({ params }) => {
        const days = Number(params.get("days")) || 7;
        return data.lines
            .map((l) => ({ l, st: data.lineState(l) }))
            .filter(({ st }) => st.state === "READY" && (st.readyAt ?? now()) < now() - days * DAY)
            .map(({ l, st }) => {
                const d = data.drivers.find((x) => x.id === l.driverId);
                return { id: l.id, driverId: l.driverId, driverName: d?.name, driverPhoneNumber: d?.phoneNumbers?.[0], officeId: ctx.officeId, parcelId: l.parcelId, amount: l.amount, state: "READY", readyAt: st.readyAt, readyReason: st.readyReason, tripId: l.tripId };
            });
    });
    on("get", /^\/api-admin\/driver-trips\/missing-parcels$/, ({ params }) =>
        data.trips.filter((t) => (t.receivedCount ?? 0) < (t.declaredCount ?? 0) && inDays(localDay(t.arrivedAt ?? 0), params.get("from"), params.get("to"))).map(data.tripOut));
};

/** Cash that went out to drivers on a day (for the counter cash-up). */
export const driverCashOn = (day: string) => ({
    payouts: DRIVER_CASH.payouts.filter((p) => p.paymentMethod === "CASH" && !p.reversed && p.businessDate === day),
    advances: DRIVER_CASH.adjustments.filter((a) => a.type === "ADVANCE" && a.paymentMethod === "CASH" && a.businessDate === day),
});
