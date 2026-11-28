# Backend: what to work on now

The outstanding backend work as of 28 Nov 2026, checked against `https://backend-test.mandmservicescorp.org/shortly/v3/api-docs`. Everything else in the full handoff doc (`docs/BACKEND_HANDOFF.md`) is done on `backend-test`, and the frontend uses it. That includes the five admin report endpoints (counter cash-ups, payout summary, POD owed, long-waiting fees, missing parcels), whose responses match what the new **Cash & Driver Reports** page expects.

Work in this order:
1. **Pickup location pin** (still open): four schemas need five new fields.
2. **Schema name clash** (still open): a documentation fix.
3. **New:** company signup email link.
4. **New:** paying POD money out to the sender.
5. **New:** riders don't accept assignments.
5a. **New:** never give a rider the same parcel twice.
5b. **New:** customer pages (tracking, SMS link, delivery requests), including a data leak to fix now.
5c. **New:** distance-based delivery pricing (station price tables, quotes, new parcel fields).
6. **Release to production.**
7. **Next features**, which are planned.

---

## 1. Pickup location pin (required)

The **Pickup Request** form now asks staff to pin two places on the map: where the rider collects the parcel from the sender, and where it's delivered.

- **Delivery pin:** already saves, using `receiverLatitude`, `receiverLongitude` and the other receiver location fields.
- **Pickup pin:** sent as the fields below, which the API doesn't have yet.

**Add these fields** to `Parcel`, `ParcelRequest` (used by `POST /api-frontdesk/parcel` and `POST /api-frontdesk/pickup-request`), `ParcelUpdateRequest` and `ParcelInfo`:

| Field | Type | Notes |
|---|---|---|
| `pickupLatitude` | number, nullable | WGS84, -90 to 90 |
| `pickupLongitude` | number, nullable | WGS84, -180 to 180 |
| `pickupLocationName` | string | e.g. "Accra Mall", or "Near Kaneshie Market" for a map pin |
| `pickupPlaceId` | string, nullable | Google place ID when picked from search |
| `pickupLocationSource` | `SEARCH` or `MAP_PIN` | |

**Rules:** the same as for the receiver location fields.
- Latitude and longitude are set together or not at all; reject one without the other with 400.
- Sending `null` in an update clears the pin.

**Return them:** include the fields on every parcel response, including the parcels inside rider assignments (`DeliveryAssignments.parcels[]`, `GET /api-rider/assignments`). That lets the rider app route to the pickup point first, then the delivery point.

Example request body (abridged):

```json
{
  "typeofParcel": "PICKUP",
  "pickupAddress": "Accra Mall, Tetteh Quarshie",
  "pickupLatitude": 5.6223, "pickupLongitude": -0.1735,
  "pickupLocationName": "Accra Mall", "pickupPlaceId": "ChIJ...", "pickupLocationSource": "SEARCH",
  "receiverAddress": "Achimota, Accra",
  "receiverLatitude": 5.621, "receiverLongitude": -0.2193,
  "receiverLocationName": "Achimota Mall", "receiverLocationSource": "SEARCH"
}
```

---

## 2. Schema name clash (documentation fix)

- **The clash:** the driver-payments summary (`GET /api-frontdesk/driver-payments/summary`) was given the schema name **`Summary`**, which the delivery check was already using.
- **The effect:** `DeliveryCheckResponse.summary` now points to the driver-payments fields (`readyAmount`, `waitingAmount`, …) instead of the delivery-check fields (`deliveries`, `reached`, `notReached`, `noPin`, `markedAway`, `distanceKm`, …).
- **The fix:** rename one class, e.g. `DriverPaymentsSummary` and `DeliveryCheckSummary`, so each endpoint documents its real response. The responses themselves are probably fine; please check `GET /api-admin/riders/delivery-check` still returns the delivery-check summary.

---

## 3. Company signup: the verification email link (new)

Company (tenant) signup works on `backend-test`: register, duplicate checks (409), field validation (400), resend, and blocking login until verified. We tested it from the frontend. Remaining:

- **The link in the email** must open the frontend page `<frontend address>/verify-email?token=<token>`. The page then calls `POST /api-company/verify-email` with `{ "token": "..." }`. Make the frontend address a setting per environment (test and production), not a fixed value.
- **Send real emails** from `backend-test` so we can test the full flow with a real inbox: sign up, click the link, log in as the new admin with the **phone number** used at signup.
- **The new admin's first login:** a brand-new company has no stations yet. Check that the admin's login works and that the admin dashboard and Station Management load without errors on an empty company (empty lists, not 500s).
- **Clean up:** please delete the test companies we created: names starting **"QA Signup"** and **"QA Test Co"** (emails `@example.com`).
- **Optional, later:** the signup page shows a plan choice (Starter, Growth, Enterprise) that isn't sent. If you want it stored, add `plan` to `CompanyRegistrationRequest` and the frontend will send it.

---

## 4. Paying POD money out to the sender (new)

`GET /api-admin/pod-payouts` lists POD item values collected at the counter that are still owed to senders (`podPaidOut = false`). There's no way yet to record that the money was paid out, so the list only ever grows.

**Add** `POST /api-admin/pod-payouts`:

```json
{
  "collectionIds": ["...", "..."],
  "paymentMethod": "CASH",
  "momoReference": null,
  "paidTo": "Kofi Mensah (vendor)",
  "note": "Paid at Accra Central"
}
```

- Set `podPaidOut = true` on each collection, and `itemOwnerPaid = true` on the parcel.
- Store who paid (from the token), when, the method and reference, and return the updated collections.
- Reject with 409 any collection that's already paid out; 400 for `MOMO` without `momoReference`.
- Cash paid out this way should come out of the station's counter cash for that day, like driver cash payouts do in the cash-up.

Tell us when it's in, and we'll add a **Mark paid** button to the POD tab.

---

## 5. Riders don't accept assignments (new)

The business rule is that riders don't accept or reject parcels: once a parcel is assigned, the rider must deliver it. The frontend no longer shows an "accept" step.

- **Allow** a rider assignment to go straight from `ASSIGNED` to `PICKED_UP`, `DELIVERED` or `RETURNED` (on `PUT /api-rider/assignments/{assignmentId}/status` and the manager version). Please confirm the server doesn't require `ACCEPTED` first.
- **Don't let a rider decline or unassign** themselves. Only a manager can reassign or return a parcel.
- `ACCEPTED` can stay in the enum for old records, but nothing new needs to set it.

---

## 5a. Never give a rider the same parcel twice (new)

Parcels sometimes end up on a rider's list twice. **The rule:** a parcel can be on only **one** active assignment (`ASSIGNED`, `ACCEPTED`, `PICKED_UP`). A manager may move it to a **different** rider, but never assign it again to the rider who already has it.

The frontend now:
- checks with the server just before assigning;
- greys out the rider who already holds a parcel;
- blocks double clicks;
- flags duplicates on Active Deliveries.

It can't fully close the gap: two managers (or two tabs) clicking at the same moment both pass the check. Only the server can stop that.

**On `POST /api-frontdesk/assign-parcels`:**
- **Same rider:** if the chosen rider already has any of the parcels on an active assignment, reject with **409** and assign nothing: `"Kwame Asante already has PF240037"`.
- **Different rider (reassign):** close the parcel's current active assignment for the old rider (e.g. `CANCELLED`, reason "Reassigned") in the same step, so only the new one is active.
- **Finished parcels:** reject with 409 any parcel that's delivered, returned or picked up at the counter.
- **Do it in one transaction**, or with a unique index on active parcel assignments (e.g. a unique `activeAssignmentId` on the parcel, set when assigned and cleared on deliver, return or reassign). A read-then-write without a lock still lets two requests through.
- **Reject repeated IDs** in the same request (`["P1", "P1"]`) with 400.
- **Set `parcelAssigned = true` and the rider info** on the parcel in the same transaction.
- **Optional:** accept an `Idempotency-Key` header, so a request retried after a timeout returns the first result instead of creating a second assignment.

**Clean up existing duplicates:** list parcels on more than one active assignment and close the extra ones. Active Deliveries shows them with a red "duplicate assignment" line.

---

## 5b. Customer pages: tracking, SMS link and delivery requests (new)

The customer page is `/receive` (`/track` now opens it too). It's rebuilt to show everything about a parcel:
- status and journey;
- the station holding it, with address, phone, opening hours, a map and directions;
- the delivery location on a map;
- the rider when out for delivery;
- charges line by line;
- the parcel details.

**Delivery booking was not working:** customers paid by Paystack, but nothing was sent to the backend, so no one knew to deliver. The frontend now calls the endpoints below. Until they exist, it shows "Online delivery booking isn't available yet, please call the station" and **takes no payment**. Try it with `npm run dev:mock` and open `/receive?t=demo-link`.

### Fix now: the parcel search leaks staff data

`GET /api-user/parcel-search?phoneNumber=` needs no login and returns the **full** parcel record to anyone who types a phone number: `senderPhoneNumber`, `driverPhoneNumber`, `callerName`, `callCenterRemark`, `companyId` and more. Return a customer view instead:
- `parcelId`, `parcelDescription`, `typeofParcel`, `numberOfItems`, `parcelWeight`, `fragile`;
- `senderName`, `receiverName`, `receiverAddress` and the receiver location fields;
- `shelfName`, `hasArrivedAtOffice`, `parcelAssigned`, `homeDelivery`, `delivered`, `pickedUp`;
- the charges (`inboundCost`, `storageCost`, `deliveryCost`, `pickUpCost`, `inboudPayed`, `pod`, `itemCost`), `createdAt` and `updatedAt`;
- `riderInfo` (name and phone) only while it's out for delivery.

**Add the station** so the page can show where the parcel is (the station list needs a login, so the page can't look it up):

```json
"office": { "id": "...", "name": "Accra Central", "address": "12 Kojo Thompson Rd, Adabraka",
            "phoneNumber": "+233...", "latitude": 5.5571, "longitude": -0.2058, "openingHours": "Mon–Sat, 8am–6pm" }
```

Do the same for `GET /api-tracking/{parcelId}/track`, which today returns only status and dates, with `fromOfficeName` and `toOfficeName` both null.

### The SMS link

When a parcel arrives (and when it's assigned to a rider), the SMS to the receiver should contain a link: `<frontend address>/receive?t=<token>`.
- **Token:** random, at least 128 bits, stored against the receiver's phone number, valid for 14 days. Don't put the phone number or the parcel ID in plain text.
- **`GET /api-user/customer-links/{token}`** → `{ "phoneNumber": "+233...", "receiverName": "...", "parcels": [ customer view, as above ] }`, with all of that phone's parcels that aren't finished or returned. 404 if expired or unknown.
- Optionally add `&parcel=<parcelId>` to the link to open that parcel directly.

### One-time code (for customers who search instead of using the link)

Searching shows the parcels. Booking a delivery needs proof that the customer holds the phone, otherwise anyone could pay a small fee and have someone else's parcel delivered to them.
- **`POST /api-user/customer-otp/send`** `{ "phoneNumber": "+233..." }`: SMS a 6-digit code, valid for 5 minutes. Allow at most 3 sends per phone per 15 minutes, and return 404 if the phone has no parcels.
- **`POST /api-user/customer-otp/verify`** `{ "phoneNumber", "code" }` → `{ "token": "..." }`, the same kind of token as the SMS link (valid for a few hours). Lock the code after 5 wrong tries.

### Delivery price and request

**`POST /api-user/delivery-requests/quote`**

```json
{ "token": "...", "phoneNumber": "+233...", "parcelIds": ["PF..."], "latitude": 5.60, "longitude": -0.18 }
```

returns:

```json
{ "deliveryFee": 15.0, "parcelCharges": 20.0, "total": 35.0, "quoteId": "..." }
```

- `deliveryFee` comes from the station's delivery pricing for that distance; `parcelCharges` is whatever is still owed (unpaid inbound, storage, pickup fee, POD item value).
- Keep the quote for 30 minutes.
- **401** if the token doesn't match the phone; **403** if a parcel isn't that phone's; **409** if a parcel is delivered, collected, already with a rider or already booked for delivery.

**`POST /api-user/delivery-requests`**

```json
{ "token": "...", "phoneNumber": "+233...", "parcelIds": ["PF..."], "latitude": 5.60, "longitude": -0.18,
  "address": "...", "notes": "Blue gate near the main road", "scheduledDate": "2026-11-30", "scheduledTime": "14:00",
  "quoteId": "...", "amountPaid": 35.0, "paystackReference": "MNM-DLV-..." }
```

returns `{ "requestId": "...", "status": "PENDING" }`.
- **Verify the payment** with Paystack (`GET https://api.paystack.co/transaction/verify/{reference}` with the secret key). It must be `success`, in GHS, for at least the quoted total. Each reference can be used once.
- On success:
  - set `homeDelivery = true` and the receiver location fields from the pin;
  - record the payment against the parcels, so the rider doesn't collect again;
  - mark it as a customer request, so it shows in the station's ready-to-assign list.
- **Same checks as the quote.** If anything fails after the payment was verified, keep the record and refund or flag it for the station. The page tells the customer to call the station with the payment reference.
- **Schedule:** when parcels haven't arrived yet, `scheduledDate` and `scheduledTime` say when to deliver once they have.

---

## 5c. Distance-based delivery pricing, stage 1 (new)

**The goal:** the delivery price is filled in from the road distance and the parcel's weight, using a price table each station manager sets. Every parcel records the suggested price, the price actually charged and why they differ, so later (stage 2) we can learn the right prices from real data.

The frontend is built: Branch Settings → Charges → **Delivery prices**, and the suggested price on the intake form. Try it with `npm run dev:mock`.

### Station price table

`GET /api-frontdesk/office/delivery-pricing` (the caller's station; **404** if none is set) and `PUT /api-frontdesk/office/delivery-pricing` (manager only).

```json
{
  "mode": "BANDS",
  "bands": [ { "upToKm": 3, "price": 15 }, { "upToKm": 6, "price": 20 }, { "upToKm": 10, "price": 25 }, { "upToKm": 15, "price": 35 } ],
  "perKmBeyond": 2,
  "baseFee": 10, "perKm": 2, "minFee": 15,
  "weightBands": [ { "overKg": 5, "surcharge": 5 }, { "overKg": 10, "surcharge": 10 }, { "overKg": 20, "surcharge": 20 } ],
  "fragileFee": 3,
  "roundTo": 1
}
```

The GET also returns `version`, `updatedAt` and `updatedByName`.
- **Keep every version.** Each PUT adds a new version (1, 2, 3…); never overwrite, so old parcels can still be explained.
- **Validate.** At least one band; band distances above 0 and unique; prices above 0 and not cheaper for a longer band; nothing negative. Reject with 400 otherwise.
- **Admins** need the same per station: `GET/PUT /api-admin/offices/{officeId}/delivery-pricing`.

### The pricing rules

The frontend uses exactly this (`src/utils/deliveryPricing.ts`, with tests). Please match it:
1. **Distance** (km, one decimal):
   - `BANDS`: the price of the first band with `km ≤ upToKm`. Past the last band: last price + `perKmBeyond` × each extra km, rounded up to whole km.
   - `PER_KM`: `max(minFee, baseFee + perKm × km)`.
2. **Weight:** add the `surcharge` of the **highest** weight band with `weight > overKg` (bands don't add up). No weight given: no surcharge.
3. **Fragile:** add `fragileFee`.
4. **Rounding:** round the total **up** to a multiple of `roundTo` (0 means don't round).

### Quote

`POST /api-frontdesk/delivery-pricing/quote` `{ "latitude": 5.637, "longitude": -0.165, "weightKg": 12, "fragile": false }` → 

```json
{ "distanceKm": 13.5, "distanceSource": "ROAD",
  "lines": [ { "label": "Distance 10–15 km (13.5 km)", "amount": 35 }, { "label": "Weight (12 kg)", "amount": 10 } ],
  "price": 45, "tableVersion": 4 }
```

- **Road distance:** from the caller's station position to the pin, by road, with the Google Routes API (`computeRoutes`, travel mode `TWO_WHEELER` for motorbikes, or `DRIVE`). Cache it by station + pin rounded to about 50 m, so the same address isn't paid for twice.
- **If Google fails:** use the straight line × 1.35 and return `"distanceSource": "ESTIMATE"`.
- **404** if the station has no table.

If this endpoint isn't there, the intake form estimates the price itself from the table and the straight-line distance, and labels it "(estimated)".

### New parcel fields

`POST /api-frontdesk/parcel` now sends these on home deliveries with a pin. Store them, and return them on the parcel:

| Field | Type | Notes |
|---|---|---|
| `distanceKm` | number | Road km from the station to the pin, as quoted. |
| `distanceSource` | `ROAD` or `ESTIMATE` | |
| `suggestedDeliveryCost` | number | What the table suggested. `deliveryCost` is what was charged. |
| `pricingTableVersion` | number | The table version that priced it. |
| `priceOverrideReason` | `BULKY`, `HARD_TO_REACH`, `REGULAR_CUSTOMER`, `PROMOTION`, `WRONG_PIN` or `OTHER` | Required when `deliveryCost` ≠ `suggestedDeliveryCost`; 400 without it. `OTHER` explains in `specialInstructions`. |

- **Don't trust the sent suggestion.** Re-quote on the server and store **your** figures for `distanceKm` and `suggestedDeliveryCost`. If yours differs from the sent one by more than GHC 0.01, require the override reason as above.
- **Who:** also store the user who registered it (you already have it from the token), so stage 2 can show overrides per staff member.

### Customer delivery booking uses the same table

`POST /api-user/delivery-requests/quote` (section 5b) should price each parcel with its station's table and this road distance. Suggested rule for several parcels in one trip: the highest single parcel price, plus a fixed amount for each extra parcel (a table setting, e.g. GHC 5).

### Stage 2 (after about 4–6 weeks of data; for later)

A weekly job, per station, over delivered parcels that have a distance:
- the usual (median) price charged in each distance band, and the best-fitting base fee and price per km;
- how often staff override, by reason and by staff member;
- a proposed new table.

Admins review the proposal on a new page and approve it, which creates a new table version. Details when we get there.

---

## 6. Release to production

Production (`backend-new`) still has the old API. Once sections 1 to 5 are done:

1. **Deploy:** deploy the `backend-test` build to `backend-new`, including the one-off driver migration (`POST /api-admin/driver-payments/migrate`) for existing driver fees.
2. **Tell the frontend team:** we then set `VITE_API_VERSION=2` for production and redeploy.

**Until then, these don't work on production:**
- counter payments and the cash-up;
- Driver Payments;
- the station pickup charge;
- the pay policy;
- reconciliation reasons;
- route plans;
- the Cash & Driver Reports page;
- company signup on the new flow.

---

## 7. Next features (planned)

The full specs are in `docs/BACKEND_HANDOFF.md` under the part named. In suggested order:

| Part | Feature | Main endpoints |
|---|---|---|
| **K3** | Reconciliation variance report and rider shortfall balance | `GET /api-admin/reconciliations/variances`, `POST /api-frontdesk/riders/{riderId}/shortfall-payments` |
| **G3** | Notifications. The bell in the header is fake today. | `Notification` model; `GET /api-user/notifications`, `/unread-count`, `PUT .../{id}/read`, `/read-all`; WebSocket or SSE push |
| **G2** | Settings saved on the server, not just the browser | `GET/PUT /api-company/branding` (and logo upload), `/api-frontdesk/office/settings`, `/api-user/preferences`, `/api-vendor/settings` |
| **G4** | Rider commission rate and earnings computed on the server | `riderCommissionRate` setting; `GET /api-rider/earnings` |
| **H** | Fuel management, including fuel accountability against planned routes (H5) | New fuel request statuses; approve, dispense and confirm; policy; `/fuel/summary`; `/fuel-accountability` |
| **I** | Motorbike fleet maintenance | `/api-admin/vehicles`, service schedules, `/maintenance`, `/defects`, documents, `/fleet/costs`; odometer from GPS |
| **G1** | Finance and tenant pages still on sample data | `/api-admin/accountability`, `/api-company/subscription` and `/invoices`, `/api-superadmin/tenants` and `/analytics` |

To see exactly what the frontend sends and expects, run it with `npm run dev:mock`, which answers from sample data in `src/mocks/`.
