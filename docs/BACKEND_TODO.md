# Backend: what to work on now

The outstanding backend work as of 28 Nov 2026, checked against `https://backend-test.mandmservicescorp.org/shortly/v3/api-docs`. Everything else in the full handoff doc (`docs/BACKEND_HANDOFF.md`) is done on `backend-test`, and the frontend uses it. That includes the five admin report endpoints (counter cash-ups, payout summary, POD owed, long-waiting fees, missing parcels), whose responses match what the new **Cash & Driver Reports** page expects.

Work in this order:
1. **Pickup location pin** (still open): four schemas need five new fields.
2. **Schema name clash** (still open): a documentation fix.
3. **New:** company signup email link.
4. **New:** paying POD money out to the sender.
5. **New:** riders don't accept assignments.
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
