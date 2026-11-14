# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the owner/manager of Shindraj Masale, working on a laptop or desktop, generating and reviewing bills and checking the admin dashboard. Shop locations also log in (multi-shop `LocationLogin`) to build orders and generate bills day-to-day; device mix at those locations is not yet confirmed, so design for desktop/laptop first and keep touch targets comfortable rather than assuming touch-only.

## Product Purpose

A billing and order-register app for Shindraj Masale, a masala (spice) FMCG business. Staff build an order (custom masala blends priced by ingredient + making charge, or ready-made/loose products priced by qty), generate a bill per item, and share the finished bill (WhatsApp/PDF image). An admin side (`src/admin/*`) covers pricing management, per-location stock, customer lookup/history, and business analytics.

## Positioning

Strictly an internal tool for Shindraj Masale's own shop locations — not a product to license or white-label to other businesses. Branding, copy, and visual identity can stay tied to this specific business rather than staying generic/multi-tenant.

## Operating Context

- Multi-shop: staff authenticate per location (`LocationLogin`/`locationSession.js`); each location has its own stock (barcoded products, `productLookup.js`, `decrementStock`).
- Order flow is a linear wizard: customer details → order builder → per-item bill generation → share. Custom masala items go through ingredient-based pricing (`pricingData.js`, recipe tiers); ready-made products skip straight to a synthesized bill line.
- Bills are logged to Supabase (`orderLogger.js`) and the finished bill is shared as a flat image/PDF, primarily over WhatsApp.
- Bilingual: Marathi (`lang="mr"`, Devanagari font stack) and English, toggled via `LanguageToggle`/`i18n.jsx`.
- Admin dashboard: pricing manager, customer profiles/history, bill ledger, per-location analytics.

## Capabilities and Constraints

- The printable/shareable bill (`ShareOutput`) must always render flat and legible — no glass/blur/translucency may touch it, regardless of what the rest of the app looks like, because it becomes a WhatsApp image and a PDF.
- Marathi (Devanagari) and English both need type treatment that reads as native to that script, not one font stretched across both.
- Order entry must stay fast and low-friction: no added steps, animation delay, or visual noise that slows someone down mid-sale with a customer waiting at the counter.
- Pricing rounds to the whole rupee (client-confirmed); custom masala pricing has ingredient + making-charge breakdown; recipe tiers (4kg/5kg) still pending exact data per prior session notes.
- Stack is an existing Vite + React 19 app (not greenfield) using `motion/react` for transitions, Supabase for data, no CSS framework (hand-written `src/styles.css`).

## Brand Commitments

- Business name: Shindraj Masale (masala/spice business), logo mark at `/logo-mark.png`.
- Current palette is drawn from the shop's own chili/turmeric colors (not arbitrary), with an accent orange matched to shindrajmasale.com's link/highlight color — this brand-color grounding should carry forward even if the surface treatment (glass vs. something else) changes.

## Evidence on Hand

- Existing shipped app and CSS are the incumbent visual system (liquid-glass reskin, committed in `fb77dc9`), currently mid-tweak on page-transition motion and theme-color in the working tree.
- No existing PRODUCT.md or DESIGN.md prior to this file; no user research docs, no design references on file beyond the CSS comments describing intent.

## Product Principles

1. Billing speed over visual flourish — nothing in the shell should cost the counter a second mid-sale.
2. The shareable bill is sacred: it is a business document that leaves the app (WhatsApp/PDF) and must stay plain, legible, and unaffected by whatever chrome styling wraps the app.
3. Bilingual by design, not by patch — Marathi and English are both first-class, not one localized on top of the other.
4. Brand color is grounded in the real business (chili/turmeric/shindrajmasale.com accent), not a generic palette swap.
5. Internal tool for one business — it's fine to bake in Shindraj Masale's specific identity rather than staying generic.
