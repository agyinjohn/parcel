# Backend: what's left

Checked against `https://backend-test.mandmservicescorp.org/shortly/v3/api-docs` on 28 Nov 2026, after the backend team finished the previous list. Everything from that list is in place, and the frontend now uses it, including:
- customer portal, SMS link, codes and bookings;
- delivery pricing and the pricing review;
- driver money safety and the integrity check;
- duplicate assignments;
- POD payouts;
- partner applications, batch and edit;
- pickup pins and opening hours.

These few things remain, most important first.

---

## 1. Company name on customer parcels

The customer portal (`/receive`) is ParcelFlow-branded and serves every company, so each parcel must say which company it's from ("Sent through M&M Delivery · Accra Central").

**Add to `CustomerParcel`** (used by `GET /api-user/parcel-search`, `GET /api-user/customer-links/{token}` and the `parcel` field of `GET /api-tracking/{id}/track`):

| Field | Type | Notes |
|---|---|---|
| `companyName` | string | The company (tenant) that owns the parcel. |
| `companyLogoUrl` | string, nullable | If the company has uploaded one. |

**Also confirm:** the phone search, the SMS link and the one-time code look across **all** companies, not just one. One phone number can have parcels from several companies.

---

## 2. Two schema name clashes in the API docs

The responses may well be right; the docs show the wrong shape, as happened earlier with `Summary`.

- **`Review`:** `GET /api-admin/delivery-pricing/review` is documented as returning `Review`, but that's the partner-application review (`status`, `note`, `createVendor`, `officeIds`). Rename one class, e.g. `PricingReview` and `PartnerApplicationReview`.
  - The frontend expects `{ officeId, officeName, from, to, table, statsTableVersion, statsSince, bands[], staff[] }`. Each `bands[]` item has `key, label, kind (BAND|ZONE), upToKm, zoneName, deliveries, suggestedMedian, chargedMedian, overrides, overrideReasons, avgKmDriven, avgMinutes, quotesShown, quotesBooked`.
- **`QuoteRequest`:** `POST /api-frontdesk/delivery-pricing/quote` is documented with the *customer* quote body (`token`, `phoneNumber`, `parcelIds`, …). The intake form sends `{ latitude, longitude, weightKg, fragile }`. Please confirm weight and fragile are used in the intake quote, and give it its own request class, e.g. `StaffQuoteRequest`.

---

## 3. Duplicate assignments: document the response

`GET /api-admin/assignments/duplicates` is typed as a list of maps. The admin page expects this shape; please return it and document it:

```json
[{ "parcelId": "PF240037", "receiverName": "Ama Mensah",
   "assignments": [ { "assignmentId": "...", "riderId": "...", "riderName": "Kwame Asante", "status": "ASSIGNED", "assignedAt": 1795000000000 } ] }]
```

List `assignments` newest first: the fix keeps the first one.

---

## 4. Partner logins: station list access

The partner portal fills "Destination station" from `GET /api/offices/locations`. Please confirm a `VENDOR` token can read it, limited to that partner's company. Anonymous calls get 403, which is right.

---

## 5. Decision needed: online payment for customer deliveries

`POST /api-user/delivery-requests` requires a verified Paystack payment. Before going live, decide whose Paystack account receives the money:
- **One ParcelFlow account,** settling each company later.
- **Each company's own account,** via Paystack sub-accounts (split payments).
- **No online payment:** pay the rider on delivery. This would need the endpoint to accept a booking without `paystackReference`, with `paymentMethod: "ON_DELIVERY"`.

No frontend Paystack key is set yet (`VITE_PAYSTACK_PUBLIC_KEY`).
