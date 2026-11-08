# Project Brief: Shindraj Masale Billing App

## 1. One-line pitch
A mobile-friendly web app that replaces handwritten masala bills with a guided digital flow that auto-calculates ingredient pricing and shares the finished bill straight to WhatsApp.

## 2. Problem and user
**Client:** Shindraj Masale, a masala (spice blend) retail brand with multiple stores in and around Lalbaug, Mumbai.
**User:** The shop's salespeople (operators), who stand at the counter and bill customers for custom masala orders.
**Problem it solves:** Masala orders are customized (a customer picks a type and a quantity, and the exact ingredient mix and price has to be worked out for that quantity). Before this app, that meant a salesperson hand-writing an itemized bill and doing the gram-to-rupee math themselves. The app replaces that manual, error-prone process: it picks the right recipe, does the math, and produces a shareable bill in a fixed, repeatable flow. It replaces pen-and-paper billing, not an existing piece of software.

## 3. Key features
- Guided 4-step flow: Customer Details, Order Builder, Bill (one per item), Share.
- Pricing engine auto-converts ingredient grams to rupees using a per-kg rate card, rounded to the nearest rupee as the client requested.
- One order can mix multiple masala types/quantities; each becomes its own itemized bill, then a combined summary with a grand total.
- Operators can edit a bill before confirming it: change quantities, add extra chili ingredients from a fixed dropdown, or override the making charge.
- One-tap share of the finished bill as an image straight to the customer's WhatsApp chat, plus a PDF download option.
- Bilingual interface (Marathi by default, English toggle) and installable as a home-screen app (PWA) on a phone or tablet.
- Owner-only admin dashboard at `/admin` (password gated) to search every past order by customer name or phone, filter by date, and see total bills/revenue/unique customers.
- Every confirmed bill is logged automatically to a shared database so the owner has a running record without any extra paperwork.

## 4. Tech stack

| Layer | Tool | What it does here |
|---|---|---|
| Frontend framework | React 19 | Renders the billing flow and admin dashboard as a single-page app |
| Build tool | Vite 8 (+ `@vitejs/plugin-react`) | Dev server and production bundling |
| Styling | Plain CSS (`src/styles.css`, ~900 lines) + Google Fonts (Noto Sans Devanagari) | All visual styling; no CSS framework |
| Backend/API | None | The browser talks directly to Supabase; there is no custom server or API route |
| Database | Supabase (hosted Postgres) | Stores one row per confirmed bill, with the ingredient breakdown nested as JSON |
| Authentication | None for the billing flow; a single shared password (env var) gates `/admin` | Keeps casual visitors out of the owner dashboard; not real access control (see Limitations) |
| File storage | None | Bill images/PDFs are generated and downloaded in the browser, never stored server-side |
| Hosting/deployment | Vercel, inferred from a commit titled "Trigger redeploy to pick up Supabase env vars"; the live URL is not found in code | Builds and serves the static frontend on every push |
| Third-party libraries | `html2canvas` (bill HTML to image), `jspdf` (image to multi-page PDF), WhatsApp's `wa.me` click-to-chat link | Power the "Share to WhatsApp" and "Download PDF" features |
| AI models, payments, email, analytics | None found in code | Not found in code |

## 5. Architecture in plain English
There is no custom backend. The React app runs entirely in the operator's browser. When a bill is confirmed, the browser itself calls Supabase's API directly using a public key, and Supabase's database handles the write. Pricing math (recipes, rate card) is a static JSON file bundled into the app, so no server round-trip is needed to price a bill.

```
Operator's phone/tablet browser
   |
   |  1. Fills Customer Details, builds Order, edits/confirms each Bill
   |     (all pricing math happens locally, via pricing-config.json)
   v
React app (Vite build, hosted on Vercel)
   |
   |  2. On bill confirmation, fire-and-forget insert
   v
Supabase (hosted Postgres + public API)
   |
   |  3. Admin dashboard (/admin) later reads this same table
   v
Owner's browser, searching past orders
```

The share step (WhatsApp/PDF) never leaves the browser: `html2canvas` turns the on-screen bill into an image, and either WhatsApp's web link or the device's native share sheet takes it from there.

## 6. Database
One Supabase project, one real table:
- **`bills`**: one row per confirmed bill (not per order). Columns: order date, customer name/phone/area/POC, billing mode, store, masala type, quantity, ingredients subtotal, making charge, total, and `line_items` (a JSON array of every ingredient's code/quantity/unit/amount for that bill).
- **`bill_summaries`** and **`bill_ingredients`**: read-only views over `bills` that flatten the JSON into plain spreadsheet rows, created purely so the owner can export clean CSVs.

**Security:** Row Level Security (RLS) is enabled on `bills`. One policy allows the public "anon" key to insert rows (so the billing flow can log orders); a second policy, added later, allows that same key to read rows (so `/admin` can search). Because the anon key ships inside the browser's JS bundle, the `/admin` password is a UI deterrent, not a true access-control boundary; this tradeoff is documented explicitly in the project's own setup notes.

## 7. Where everything lives
- **Code:** GitHub, [harshitpandey786/masala-billing-app](https://github.com/harshitpandey786/masala-billing-app).
- **Hosting:** Vercel, inferred from git history and docs; the exact live URL is not found in code.
- **Database:** A Supabase project (name/URL not found in code, only referenced via environment variable names).
- **Secrets/environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`. Managed locally in a gitignored `.env.local` file, and in Vercel's Project Settings for production.

## 8. How a change goes live
Edit code locally, commit, and `git push` to `main`. Based on the commit history (a commit exists specifically to "trigger redeploy"), pushing to the connected GitHub repo triggers an automatic Vercel build (`vite build`) and deploy; there is no manual deploy step or separate staging environment visible in the code.

## 9. Folder structure
- [src/App.jsx](src/App.jsx): the 4-step state machine that drives the whole billing flow.
- [src/steps/](src/steps/): the four screens, `CustomerDetails.jsx`, `OrderBuilder.jsx`, `BillGenerator.jsx`, `ShareOutput.jsx`.
- [src/admin/](src/admin/): the owner dashboard, `AdminApp.jsx`, `AdminLogin.jsx`, `AdminDashboard.jsx`.
- [src/pricing-engine.js](src/pricing-engine.js): the pure, testable function that turns a recipe plus overrides into priced line items.
- [src/pricing-engine.test.js](src/pricing-engine.test.js): 12 automated tests covering the pricing rules.
- [src/recipeCatalog.js](src/recipeCatalog.js) and [src/orderLogger.js](src/orderLogger.js): recipe lookup helpers and the Supabase insert logic.
- [src/i18n.jsx](src/i18n.jsx): the Marathi/English string dictionary and language context.
- [data/pricing-config.json](data/pricing-config.json): the actual recipes, rate card, and making-charge rules, the "data layer" that can change without touching code.
- [docs/](docs/): the original product spec, the brand/UI direction doc, and the Supabase setup guide.

## 10. Hard problems solved
- **Pricing correctness:** gram-to-kg rate conversion, whole-rupee rounding, per-piece pricing for one ingredient (Jaiphal/nutmeg), fixed vs. weight-based making charges, and inserting operator-added chili rows at a fixed position in the bill (matching the physical prep order) rather than at the end. All of this is covered by 12 passing automated tests.
- **Sharing a specific bill to a specific customer without a backend:** WhatsApp's web link can either open a named contact's chat or attach a file, never both. The app works around this by opening the customer's chat and downloading the bill image at the same time, for a one-step manual attach.
- **Keeping "Share" a single click:** generating the bill image takes over 500ms, and browsers revoke the permission needed for the native share sheet if there is any delay after the click. The app pre-generates the image as soon as the summary screen loads, so the click itself stays instant.
- **Database schema redesign for the owner's actual workflow:** the bills table was changed from a "correct" relational design (one row per ingredient) to one row per bill with ingredients nested as JSON, trading SQL purity for a table the shop owner can browse and export directly.
- **An explicit, documented security tradeoff:** rather than silently shipping a weak admin gate, the setup docs call out that the admin password only protects the UI, not the underlying data, and spell out the real fix if that ever becomes necessary.

## 11. Scale and numbers
- 18 JavaScript/JSX source files, about 1,860 lines of app code plus about 900 lines of CSS.
- 12 commits total; project started 2026-07-11, latest commit 2026-11-01 (about 3.5 months of work).
- 12 automated tests, all passing, all on the pricing engine.
- 3 priced recipes live today (Malvani 1.25kg, Malvani 3kg, Ghati 1.25kg); 37 ingredient codes in the rate card.
- 1 real database table plus 2 export-only views.
- 0 custom backend/API routes; this is a backend-less (frontend-plus-database) architecture.
- 2 physical store locations supported (Lalbaug, Sewri); 2 languages (Marathi, English).

## 12. Limitations and what I would improve next
- Only 3 of the planned recipe tiers exist; larger quantities (4kg, 5kg) and possibly more masala types are waiting on exact ingredient ratios from the client, not yet built.
- The admin dashboard's data access rides on the same public key that ships in the browser, so the password only stops casual lookers, not someone who inspects the network traffic. The documented fix is a small server-side endpoint that checks the password and queries with a private key instead.
- There is no offline handling: if Supabase is unreachable, the order simply fails to log silently (billing itself still works, but the record is lost).
- Admin access is a single shared password in an environment variable, with no individual accounts, roles, or audit log of who viewed what.
- Only the pricing engine has automated tests; the step-by-step UI flow and the WhatsApp/PDF sharing are verified by hand, not by any test suite.

## 13. Interview answers

**30-second version:** "I built a billing app for a masala retail brand in Mumbai. Their salespeople used to hand-write custom orders and do the pricing math themselves. My app walks them through customer details, order building, and a per-item bill that auto-calculates pricing from a rate card, then shares the finished bill straight to the customer's WhatsApp. I also built an owner dashboard to search past orders. I directed an AI coding assistant to build it with me, writing the product spec and pricing rules myself and reviewing everything it produced."

**2-minute version:** "The client sells masala blends from a couple of stores near Lalbaug, Mumbai, and part of their business is custom orders, a customer picks a masala type and a quantity, and the exact ingredient mix and price depends on that. Before this, a salesperson worked that out by hand on paper. I scoped this as a product: I wrote the spec, defined the four-step flow, the pricing rules, like rounding to whole rupees and one ingredient being priced per piece instead of per gram, and worked with the client to confirm them. I used Claude Code, an AI coding assistant, to build the actual React app, a pricing engine as a small testable function, and a Supabase database to log every order. I pushed for automated tests on the pricing logic specifically because that's the part most likely to have silent bugs, twelve tests cover rounding, overrides, and edge cases today. I also added an admin dashboard so the owner can search past orders by customer, and I made a deliberate, documented tradeoff on its security given this is a small shop's internal tool, not a system handling sensitive data. The whole thing deploys automatically from GitHub."

**Likely follow-up questions:**
1. *Did you write the code yourself?* "No, I directed an AI coding assistant, Claude Code, to write it. I wrote the product requirements and pricing rules, reviewed the architecture and tradeoffs, and tested the actual billing flow myself. I can explain any part of how it works."
2. *Why no backend server?* "The app's only real need is to write and later read bill records, and Supabase gives me a secure-enough hosted database with a direct browser API for that. Adding a custom server would have meant hosting and maintaining it for a feature set that doesn't need one yet."
3. *How do you know the pricing math is correct?* "It's isolated into one pure function, recipe plus rate card in, priced line items out, with twelve automated tests covering the rounding rule, the per-piece ingredient, fixed versus weight-based making charges, and the edge cases, like adding extra chilies or an unknown ingredient code."
4. *What's the biggest risk in this system right now?* "The admin dashboard's database access key ships inside the public JavaScript bundle, so the password on that page is a UI deterrent, not real security. I documented that tradeoff rather than hide it, and the fix, if the client ever needs it, is a small server-side check instead of a browser-side one."
5. *What would you build next?* "The remaining recipe tiers once the client gives me exact ingredient ratios, I won't guess at those, and a safer way to protect the admin dashboard's data if the business grows past being comfortable with the current tradeoff."
