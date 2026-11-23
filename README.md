

Welcome! This project belongs to Synergetics Hub - Home of digital solutions

## Getting started

> **Prerequisites:**
> The following steps require [NodeJS](https://nodejs.org/en/) to be installed on your system, so please
> install it beforehand if you haven't already.

To get started with your project, you'll first need to install the dependencies with:

```
npm install
```

Then, you'll be able to run a development version of the project with:

```
npm run dev
```

After a few seconds, your project should be accessible at the address
[http://localhost:5173/](http://localhost:5173/)


If you are satisfied with the result, you can finally build the project for release with:

```
npm run build
```

## Demo mode (sample data, no backend)

```
npm run dev:mock
```

This answers every API call from built-in sample data (`src/mocks/`), so you can click through the app without the backend. Changes you make (registering parcels, marking deliveries) last until you reload the page. Normal `npm run dev` and `npm run build` don't include any of this.

Sign in with any password using one of these phone numbers:

| Phone        | Role        |
|--------------|-------------|
| 0200000001   | Admin       |
| 0200000002   | Manager     |
| 0200000003   | Front desk  |
| 0200000004   | Call center |
| 0200000005   | Rider       |
| 0200000006   | Super admin |

Screenshots of each role are in `screenshots/`.
