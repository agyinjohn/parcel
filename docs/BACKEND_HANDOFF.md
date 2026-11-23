# Backend handoff: delivery locations, rider tracking and frontend fixes

This document lists everything the frontend on branch `claude/wonderful-euler-xq7xir` now sends to or expects from the backend (the Shortly API, `/shortly`). It was written against the API description at `/shortly/v3/api-docs`.

Items are grouped by priority:

- **Part A** is required: without it, the new delivery-location features save nothing and show nothing.
- **Part B** is about access and request volume for the rider map pages.
- **Part C** lists calls the frontend makes that are missing from the API description.
- **Part D** is recommended: server-side delivery checks for reports and audits.
- **Part E** covers off-task detection (detours and stops away from the day's deliveries). It needs station coordinates and extends Part D.
- **Part F** covers route plans: the best stop order worked out when parcels are assigned, saved with the assignment and given to the rider.
- **Part G** lists every screen that still runs on placeholder or browser-only data, and what each needs from the backend.
- **Part H** is the plan for fuel management (requests, dispensing, receipts, consumption, limits), including fuel accountability: what each rider should use for their planned routes against what they used.
- **Part I** is the plan for motorbike fleet maintenance (bikes, service schedules, repairs, defects, documents).
- **Part J** covers the per-station pickup charge (frontend done; needs the fields and one endpoint).
- **Part K** covers reconciliation with actual amounts and variance reasons (frontend done; needs storage).

To see the exact request and response shapes the frontend expects, run the frontend with `npm run dev:mock`. That mode answers every call from sample data in `src/mocks/`, using only the fields listed here. The field whitelists are in `src/mocks/mockData.ts` (`PARCEL_FIELDS`, `PARCEL_INFO_FIELDS`, `USER_FIELDS`).

---

## Status on `backend-test` (checked 23 Nov 2026)

The API description at `https://backend-test.mandmservicescorp.org/shortly/v3/api-docs` was compared with this document. The frontend's test build (`npm run build:test`, which sets `VITE_API_VERSION=2`) uses the new shapes. The production build still uses the current backend's shapes until these changes reach `backend-new`.

**In place:**
- **A:** delivery pin fields on parcels, parcel creation and parcel updates.
- **B:** `GET /riders/locations` returns every rider at once.
- **C:** the missing endpoints, plus location delete.
- **D and E:** server-side `delivery-check` and its daily summary; station coordinates; the position where each delivery was marked done.
- **F:** `routePlan` on assignments.
- **G5:** station delete, and station `code` can be edited.
- **J:** pickup charge.
- **K1 and K2:** reconciliation lines, `varianceAmount`, and who reconciled.

**Changed in a way the frontend had to follow:** these work in the test build.
- `POST /reconcilation-parcels` takes `{ "items": [ … ] }` with numeric `reconciledAt` and `payedAmount`.
- `UserRegistrationRequest` takes a single `officeId`, and `departmentRole` was removed.

**Please confirm these are intended:**
- `POST /api-company/register`, `/verify-email` and `/resend-verification` were removed. The frontend's Signup and Verify Email pages use them.
- `companyId` was removed from most records and from the login response, and `SUPERADMIN` from the user roles. Is multi-company support being dropped?
- The `search` filter was removed from `GET /api-admin/parcels` and `GET /api-frontdesk/parcels`. The frontend doesn't use it today.

**Not yet:**
- **G1–G4:** notifications, the settings currently saved only in the browser, the finance and tenant endpoints, and rider earnings.
- **H:** fuel management and fuel accountability.
- **I:** motorbike maintenance.
- **K3:** the variance report and rider shortfall balance.

---

## Part A: Delivery location on parcels (required)

### Why

When **Home Delivery** is switched on at parcel intake, staff must now choose where the parcel is going. They either pick a Google Places suggestion (a landmark or business in Ghana) or drop a pin on a map. The frontend sends the chosen point with the parcel. The point is used to show drop-offs on the Rider Map and to check whether the rider's GPS actually reached them.

### A1. New fields on the `Parcel` entity

| Field | Type | Notes |
|---|---|---|
| `receiverLatitude` | double, nullable | WGS84 latitude of the drop-off. |
| `receiverLongitude` | double, nullable | WGS84 longitude of the drop-off. |
| `receiverLocationName` | string (max 200), nullable | Short name shown to staff and riders, e.g. `"Accra Mall"` or `"Near A&C Mall"`. |
| `receiverPlaceId` | string (max 300), nullable | Google Place ID, sent only when picked from search. Store as-is; it is not a foreign key. |
| `receiverLocationSource` | enum `SEARCH` \| `MAP_PIN`, nullable | How the point was chosen. |

All five fields are nullable:

- Parcels created before this change have no location.
- If Google Maps fails to load at the station, the frontend lets staff save without a pin, so intake isn't blocked by an outage.
- Pickup parcels (`homeDelivery = false`) never send a location.

### A2. Accept the fields on create and update

- **`POST /api-frontdesk/parcel`** (`ParcelRequest`): the frontend now sends these fields when `homeDelivery` is `true` and a location was chosen. Example of the extra fields in the body:

  ```json
  {
    "receiverName": "Ama Receiver",
    "receiverAddress": "House 12, Accra",
    "homeDelivery": true,
    "deliveryCost": 30,
    "receiverLatitude": 5.622300,
    "receiverLongitude": -0.173500,
    "receiverLocationName": "Accra Mall",
    "receiverPlaceId": "ChIJ...",
    "receiverLocationSource": "SEARCH"
  }
  ```

- **`PUT /api-frontdesk/parcel/{id}`** (`ParcelUpdateRequest`): accept the same five fields, so a location can be added or corrected later. The frontend sends them from Parcel Search (Set / Change / Remove delivery pin, Request Home Delivery) and from Edit Parcel. It sends them **only when the pin changed**, and sends all five as **`null` to remove a pin**:

  ```json
  { "receiverLatitude": null, "receiverLongitude": null, "receiverLocationName": null, "receiverPlaceId": null, "receiverLocationSource": null }
  ```

  So on update, a field that is **absent** means "leave as is", and an explicit **`null`** means "clear it". If your update code ignores nulls, removing a pin won't work.

Validation:

- If one of `receiverLatitude` / `receiverLongitude` is present, require both.
- Reject latitude outside −90..90 and longitude outside −180..180 with `400` and a JSON message.
- Optionally reject points clearly outside Ghana (roughly latitude 4.5..11.3, longitude −3.4..1.3) with `400 {"message": "Delivery location must be in Ghana"}`. The frontend already restricts search to Ghana.
- Do **not** make the fields required server-side for now (see the outage case in A1).

### A3. Return the fields everywhere a parcel is returned

Add the five fields to:

- The `Parcel` response, in all endpoints returning `Parcel` / `PageParcel`. These include `GET /api-frontdesk/parcels`, `GET /api-admin/parcels`, `GET /api-frontdesk/parcels/home-delivery`, the call-center lists, and tracking.
- **`ParcelInfo`** (inside `DeliveryAssignments.parcels[]`), at least `receiverLatitude`, `receiverLongitude` and `receiverLocationName`. This is the most important one: the Rider Map's delivery check and the rider app read drop-offs from assignments.

Affected assignment endpoints: `GET /api-frontdesk/rider/{riderId}/assignments`, `GET /api-frontdesk/parcel-assignment`, `GET /api-rider/assignments`, and the reconciliation lists.

### A4. Optional: coordinates on saved addresses

Staff can save an address with its delivery cost (`POST /api-frontdesk/addresses`). If `Address` also stored `latitude`, `longitude` and `locationName`, picking a saved address could fill the pin automatically. The frontend doesn't use this yet. It is a nice follow-up, not required.

---

## Part B: Rider tracking pages (access and volume)

### Endpoints the frontend calls

These already exist in the API. Nothing about their shape needs to change:

| Page | Calls |
|---|---|
| Rider Map (live) | `GET /api-admin/riders/location?phoneNumber=` for each rider, every 30 s, at most 6 at a time |
| Rider Map (route history) | `GET /api-admin/riders/track?phoneNumber=&beginTime=&endTime=` (UTC `yyyy-MM-dd HH:mm:ss`, ≤ 2 days, ≤ 3 months back), plus `GET /api-frontdesk/rider/{riderId}/assignments` |
| User Management | `PUT /api-admin/riders/device` with `{ "phoneNumber", "deviceImei" }` |
| Financial dashboard | `GET /api-admin/revenue-dashboard`, `GET /api-admin/rider-performance-dashboard` (with `officeId`, `startDate`, `endDate`) |

### B1. Let managers use these, scoped to their office (required for managers)

The Rider Map and the Financial dashboard are shown to **MANAGER** users in the Delivery Hub, but the endpoints live under `/api-admin`. If `/api-admin/**` is admin-only, managers get `403`. The pages handle that by showing "Your account isn't allowed…", but the features won't work for managers.

Please allow `MANAGER` on these endpoints, limited to riders and figures from the manager's own office:

- `GET /api-admin/riders/location`
- `GET /api-admin/riders/track`
- `GET /api-admin/revenue-dashboard`
- `GET /api-admin/rider-performance-dashboard`

Also allow `ADMIN` / `SUPERADMIN` on `GET /api-frontdesk/rider/{riderId}/assignments`. Route history calls it for admins too.

### B2. Return `deviceImei` on users (required for the "GPS ···1234" label)

`User` in the API description already has `deviceImei`. Please make sure `GET /api-admin/users` and `GET /api-frontdesk/riders/office` actually include it. User Management shows "No GPS device" for every rider if it's missing.

### B3. Bulk live locations (recommended)

The live map makes one request per rider every 30 seconds. That's fine for tens of riders; for hundreds it's wasteful. Please add:

```
GET /api-admin/riders/locations?officeId={optional}
→ 200 [ RiderLocationResponse, ... ]
```

It should return one entry per rider with a device, using the same fields as `RiderLocationResponse`. Riders without a device can be left out, or included with `located: false`. When this exists, the frontend will switch to one call per refresh.

### B4. Remove a device (recommended)

There is no way to unlink a tracker today. Please add:

```
DELETE /api-admin/riders/device?phoneNumber={phone}
→ 200 {"message": "Device removed"}   404 {"message": "Rider not found"}
```

### B5. Return JSON errors from `PUT /api-admin/riders/device` (nice to have)

This endpoint returns plain strings (`"User is not a rider"`). Every other endpoint returns `{"message": ...}`. The frontend handles both, but JSON would be consistent.

### B6. Filter assignments by date (nice to have)

Route history fetches all of a rider's assignments, then keeps the ones in the chosen period. Please add optional `from` / `to` (epoch ms, on `completedAt` or `assignedAt`) to `GET /api-frontdesk/rider/{riderId}/assignments`, so this stays fast for riders with long histories.

---

## Part C: Calls the frontend makes that are missing from the API description

These calls existed in the frontend before this work and are not in `/v3/api-docs`. Please confirm whether each one exists under a different path, or add it:

| Frontend call | Where | Note |
|---|---|---|
| `POST /api-frontdesk/pickup-request` | Pickup Request page | No match in the API description. |
| `POST /api-frontdesk/parcels/{parcelId}/follow-up` | Call center, post-delivery follow-up | The API has `PUT /api-call-center/parcels/{parcelId}/call-outcome`. Is that the replacement? |
| `GET /api-frontdesk/parcels/delivered` | `frontdeskService.getDeliveredParcels` | No match. |
| `DELETE /api-admin/location/{id}` | Station Management, delete location | Only `POST` and `PUT` exist. |

### Already fixed in the frontend (no backend change; please confirm)

The frontend used `POST` for two endpoints the API description lists as `PUT`. Both now send `PUT`:

- `PUT /api-rider/rider-status` (rider Online/Offline switch)
- `PUT /api-frontdesk/driver-assignments/pay` (Driver Tracker, pay drivers)

If the server actually accepts `POST` for either, say so and the frontend can switch back.

---

## Part D: Server-side delivery check (recommended)

### What the frontend does today

On the Rider Map's route history, the frontend loads the rider's GPS track and assignments and checks each delivery in the browser. The rules are in `src/screens/RiderMap/trackUtils.ts` (`checkDeliveries`, `summarize`), with unit tests in `trackUtils.test.ts`:

| Rule | Value |
|---|---|
| A drop-off is **reached** if any GPS point is within this distance of `receiverLatitude/Longitude`… | **150 m** (`VISIT_RADIUS_M`) |
| …during the window from `assignedAt` to `completedAt` + | **30 min** grace |
| Marking delivered/returned while the GPS is further than this from the drop-off is **flagged** | **300 m** (`MARKED_AWAY_M`) |
| A stop is a stretch below this speed… | **3 km/h** |
| …lasting at least | **5 min** |
| Distance | Sum of great-circle distances between consecutive points |
| Gaps between points longer than 15 min | Not counted as moving or stopped |

Each delivery gets one result:

- **reached:** arrival time, departure time, minutes there.
- **not reached:** closest approach in metres, and when.
- **not finished:** not marked done, not reached yet.
- **no pin:** the parcel has no location.
- **no GPS:** no points in the window.

### Why do this on the server too

The browser version only covers one rider and one period at a time, and only when someone opens it. For daily reports, payroll disputes or fraud checks, the backend should compute and store it.

### D1. Capture the rider's position when a delivery is marked (recommended)

In `PUT /api-rider/assignments/{assignmentId}/status`, when `status` is `DELIVERED` or `RETURNED`:

1. Look up the rider's current GPS position. Use the same source as `GET /api-admin/riders/location`.
2. Store on the assignment, per parcel:
   - `markedLatitude`, `markedLongitude`, `markedGpsTime`
   - `markedDistanceFromDropoffM`: the distance to `receiverLatitude/Longitude`, or `null` if either is unknown.
3. Return these in `DeliveryAssignments` / `ParcelInfo`.

This is the single most useful piece. It records where the rider really was at the moment they said "delivered", and it doesn't depend on later track lookups.

### D2. Delivery check endpoint (recommended)

```
GET /api-admin/riders/delivery-check?phoneNumber={phone}&beginTime={UTC}&endTime={UTC}
```

Use the same time format and limits as `/riders/track`. Response:

```json
{
  "riderId": "…",
  "riderName": "Kwame Asante",
  "summary": {
    "deliveries": 5, "reached": 4, "notReached": 1, "notFinished": 0, "noPin": 0, "noGps": 0,
    "markedAway": 1, "distanceKm": 92.6, "movingMinutes": 291, "stoppedMinutes": 44
  },
  "deliveries": [
    {
      "assignmentId": "…", "parcelId": "PF240185", "receiverName": "Akua Badu",
      "receiverLocationName": "Near Airport Shell", "receiverLatitude": 5.6031, "receiverLongitude": -0.1779,
      "status": "DELIVERED", "completedAt": 1763715720000,
      "result": "REACHED",
      "arrivedAt": 1763715240000, "leftAt": 1763716080000,
      "closestDistanceM": 12,
      "markedDistanceFromDropoffM": 20
    },
    {
      "assignmentId": "…", "parcelId": "PF240333", "receiverName": "Mawuli Badu",
      "receiverLocationName": "Near Achimota Mall", "status": "DELIVERED", "completedAt": 1763732640000,
      "result": "NOT_REACHED",
      "closestDistanceM": 600, "closestAt": 1763732220000,
      "markedDistanceFromDropoffM": 600
    }
  ]
}
```

`result` is one of `REACHED`, `NOT_REACHED`, `NOT_FINISHED`, `NO_PIN`, `NO_GPS`.

The same response should also carry the off-task block from Part E (`offTask`).

Please use the rules in the table above so the numbers match what staff see on the map. When this endpoint exists, the frontend will use it instead of computing in the browser.

### D3. Daily summary for all riders (recommended)

```
GET /api-admin/riders/delivery-check/summary?officeId={optional}&date={yyyy-MM-dd}
→ 200 [ { "riderId", "riderName", "deliveries", "reached", "notReached", "noPin", "markedAway",
          "distanceKm", "movingMinutes", "stoppedMinutes",
          "directKm", "detours", "offRouteMinutes", "offRouteKm", "offTaskStops", "offTaskStopMinutes" }, ... ]
```

The frontend can add this as a table on the Rider Map, or as a column on Delivery Analytics, once it exists. Pre-computing it nightly is fine.

---

## Part E: Off-task detection (detours and stops away from deliveries)

### Why

Part D tells you whether the rider reached each drop-off. It doesn't show a rider who does all their deliveries but also rides somewhere unrelated in between, such as a 40-minute side trip or a long stop that isn't at a customer or the station. Part E catches that.

The frontend already does this in the browser for one rider and one period: Rider Map → route history → **Off-task**. The rules are in `src/screens/RiderMap/trackUtils.ts` (`analyzeOffTask`), with unit tests in `trackUtils.test.ts`. Please use the same rules on the server so reports match the screen.

### E1. Station coordinates (required for accurate legs)

Offices (`Office` / `OfficeResponse` in `/api/offices/locations`) have no coordinates today. Please add:

| Field | Type | Notes |
|---|---|---|
| `latitude` | double, nullable | Station location. |
| `longitude` | double, nullable | Station location. |

Accept them on `POST /api-admin/office` and `PUT /api-admin/office/{id}`, and return them wherever an office is returned.

Until these exist, the frontend uses the first and last GPS points of the period as the start and end. That works when riders start and finish at the station, but it misses a detour on the way out or back. The server version should use the rider's office coordinates.

### E2. Rules

1. **Legs.** Build the day's anchors in order:
   - the station,
   - each drop-off the rider **reached** (Part D, within 150 m), ordered by arrival time,
   - the station again.

   Each pair of consecutive anchors is a leg. A leg's time window runs from the rider leaving the first anchor (last GPS point within 150 m) to arriving at the next (first point within 150 m). Drop-offs that weren't reached aren't anchors: the rider is judged on the way to the next place they actually went.

2. **Detours.** For every GPS point inside a leg's window, compute its distance to the straight line between the leg's two anchors. Use a point-to-segment distance; a flat projection is fine at city scale. Consecutive points further than **1,500 m** form a detour. Keep detours lasting at least **3 minutes**, and end a detour at any gap of more than 15 minutes between points. For each detour report:
   - start and end time,
   - the leg (`"Akosua Ofori → Efua Appiah"`),
   - the furthest distance from the line, in metres,
   - the km ridden from the last on-route point before it to the first on-route point after it.

3. **Off-task stops.** Using the same stop rule as Part D (below 3 km/h for 5+ minutes), a stop is **off-task** if it isn't within **200 m** of any of the rider's drop-off pins for the period (reached or not), the station, or the first or last GPS point.

4. **Daily figures:**
   - `directKm`: straight-line distance along the anchors (station → reached drop-offs → station).
   - `distanceKm`: distance actually covered (sum between consecutive GPS points).
   - `offRouteMinutes` and `offRouteKm`: totals over detours.
   - `offTaskStops` and `offTaskStopMinutes`.

5. **When it can't be judged.** If the rider reached no pinned drop-offs in the period, there are no legs. Return `judged: false` with a reason. Off-task stops can still be listed.

Make the thresholds configurable per company if possible (150 m, 1,500 m, 3 min, 200 m, 5 min, 3 km/h). Roads aren't straight, so some companies will want a wider corridor.

### E3. Response block

Add this to the `GET /api-admin/riders/delivery-check` response (Part D2):

```json
"offTask": {
  "judged": true,
  "reason": null,
  "directKm": 91.6,
  "distanceKm": 99.9,
  "offRouteMinutes": 39,
  "offRouteKm": 4.7,
  "detours": [
    {
      "start": 1763721660000, "end": 1763724000000,
      "fromLabel": "Akosua Ofori", "toLabel": "Efua Appiah",
      "maxOffRouteM": 3600, "kmRidden": 4.7
    }
  ],
  "offTaskStops": [
    { "start": 1763722020000, "end": 1763723640000, "lat": 5.5712, "lng": -0.3020, "minutes": 27 }
  ]
}
```

The durations and distances match a demo-data day: the rider leaves the Akosua Ofori → Efua Appiah leg at 10:41, rides 3.6 km off to the side, waits 27 minutes, and comes back at 11:20. The timestamps and coordinates in the example are illustrative.

### E4. Suggested alerts (optional)

Once the daily figures exist, they can drive alerts to managers, for example:

- a detour over 30 minutes,
- an off-task stop over 20 minutes during working hours,
- `distanceKm` more than 1.5× `directKm` for the day.

Thresholds should be configurable. Nothing in the frontend depends on alerts yet.

---

## Part F: Route plans when assigning parcels

### Why

When a manager assigns parcels to a rider (Package Assignments → choose rider → **Next: plan route**), the frontend works out the best order to deliver them, from the station through every pinned drop-off and back. The manager can move stops before confirming. The confirmed plan is sent with the assignment. The rider app then shows deliveries in that order with a **Start route** button that opens Google Maps through the stops. Route history uses the plan line when checking for detours (Part E).

How the order is worked out (frontend, `src/utils/routePlan.ts`):

- **`GOOGLE`:** Google Directions with `optimizeWaypoints`, giving road distances and times. Used when Maps is loaded and there are at most 25 stops.
- **`ESTIMATE`:** nearest-neighbour + 2-opt on straight-line distance, with distance ×1.3 for roads and 22 km/h average speed. Used when Google isn't available, there are more than 25 stops, or Google returns an error.

Parcels without a pin can't be placed on a route. They're assigned after the planned stops and aren't in `stopOrder`.

### F1. Accept the plan on `POST /api-frontdesk/assign-parcels` (required)

`DeliveryAssignmentRequest` gets an optional `routePlan`. `parcelIds` arrives **in planned order**: planned stops first, unpinned parcels after.

Example (`legs` shortened; there is one leg per hop, 5 here):

```json
{
  "riderId": "rider-1",
  "parcelIds": ["PF240111", "PF240555", "PF240074", "PF240259", "PF240037", "PF240222"],
  "routePlan": {
    "method": "GOOGLE",
    "stopOrder": ["PF240111", "PF240555", "PF240074", "PF240259"],
    "totalKm": 115.3,
    "totalMinutes": 288,
    "legs": [
      { "from": "START", "to": "PF240111", "km": 8.6, "minutes": 22 },
      { "from": "PF240111", "to": "PF240555", "km": 25.2, "minutes": 63 },
      { "from": "PF240259", "to": "END", "km": 9.9, "minutes": 25 }
    ],
    "encodedPath": "_d|`@f`g@xQxvIdvAxn^…",
    "startLatitude": 5.556,
    "startLongitude": -0.205,
    "edited": false,
    "plannedAt": 1795347641074
  }
}
```

| Field | Notes |
|---|---|
| `method` | `GOOGLE` (road distances) or `ESTIMATE` (straight-line). |
| `stopOrder` | Parcel ids in visiting order. Only pinned parcels. |
| `totalKm`, `totalMinutes` | Whole plan, station → stops → station. Riding time only, no time at stops. |
| `legs` | One per hop. `from` / `to` are parcel ids, or `START` / `END` for the station. |
| `encodedPath` | The route line in [Google's encoded polyline format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm) (precision 5). For `GOOGLE` it follows the roads; for `ESTIMATE` it's straight lines between stops. |
| `startLatitude`, `startLongitude` | The station, when known (E1). Missing means the plan starts at the first stop. |
| `edited` | `true` if the manager changed the order by hand. |
| `plannedAt` | Epoch ms. |

**Storage.** Store `routePlan` with the assignment as-is. A JSON column or document field is fine; nothing needs to query inside it yet. Keep `parcelIds` in the order received.

**Validation.**

- Every id in `stopOrder` must be in `parcelIds`.
- `encodedPath` is at most ~50 KB.
- Ignore the plan, but still assign, if it fails validation. The plan is helpful, not essential.

### F2. Return the plan on assignments (required)

Return `routePlan` on `DeliveryAssignments` in:

- `GET /api-rider/assignments`, which the rider app uses for the order and Start route;
- `GET /api-frontdesk/rider/{riderId}/assignments`, which route history uses for the planned line;
- `GET /api-frontdesk/parcel-assignment`.

If one assignment holds several parcels, the plan appears once on it. If you split parcels into separate assignments, put the same plan on each. The frontend de-duplicates by `plannedAt` + `stopOrder`.

### F3. Keep the plan in step with changes (recommended)

- **Parcel unassigned** (`DELETE /api-frontdesk/assignment/{assignmentId}/parcel/{parcelId}`): remove its id from `stopOrder`. Leave `encodedPath` as is; it's only a guide.
- **Parcel delivered or returned:** nothing to do. The rider app hides finished stops itself.
- **Pin changed after assignment** (`PUT /parcel/{id}` with new coordinates): optionally mark the plan stale (`stale: true`). The frontend doesn't act on this yet.

### F4. Server-side planning (optional, later)

The frontend calls Google from the browser, using the existing `VITE_GOOGLE_MAPS_API_KEY`. That key needs the **Directions API** enabled. If you'd rather plan on the server (to control cost, or to re-plan automatically), add:

```
POST /api-frontdesk/route-plan  { "parcelIds": [...], "officeId": "…" }  → routePlan (same shape as F1)
```

Use Google's Routes API (`computeRoutes` with `optimizeWaypointOrder: true`), or the Route Optimization API for multi-rider planning with time windows. The frontend can switch to this endpoint without UI changes.

### F5. How the plan is used in off-task checks (Part E)

When a plan exists, a GPS point counts as off route only when **both** of these hold:

- it's more than the corridor from the plan line (**500 m** for `GOOGLE` plans, **1,500 m** for `ESTIMATE`), and
- it's more than 1,500 m from the straight leg between the drop-offs actually reached.

The first test stops winding roads being flagged. The second stops a skipped planned stop turning the ride home into a "detour" (the skipped stop is already reported by Part D). Without a plan, Part E's straight-leg rule applies alone.

---

## Part G: Screens still on placeholder or browser-only data

The audit covers every screen and the data behind it. "Placeholder" means the numbers are hard-coded or come from the old `src/data/mockData.ts` sample file, so they're **not real**. Items marked *frontend* need no backend work; they're listed so you know they're on our side.

### G1. Admin and finance pages showing sample numbers

| Screen (route) | Today | Needs |
|---|---|---|
| **Admin Dashboard** (`/admin/dashboard`, `AdminStatistics.tsx`) | **Done:** uses `GET /api-admin/dashboard` with `officeId`, `startDate` and `endDate`. It calls it twice (this period and the one before) to show the % change on each card. | Nothing new. Optional: rider `rating` in `topRiders`, and fuel cost for the period, if those cards should come back. |
| **Financial Reports** (`/admin/financial-reports`) | **Done:** uses `GET /api-admin/revenue-dashboard` (cards, revenue by station, by day, by payment method) and `GET /api-admin/rider-performance-dashboard` (by rider), filtered by dates and station. CSV export is built in the browser. | Nothing new. Optional: per-station `driverPayments` in `revenueByStation`, so net revenue can be shown per station. |
| **Delivery Income** (`/admin/delivery-income`) | **Done:** cards and income by station from `GET /api-admin/revenue-dashboard`, rider collections from `GET /api-admin/rider-performance-dashboard`, and the delivered-parcels list from `GET /api-admin/parcels?isDelivered=true` (paged). | Optional: a date filter (`startDate`/`endDate`) and a delivered-at timestamp on `/api-admin/parcels`, so the parcel list can follow the same period as the cards. Rider commission paid vs owed still needs G4. |
| **Delivery Accountability** (`/admin/accountability`) | Sample data. | `GET /api-admin/accountability?officeId=&from=&to=` → per station: parcels handed from Parcel Hub to Delivery Hub, delivered, returned, cash expected vs remitted, outstanding, ageing of unremitted cash. |
| **Driver Payments Overview** (not routed) | Sample data. | Not linked from any menu. *Frontend:* remove, or route it and use `GET /api-frontdesk/driver-assignments/unpaid`. |
| **Billing** (`/admin/billing`) | Hard-coded plans and invoices; buttons only show messages. | Subscription APIs: `GET /api-company/subscription`, `PUT /api-company/subscription` (plan, billing cycle), `GET /api-company/invoices`, `GET /api-company/invoices/{id}/pdf`, `PUT /api-company/billing-details`, plus payment-method update through Paystack (the frontend already has a Paystack key). |
| **Tenant Management** (`/admin/tenants`, super admin) | `MOCK_TENANTS`. | `GET /api-superadmin/tenants` (name, plan, branches, users, status, created), `PUT /api-superadmin/tenants/{id}/status` (activate, suspend), `GET /api-superadmin/tenants/{id}`. |
| **Cross-Tenant Analytics** (`/admin/analytics`, super admin) | Hard-coded tenant list and charts. | `GET /api-superadmin/analytics?from=&to=` → per tenant: parcels, revenue, active riders, delivery success rate, growth. |

### G2. Settings saved only in the browser

These look like they save, but they write to `localStorage`, so other staff, other devices, and even the same person after clearing the browser don't see the changes.

| Screen | Today | Needs |
|---|---|---|
| **Tenant Settings** (`/admin/settings`) | Company name, logo, favicon and colours saved in the browser (`BrandingContext`). | `GET/PUT /api-company/branding` {companyName, logoUrl, faviconUrl, primaryColor, secondaryColor}, plus image upload `POST /api-company/branding/logo` (multipart) returning a URL. Load on login so every user sees the branding. |
| **Branch Settings** (`/parcel/settings`), Visual Identity, Branch Info and Printing tabs | Branch name, logo, address, phone, email, hours, tagline and label footer saved in the browser. (The Charges tab is real; see Part J.) | `GET/PUT /api-frontdesk/office/settings` for the manager's office, with the same fields plus logo upload. The printed parcel labels use these, so they must be shared across the station. |
| **Preferences** (`/parcel/preferences`, `/delivery/preferences`) | Email and SMS notification checkboxes; nothing is saved. | `GET/PUT /api-user/preferences` {emailNotifications, smsNotifications, pushNotifications, language}. |
| **Partner Portal → Settings** | Notification and preference toggles saved in the browser. | `GET/PUT /api-vendor/settings`. |

### G3. Notifications (not implemented at all)

- **Today:** the **bell icon** in the staff header always shows **9**, and clicking it does nothing. The **gear icon** next to it does nothing either. `websocketService.ts` exists but is never used, and has a "TODO: Replace with your actual WebSocket URL".
- **Proposed:**
  - **Model:** `Notification` {id, userId, officeId, type, title, body, link, createdAt, readAt}.
  - **Endpoints:**
    - `GET /api-user/notifications?unreadOnly=&page=&size=`
    - `GET /api-user/notifications/unread-count`
    - `PUT /api-user/notifications/{id}/read`
    - `PUT /api-user/notifications/read-all`
  - **Real time:** a WebSocket (STOMP over SockJS suits Spring) or Server-Sent Events channel per user, pushing new notifications and live updates (rider locations, assignment status), so screens don't need to poll.
  - **Events worth notifying:**
    - a parcel transfer arriving at a station;
    - a rider marking a delivery failed or returned;
    - a fuel request awaiting approval (Part H);
    - a reconciliation with a variance (Part K);
    - a bike service due or overdue, or a defect reported (Part I);
    - a delivery marked done far from its drop-off, or a long detour (Parts D and E);
    - documents expiring (Part I).
  - **Settings:** users choose channels per type in Preferences (G2).
- **Frontend after this:** a dropdown under the bell with the unread list and "mark all read", plus a real Settings menu.

### G4. Values hard-coded in the frontend

| What | Where | Needs |
|---|---|---|
| Rider earns **60%** of each delivery fee | `RiderEarnings.tsx` (`RIDER_SHARE = 0.6`) | A company or station setting `riderCommissionRate`, and ideally `GET /api-rider/earnings?from=&to=` computing earnings server-side (with bonuses and deductions, e.g. shortfalls from Part K). |
| Update pop-up content | `src/config/updateNotification.ts` | Fine as is. Optionally `GET /api-user/announcements` to publish announcements without a release. |
| Average speed and road factor for route estimates | `routePlan.ts` (22 km/h, ×1.3) | Fine as is. Optionally a company setting. |

### G5. Actions that don't reach the backend

| Action | Where | Needs |
|---|---|---|
| **Delete station** | Station Management | `DELETE /api-admin/office/{id}`. Reject with 409 if the station has parcels, users or open assignments; consider "deactivate" instead. |
| **Delete location** | Station Management | `DELETE /api-admin/location/{id}` (see Part C). |
| **Edit station code / manager name** | Station Management | `OfficeUpdateRequest` has no `code`. Add it, or make `code` read-only on screen (*frontend*). The manager is set by `managerId`. |
| Pickup request, call-centre follow-up, delivered-parcels list | various | See Part C. |

### G6. Legacy screens (frontend clean-up, no backend)

`/parcel-costs-pod`, `/parcel-review`, `/parcel-sms-success` and `/reconciliation-confirmation` belong to an older intake and reconciliation flow, and keep their data in page state only. *Frontend:* remove them, unless they're still reachable from somewhere we've missed. The "SMS sent" page claims an SMS was sent, but no SMS call exists in the frontend. If recipients should get an SMS at intake, the backend should send it when `POST /api-frontdesk/parcel` succeeds, and return whether it was sent.

---

## Part H: Fuel management (plan)

### What exists today

- **Riders** create a fuel request: station, station phone, attendant phone, tank (full, half, or litres), notes. `POST /api-rider/fuel-request`, and they see their list via `GET /api-rider/fuel-requests`.
- **Managers and admins** see requests (`GET /api-frontdesk/fuel-requests`), change status, and enter an amount (`PUT /api-frontdesk/fuel-request/{id}`). Counts come from `GET /api-frontdesk/fuel-request/stats`.
- **Gap:** the frontend uses a `COMPLETED` status ("fuel given, amount paid"), but the API enum only has `PENDING | APPROVED | REJECTED`.
- **Not recorded:** which bike was fuelled, litres, price per litre, odometer, a receipt, or who paid the station. So there's no way to tell whether fuel use is reasonable.

### H1. Goals

1. **Control:** limits per bike and per period, and a clear approve → dispense → confirm flow.
2. **Proof:** an attendant confirmation code or receipt photo for every fill.
3. **Consumption:** km per litre per bike, using the GPS distance we already have (`/riders/track`), so leaks, theft or a bike needing service show up.
4. **Cost:** fuel spend per rider, bike, station and month, feeding Financial Reports.

### H2. Data

**FuelRequest** (extend the existing one):

| Field | Type | Notes |
|---|---|---|
| `status` | enum | `PENDING → APPROVED → DISPENSED → CONFIRMED`, or `REJECTED` / `CANCELLED`. Replaces the frontend's ad-hoc `COMPLETED` (map it to `CONFIRMED`). |
| `vehicleId` | string | The bike (Part I). Defaults to the rider's assigned bike. |
| `requestedTank` | enum + number | `FULL_TANK`, `HALF_TANK`, or `LITRES` with `requestedLitres`. |
| `approvedAmount` | number | GHC ceiling set by the approver. |
| `approvedBy`, `approvedAt` | | |
| `dispensedLitres`, `pricePerLitre`, `dispensedAmount` | number | Entered by the rider or attendant when dispensed. |
| `odometerKm` | number | Odometer reading at the fill (photo optional). |
| `receiptUrl` | string | Photo of the receipt, via upload. |
| `confirmationCode` | string | 6-digit code SMS'd to the attendant's phone on approval. The rider enters it once fuelled, proving the station dispensed. |
| `paymentMethod` | enum | `STATION_ACCOUNT`, `MOMO`, `CASH_ADVANCE`. |
| `paidAt`, `paidBy` | | When the company settled with the fuel station. |
| `gpsKmSinceLastFill` | number | Computed from the tracker between this fill and the previous one. |
| `kmPerLitre` | number | `gpsKmSinceLastFill / previous fill litres`. |
| `flags` | string[] | e.g. `OVER_LIMIT`, `LOW_EFFICIENCY`, `ODOMETER_MISMATCH`, `TOO_SOON`. |

**FuelPolicy** (per company, overridable per station or bike):

- `maxLitresPerFill`, `maxAmountPerWeek`, `minHoursBetweenFills`;
- `expectedKmPerLitre` (per bike model);
- `lowEfficiencyThresholdPct` (e.g. flag if 25% below expected);
- `approvalRequiredAbove` (GHC; below this, auto-approve).

**FuelStation** (optional directory): name, phone, location, contract or account number, `pricePerLitre` history.

### H3. Endpoints

| Method and path | Who | Purpose |
|---|---|---|
| `POST /api-rider/fuel-request` | Rider | As today, plus `vehicleId` (optional; defaults to their bike). The server applies the policy: auto-approve or `PENDING`, and adds flags. |
| `GET /api-rider/fuel-requests` | Rider | As today, with the new fields. |
| `PUT /api-rider/fuel-request/{id}/dispensed` | Rider | `{dispensedLitres, pricePerLitre, odometerKm, confirmationCode, receipt (multipart)}` → `DISPENSED`, or `CONFIRMED` if the code matches. |
| `PUT /api-frontdesk/fuel-request/{id}/approve` | Manager | `{approvedAmount}` → `APPROVED`; SMS the confirmation code to the attendant. |
| `PUT /api-frontdesk/fuel-request/{id}/reject` | Manager | `{reason}`. |
| `PUT /api-frontdesk/fuel-request/{id}/confirm` | Manager | Confirm a `DISPENSED` request without a code (manual check), with a note. |
| `PUT /api-frontdesk/fuel-request/{id}/paid` | Manager or finance | `{paymentMethod, paidAt}`. |
| `GET /api-frontdesk/fuel-requests?status=&riderId=&vehicleId=&from=&to=&flag=` | Manager | Filtered list. |
| `GET /api-frontdesk/fuel/summary?from=&to=&groupBy=rider\|vehicle\|day` | Manager or admin | Litres, spend, km, km per litre, flags count. |
| `GET/PUT /api-admin/fuel-policy` | Admin | The policy above. |

Keep `PUT /api-frontdesk/fuel-request/{id}` (generic update) working during the switch, mapping `COMPLETED` → `CONFIRMED`.

### H4. Rules

- **Too soon:** a new request within `minHoursBetweenFills` of the last confirmed fill is flagged `TOO_SOON` and needs manual approval.
- **Limits:** requests over the per-fill litres or the weekly amount are flagged `OVER_LIMIT` and need manual approval.
- **Efficiency:** on `CONFIRMED`, compute `gpsKmSinceLastFill` from the bike's tracker between the two fills, then `kmPerLitre`. If it's below the expected value by more than the threshold, flag `LOW_EFFICIENCY` and notify the manager (G3).
- **Odometer:** if the odometer distance since the last fill differs from the GPS distance by more than 20%, flag `ODOMETER_MISMATCH`.
- **Maintenance link:** feed `odometerKm` into maintenance (Part I) as the bike's latest odometer.

### H5. Fuel accountability against routes

**Goal:** know how much fuel each rider *should* use for the work they were given, compare it with what they actually used, and make them account for the difference.

**Three numbers per rider and bike:**

| | Source |
|---|---|
| **Planned km** | `routePlan.totalDistanceKm` saved with each assignment (Part F). For assignments without a plan, use the straight-line legs between station and drop-offs × the road factor (1.3). |
| **Actual km** | GPS distance from the bike's tracker (same source as `/riders/track`), split into **on-duty** (between the first assignment's `acceptedAt` and the last `completedAt` of the day, plus the ride back to the station) and **off-duty** (everything else). |
| **Litres used** | `dispensedLitres` on confirmed fuel requests (H2). |

**Expected fuel:**

- **Per bike rate:** `kmPerLitre` is learnt per bike, not taken from the manufacturer. Use the median of `gpsKmSinceLastFill / litres` over that bike's last 5 confirmed fills (after a 2-week calibration period; until then use `expectedKmPerLitre` for the model). A sudden drop in a bike's rate is also a maintenance alert (Part I).
- **Allowance per assignment:** `fuelAllowanceLitres = plannedKm / kmPerLitre`. Store it on the assignment when it's created, and return it to the rider app.
- **Measured between fills, not per day.** We know what goes into the tank, not what's left each evening, so reconcile per **fill window** (from one confirmed fill to the next), and roll windows up per week and month.

**Per fill window, compute and store a `FuelAccountability` record:**

| Field | Meaning |
|---|---|
| `riderId`, `vehicleId`, `fromFillId`, `toFillId`, `from`, `to` | The window. |
| `plannedKm` | Sum of planned km for assignments in the window. |
| `actualOnDutyKm`, `offDutyKm` | GPS distance, split as above. |
| `detourKm` | `actualOnDutyKm − plannedKm` (not below 0). Link the detour events from Part E. |
| `kmPerLitre` | The bike's rate used. |
| `expectedLitres` | `(actualOnDutyKm + offDutyKm) / kmPerLitre`. |
| `plannedLitres` | `plannedKm / kmPerLitre` (what the work should have needed). |
| `actualLitres` | Litres of the fill that opens the window (fuel consumed during it). |
| `unexplainedLitres` | `actualLitres − expectedLitres × (1 + tolerance)`, not below 0. |
| `detourLitres`, `offDutyLitres` | `detourKm / kmPerLitre`, `offDutyKm / kmPerLitre`. |
| `costGhc` | Litres × the fill's `pricePerLitre`, per bucket above. |
| `status` | `OK`, `NEEDS_EXPLANATION`, `EXPLAINED`, `ACCEPTED`, `CHARGED`. |
| `explanations[]` | {bucket (`DETOUR`, `OFF_DUTY`, `UNEXPLAINED`), reason, note, by, at}. |
| `decision` | {by, at, outcome (`ACCEPTED` or `CHARGED`), amountGhc, note}. |

**Rules:**

- `tolerance` is a policy setting (`FuelPolicy.accountabilityTolerancePct`, default 15%) for traffic, idling and load.
- **Needs explanation:** a window is `NEEDS_EXPLANATION` when `unexplainedLitres > 0`, or `detourLitres` or `offDutyLitres` exceed policy thresholds (`maxDetourLitresPerWindow`, `maxOffDutyKmPerWeek`). Notify the rider and the manager (G3).
- **Explaining:** the rider gives a reason per bucket. Reasons:
  - Customer not available
  - Re-routed by manager
  - Road closed / traffic
  - Extra pickup
  - Bike fault
  - Personal use
  - Other (a note is required)
- **Deciding:** the manager accepts or charges. If charged, the amount joins the rider's shortfall balance (Part K3), so it can be deducted or repaid.
- Re-route reasons that the manager confirms should be counted as planned km next time, so the allowance stays fair.

**Endpoints:**

| Method and path | Who | Purpose |
|---|---|---|
| `GET /api-rider/fuel-allowance?date=` | Rider | Today's planned km and allowance in litres, km ridden so far, and the current window's status. |
| `GET /api-rider/fuel-accountability?status=` | Rider | Their windows; anything waiting for an explanation first. |
| `PUT /api-rider/fuel-accountability/{id}/explain` | Rider | `{explanations: [{bucket, reason, note}]}`. |
| `GET /api-frontdesk/fuel-accountability?riderId=&vehicleId=&status=&from=&to=` | Manager | Windows with all the numbers above. |
| `PUT /api-frontdesk/fuel-accountability/{id}/decision` | Manager | `{outcome, amountGhc, note}`. |
| `GET /api-admin/fuel-accountability/summary?officeId=&from=&to=&groupBy=rider\|vehicle\|week` | Admin | Totals: planned vs actual km, planned vs actual litres, unexplained litres and cost, charged amounts. |
| `GET/PUT /api-admin/fuel-policy` | Admin | Adds `accountabilityTolerancePct`, `maxDetourLitresPerWindow`, `maxOffDutyKmPerWeek`. |

**When to compute:** when a fill is `CONFIRMED`, close the previous window. Recompute it if a late GPS sync or a corrected fill arrives before a decision is made. After a decision, keep it fixed.

### H6. What the frontend will build once this exists

- **Rider app:** request fuel, see the approval and code status, and a "Fuel dispensed" step with litres, price, odometer, code and a receipt photo. Today's fuel allowance on the home screen, and a list of fill windows to explain (H5).
- **Manager:** an approvals queue with flags, a confirm or pay step, and per-bike consumption charts. A fuel accountability list (planned vs actual km and litres, reasons) with accept or charge (H5).
- **Admin:** fuel policy settings, and fuel spend in Financial Reports.

---

## Part I: Motorbike fleet maintenance (plan)

### I1. Goals

1. **Know the fleet:** every bike, who rides it, its condition and documents.
2. **Prevent breakdowns:** service schedules by distance and by time, using GPS distance so nobody has to log odometers by hand.
3. **Fix fast:** riders report problems from the app; managers track repairs and downtime.
4. **Know the cost:** spend per bike on maintenance and fuel, and when a bike is costing more than it's worth.

### I2. Data

**Vehicle:**

| Field | Notes |
|---|---|
| `id`, `companyId`, `officeId` | The bike's home station. |
| `plateNumber` | Unique per company. |
| `make`, `model`, `year`, `engineCc`, `color` | |
| `vin` / `chassisNumber`, `engineNumber` | |
| `deviceImei` | GPS tracker. Today the IMEI sits on the rider (`User.deviceImei`); move it to the bike, since the tracker is fitted to the bike. Keep the rider field as "current tracker" for compatibility. |
| `assignedRiderId`, `assignedAt` | One rider per bike at a time; keep the history in `VehicleAssignment`. |
| `status` | `ACTIVE`, `IN_SERVICE` (in the workshop), `OUT_OF_SERVICE` (unsafe), `RETIRED`. |
| `odometerKm`, `odometerUpdatedAt`, `odometerSource` | `GPS`, `MANUAL` or `FUEL_LOG`. |
| `purchaseDate`, `purchasePrice` | |
| `expectedKmPerLitre` | For fuel checks (Part H). |

**VehicleAssignment:** `vehicleId`, `riderId`, `from`, `to`, `handoverOdometerKm`, `handoverPhotos[]`, `handoverNotes`, and `conditionChecklist` (tyres, brakes, lights, horn, mirrors, chain) at hand-over and return.

**ServicePlan** (per model, overridable per bike). Each item is a task with an interval by distance and/or time, whichever comes first. Defaults to start from (adjust to your bikes):

| Task | Every |
|---|---|
| Engine oil change | 1,000–1,500 km or 1 month |
| Oil filter | 3,000 km |
| Chain clean, lube and adjust | 500 km or 2 weeks |
| Brake pads check | 2,000 km |
| Tyres check (pressure, tread) | weekly |
| Air filter clean or replace | 3,000 km |
| Spark plug | 6,000 km |
| Full service | 5,000 km or 3 months |

**ServiceSchedule** (per bike, per task, computed): `lastDoneAt`, `lastDoneKm`, `nextDueAt`, `nextDueKm`, `status` (`OK`, `DUE_SOON` at 85% of the interval, `DUE`, `OVERDUE`).

**MaintenanceRecord** (each service or repair):

| Field | Notes |
|---|---|
| `vehicleId`, `type` | `SCHEDULED_SERVICE`, `REPAIR`, `ACCIDENT`, `INSPECTION`. |
| `tasks[]` | Which plan items were done; resets their schedule. |
| `odometerKm`, `startedAt`, `completedAt` | Downtime = completed − started. |
| `workshop` | Name and phone, or "in-house". |
| `parts[]` | {name, quantity, unitCost}. |
| `labourCost`, `totalCost`, `invoiceUrl` | |
| `defectIds[]` | Defects this fixed. |
| `notes`, `createdBy` | |

**Defect** (reported problem): `vehicleId`, `reportedBy` (rider or staff), `category` (BRAKES, TYRES, ENGINE, LIGHTS, ELECTRICAL, BODY, CHAIN, OTHER), `severity` (`LOW`, `MEDIUM`, `UNSAFE`), `description`, `photos[]`, `odometerKm`, `status` (`OPEN`, `SCHEDULED`, `FIXED`, `DISMISSED`), `fixedByRecordId`. An `UNSAFE` defect sets the bike `OUT_OF_SERVICE` until fixed.

**VehicleDocument:** `type` (`INSURANCE`, `ROADWORTHY`, `REGISTRATION`, `RIDER_LICENCE`, `OTHER`), `number`, `issuedAt`, `expiresAt`, `fileUrl`. Riders' licences can sit on the user with the same shape.

### I3. Endpoints

| Method and path | Who | Purpose |
|---|---|---|
| `GET /api-admin/vehicles?officeId=&status=` | Admin, manager | Fleet list with service status, open defects and document expiry. |
| `POST /api-admin/vehicles`, `PUT /api-admin/vehicles/{id}` | Admin | Create and edit a bike. |
| `PUT /api-admin/vehicles/{id}/assign` | Manager | `{riderId, handoverOdometerKm, checklist, photos}` → hand-over. |
| `PUT /api-admin/vehicles/{id}/status` | Manager | `{status, reason}`. |
| `GET /api-admin/vehicles/{id}` | Admin, manager | Details: assignments, schedule, records, defects, documents, fuel. |
| `GET /api-admin/vehicles/{id}/schedule` | Manager | Per-task due status. |
| `POST /api-admin/vehicles/{id}/maintenance` | Manager | Log a service or repair (multipart for the invoice). |
| `GET /api-admin/maintenance?officeId=&from=&to=&type=` | Manager, admin | Records list. |
| `GET /api-admin/maintenance/due?officeId=&within=7d` | Manager | What's due or overdue, for the dashboard and notifications. |
| `POST /api-rider/defects` | Rider | Report a problem with photos (multipart); uses their current bike. |
| `GET /api-rider/vehicle` | Rider | My bike, its status, next service and open defects. |
| `POST /api-rider/vehicle/checklist` | Rider | Daily pre-ride check (optional; see I4). |
| `GET /api-admin/defects?status=&officeId=`, `PUT /api-admin/defects/{id}` | Manager | Defect queue: schedule, fix, dismiss. |
| `POST /api-admin/vehicles/{id}/documents`, `GET /api-admin/documents/expiring?within=30d` | Admin | Documents and expiry. |
| `GET /api-admin/fleet/costs?from=&to=&groupBy=vehicle\|month` | Admin | Maintenance + fuel cost per bike, cost per km. |
| `GET/PUT /api-admin/service-plans` | Admin | Edit plan templates. |

### I4. Rules and automation

- **Odometer from GPS:** each night, add the day's GPS distance for the bike's tracker (from the tracking provider, the same source as `/riders/track`) to `odometerKm` (`odometerSource = GPS`). Fuel logs and services with a reading correct it.
- **Schedules:** recompute after every odometer update and every maintenance record. Notify the manager (G3) at `DUE_SOON` and `OVERDUE`. Notify the rider in the app ("Oil change due in 120 km").
- **Overdue bikes:** if a safety task (brakes, tyres) is overdue by more than 20% of its interval, warn on assignment (Part F) when that bike's rider is chosen. Don't block, but show it.
- **Unsafe defects:** set the bike `OUT_OF_SERVICE`. Its rider shouldn't get assignments until it's fixed or they're given another bike.
- **Daily check (optional):** before the first assignment of the day, the rider confirms a short checklist. Failing items create defects automatically.
- **Documents:** notify 30 and 7 days before expiry. Expired insurance or roadworthy sets the bike `OUT_OF_SERVICE`.
- **Cost per km:** (maintenance + fuel) ÷ GPS km per month. Flag bikes more than 50% above the fleet average.

### I5. What the frontend will build once this exists

- **Rider app:** a "My bike" tab with next service, open problems, "Report a problem" with photos, and the daily check.
- **Manager:**
  - **Fleet:** bikes with status, rider, next service and documents.
  - **Bike details:** timeline of services, repairs, defects and fuel.
  - **Logging:** a "Log service" form and the defect queue.
- **Admin:** service plan templates, the documents list, and a fleet cost report.
- **Rider Map:** show the bike and its service status in the rider list. Hand-over replaces "Assign GPS device", because the tracker moves to the bike.

---

## Part J: Station pickup charge (frontend done)

### What the frontend does

Each station can charge a default amount for **Pickup Requests**, where a rider collects a parcel from a sender. Stations that don't charge switch it off.

- **Admins** set it per station in **Station Management → Edit Station**. That dialog now really saves through `PUT /api-admin/office/{id}`; before, it only showed a "saved" message. The station list shows each station's charge.
- **Managers** set it for their own station in **Branch Settings → Charges**.
- **Pickup Request** behaves in three ways:
  - charge **on**: the amount is pre-filled with a note, and staff can still change it for one request;
  - charge **off**: the cost box is replaced by "This station doesn't charge for pickups", and `pickUpCost` is sent as 0;
  - setting **not provided** by the backend yet: the old optional manual box stays.

### J1. Fields on Office (required)

| Field | Type | Notes |
|---|---|---|
| `pickupChargeEnabled` | boolean, nullable | `null` means not configured. |
| `pickupChargeAmount` | number, nullable | GHC. Required and greater than 0 when enabled; `null` when disabled. |

- Return both on `OfficeResponse` (in `/api/offices/locations`) and on the login `office`.
- Accept both on `POST /api-admin/office` and `PUT /api-admin/office/{id}` (`OfficeUpdateRequest`).

### J2. Manager endpoint (required)

```
PUT /api-frontdesk/office/pickup-charge
{ "pickupChargeEnabled": true, "pickupChargeAmount": 12.5 }
→ 200 { "message": "Pickup charge saved" }
```

- **Access:** `MANAGER` only, and it applies to the caller's own office.
- **Validation:** `400` if enabled without a positive amount.

### J3. Pickup requests (recommended)

The frontend sends `pickUpCost` on the request as before. If the backend creates a pickup request without `pickUpCost`, it should fall back to the station's charge when enabled. Keep the amount on the parcel as charged; don't recompute it later if the station changes its charge.

---

## Part K: Reconciliation with actual amounts and variance reasons (frontend done)

### What the frontend does

On **Reconciliation** (manager), each rider's expanded list now shows every delivered parcel with:

- the **System** amount (what the rider should hand over),
- a **Collected (GHC)** box (empty means the same as the system amount),
- the **Variance**, and
- a **reason** whenever there's a difference. The reasons are:
  - Customer paid less
  - Customer didn't pay
  - Rider short on cash
  - Discount approved
  - Paid by mobile money to a different number
  - Overpaid / tip
  - Other (a note is required)

Confirming is blocked until every difference has a reason. Rules and tests are in `src/utils/reconciliation.ts`.

On **Admin → Reconciliation**, each rider shows **System amount**, **Manager collected** and **Variance**. Each parcel shows **System**, **Manager**, **Variance** and the **reason and note**. Older reconciliations show "Not recorded".

### K1. Accept the new fields on `POST /api-frontdesk/reconcilation-parcels` (required)

The body is still one item, or an array of items, per assignment. `assignmentId`, `reconciledAt` and `payedAmount` are unchanged in meaning and format (strings, as today). Three fields are new:

```json
{
  "assignmentId": "asg-PF241739",
  "reconciledAt": "1795349169203",
  "payedAmount": "30",
  "expectedAmount": 40,
  "varianceAmount": -10,
  "lines": [
    {
      "parcelId": "PF241739",
      "systemAmount": 40,
      "collectedAmount": 30,
      "variance": -10,
      "varianceReason": "Other",
      "varianceNote": "Customer will bring GHC 10 to the station tomorrow"
    }
  ]
}
```

| Field | Notes |
|---|---|
| `payedAmount` | Now what the rider **actually** handed over: `expectedAmount + varianceAmount`. |
| `expectedAmount` | What the system expected for the assignment, as computed on the screen. |
| `varianceAmount` | Sum of line variances. Negative means short, positive means over. |
| `lines[]` | One per delivered parcel. `varianceReason` and `varianceNote` are present only when `variance ≠ 0`. |

**Validation:**

- Every line's `parcelId` must belong to the assignment.
- `variance = collectedAmount − systemAmount`, to 2 decimal places.
- A non-zero variance needs `varianceReason`; `Other` needs `varianceNote`.
- Store the reason as text (the list may grow) or as an enum, as long as the listed values above are accepted.

### K2. Store and return (required)

- **Storage:** keep the lines with the reconciliation record (`Reconcilations` already has `expectedAmount` and `payedAmount`) or with the assignment.
- **Return:** on `DeliveryAssignments` from `GET /api-admin/reconciliations/by-date`, `GET /api-frontdesk/reconciliations/by-date` and `GET /api-frontdesk/parcel-assignment`, include:
  - `amountPayed`: what the manager recorded (already in the spec);
  - `reconciliationLines`: the `lines[]` above;
  - `varianceAmount`.
- Also record **who** reconciled (`reconciledBy` user id and name) and **when**, for the audit trail.

### K3. Reports and follow-up (recommended)

- **Variance report:** `GET /api-admin/reconciliations/variances?officeId=&from=&to=` lists every non-zero line, with rider, parcel, amounts, reason, note and who recorded it, for finance.
- **Rider shortfall balance:** the running total of negative variances per rider, so "Rider short on cash" can be followed up and settled later. Add `POST /api-frontdesk/riders/{riderId}/shortfall-payments` to record a repayment.
- **Edits after confirming:** don't allow them silently. If corrections are needed, add a correction record (who, when, old value, new value, reason) rather than overwriting.

---

## Frontend follow-ups (no backend work)

Once A3 is in place, the frontend team should:

- ~~**Rider app:** pass the new fields through `riderService.getAssignments` and point Directions at the pin.~~ **Done.** The rider app reads `receiverLatitude`, `receiverLongitude` and `receiverLocationName` from `GET /api-rider/assignments` (`ParcelInfo`). Directions open Google Maps routing to the pin, and fall back to searching the address text when there's no pin. **This only works once A3 returns these fields on `ParcelInfo` for the rider endpoint.**
- ~~**Parcel Search / Edit Parcel:** let staff add or correct a pin on existing parcels.~~ **Done.** Parcel Search shows the pin in parcel details, with Add / Change / Remove, and Request Home Delivery asks for one. Edit Parcel has the pin field, which is required when switching Home Delivery on. Both use `PUT /api-frontdesk/parcel/{id}` (A2, including `null` to remove).

---

## Checklist for the backend

- [ ] A1 Parcel entity has the five location fields (nullable).
- [ ] A2 `POST` and `PUT /api-frontdesk/parcel` accept them, with lat/lng validation.
- [ ] A3 Fields are returned on `Parcel` and on `ParcelInfo` in every assignment endpoint.
- [ ] B1 `MANAGER` can call `riders/location`, `riders/track`, `revenue-dashboard` and `rider-performance-dashboard` for their office; `ADMIN` can call `rider/{id}/assignments`.
- [ ] B2 `deviceImei` is returned on users.
- [ ] B3 `GET /api-admin/riders/locations` (bulk). *(recommended)*
- [ ] B4 `DELETE /api-admin/riders/device`. *(recommended)*
- [ ] C Confirm or add the four missing endpoints. Confirm `PUT` for rider-status and driver pay.
- [ ] D1 Store the rider's position when a delivery is marked. *(recommended)*
- [ ] D2 / D3 Delivery check endpoints. *(recommended)*
- [ ] E1 Station (office) `latitude` / `longitude`.
- [ ] E2 / E3 Off-task block (detours, off-task stops, daily figures) in the delivery-check responses. *(recommended)*
- [ ] E4 Alerts. *(optional)*
- [ ] F1 Accept and store `routePlan` (and keep `parcelIds` order) on `POST /api-frontdesk/assign-parcels`.
- [ ] F2 Return `routePlan` on assignments (rider, rider/{id}/assignments, parcel-assignment).
- [ ] F3 Keep `stopOrder` in step when a parcel is unassigned. *(recommended)*
- [ ] F4 Server-side planning endpoint. *(optional)*
- [ ] Enable the **Directions API** on the Google Maps key used by the frontend.
- [ ] J1 Office `pickupChargeEnabled` / `pickupChargeAmount` (on office responses, create and update).
- [ ] J2 `PUT /api-frontdesk/office/pickup-charge` (manager, own office).
- [ ] K1 Accept `expectedAmount`, `varianceAmount` and `lines[]` on `reconcilation-parcels`, with validation.
- [ ] K2 Store and return `amountPayed`, `reconciliationLines`, `varianceAmount` and `reconciledBy` on reconciled assignments.
- [ ] K3 Variance report and rider shortfall balance. *(recommended)*
- [ ] G1 Endpoints for Accountability, Billing, Tenant Management and Cross-Tenant Analytics (Admin Dashboard, Financial Reports and Delivery Income are now on the existing endpoints).
- [ ] G2 Server-side branding, branch settings, user preferences and vendor settings.
- [ ] G3 Notifications: model, endpoints, real-time channel, events.
- [ ] G4 `riderCommissionRate` setting and server-side rider earnings.
- [ ] G5 `DELETE /api-admin/office/{id}` (and location delete from Part C); station `code` in `OfficeUpdateRequest`.
- [ ] H Fuel management: statuses, dispense confirmation, receipts, policy, consumption, summary.
- [ ] H5 Fuel accountability: per-bike km per litre, allowance per assignment, fill-window records (planned vs actual km and litres), rider explanations, manager decisions, summary.
- [ ] I Fleet maintenance: vehicles, assignments, service plans and schedules, records, defects, documents, costs, GPS odometer.

Questions about the frontend side: the relevant code is in `src/components/DeliveryLocationPicker.tsx`, `src/components/RoutePlanPanel.tsx`, `src/utils/routePlan.ts`, `src/utils/reconciliation.ts`, `src/screens/ParcelRegistration/`, `src/screens/ParcelSelection/`, `src/screens/Reconciliation/`, `src/screens/BranchSettings/`, `src/screens/RiderMap/` (rules in `trackUtils.ts`) and `src/services/adminService.ts`.
