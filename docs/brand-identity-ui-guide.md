# Shindraj Masale — Brand Identity & UI Direction

Derived from the client's price-list poster (शिंदराज मसाले). This is a working translation of their existing print/social brand into digital UI direction for the billing app — not an official brand guideline. **Colors below are estimated by eye from the poster image; get exact hex/Pantone values from the client if they have a formal brand kit, and swap them in before final build.**

---

## 1. Brand Basics

- **Name:** Shindraj Masale (शिंदराज मसाले)
- **Tagline:** *"चव शिंदेंची, शान महाराष्ट्राची!"* — "Taste of Shinde's, pride of Maharashtra"
- **Logo:** circular deep-maroon badge, white dafli/damaru (hand drum) icon, red chili graphic beneath, registered (®) mark
- **Branches shown on poster:** Lalbaug, Shivdi, Chiplun, Karad, Kadegaon *(more than the 2 currently scoped for the billing app — flagged in the project spec as an open question)*
- **Contact:** WhatsApp/phone icon pairing for customer care — worth mirroring this icon language for the app's own WhatsApp-share feature, since it's already a recognized brand pattern

---

## 2. Color Palette (estimated)

| Role | Approx. Hex | Where it's used on the poster |
|---|---|---|
| Primary — Deep Maroon | `#7A1F1F` | Logo badge, section header bars, table header rows, outer border |
| Secondary — Gold/Mustard | `#C9992F` | Divider lines, price-table column headers, decorative accents |
| Background — Warm Cream | `#F0E4C8` | Full page background, gives the "traditional/handmade" warmth |
| Accent — Chili Red | `#C41E3A` | Chili graphic, small high-emphasis accents (not backgrounds) |
| Text — Dark Maroon/Black | `#3D1414` | Body copy on cream background, high contrast |

**Usage logic for the app:**
- Maroon for primary structural elements (headers, nav bar, primary buttons)
- Gold for secondary emphasis (dividers, active-state underlines, table headers)
- Cream as the base background — avoid stark white, it breaks the brand warmth
- Chili red used sparingly, only for the highest-priority actions (e.g. "Generate Bill," "Share to WhatsApp") so it doesn't compete with maroon

---

## 3. Typography

- **Headings (Devanagari + English mix likely needed):** bold, slightly decorative display weight — mirrors the poster's confident, traditional feel. If building with system fonts, pair a strong Devanagari-capable font (e.g. Noto Sans Devanagari Bold / Baloo 2) for headers with a clean sans (Inter, Poppins, or similar) for English labels and numerals.
- **Body/table text:** clean, high-legibility sans — this is a shop-floor billing tool, operators need to read numbers fast, so body text should prioritize clarity over decoration even though headers can be more expressive.
- **Numerals (prices/quantities):** tabular figures where possible, so columns of numbers align cleanly — matters a lot for a billing table.

---

## 4. Motifs & Layout Language

- **Arched, ornate top border** framing the header — a strong brand signature. A literal arch is probably too heavy for a functional billing screen, but a simplified version (a subtle maroon-and-gold header band with a decorative bottom edge) can carry the same feeling without slowing down the UI.
- **Dotted/decorative divider** under section headings — easy, lightweight way to bring in the brand's traditional feel between form sections (e.g. under "Customer Details," under "Order Summary").
- **Bold color-block table headers** (maroon bar, gold text) — this maps almost directly onto the app's bill line-item table. Recommend carrying this pattern over close to verbatim, since it's the poster's clearest, most reusable UI pattern.
- **Product photography + prepared-dish imagery** at the bottom of the poster — not directly relevant to a billing tool's UI, but worth using on a splash/loading screen for brand warmth if there's room.

---

## 5. Translating This to the App's Screens

| Screen | Brand treatment |
|---|---|
| **Splash/intro screen** | Logo centered on cream background, tagline beneath, maroon arch-style header band |
| **Customer details form** | Cream background, maroon section header bar ("Customer Details"), gold underline/divider, maroon primary "Next" button |
| **Order builder (type + qty)** | Same header treatment; dropdowns styled with maroon border/gold focus state to feel native to the brand rather than a generic form control |
| **Bill table (particulars/qty/amount)** | Maroon-and-gold table header bar, alternating row shading in a light cream/tan tint for readability, red accent only on the "Generate Bill" / "Confirm" button |
| **Share screen** | Reuse the WhatsApp/phone icon pairing style from the poster's "For Customer Care" section for the "Share to WhatsApp" action — visually ties it back to something customers already recognize from the brand |

---

## 6. 2026 Redesign Addendum

Reworked the UI to a "digitized ledger" concept instead of a literal poster
recreation:

- **Palette:** chili red (`#b5362a`) as the single primary accent (actions,
  current step, bill-table headers), turmeric gold (`#c98a1f`) reserved for
  secondary emphasis (making-charge row, completed steps) — both grounded in
  the shop's own ingredients rather than picked for generic "brand color"
  reasons. Warm paper (`#faf7f2`) background instead of stark white or the
  poster's cream, so it still avoids the "AI-generated cream + terracotta"
  look.
- **Typography:** one family (Inter, + Noto Sans Devanagari for Marathi)
  carries headings through data, rather than pairing a separate display
  face — this is an operate-mode tool (forms, tables, search), not a
  marketing surface, so a second typeface would add noise without adding
  clarity.
- **Layout:** the step tracker became a vertical rail (the register's
  "spine") instead of horizontal pills; it collapses to a horizontal strip
  under 760px. The admin search dashboard reads as ledger rows (expandable
  for line-item detail), not a card grid, to match the same metaphor.
- **Marathi:** full UI toggle (`src/i18n.js`), default language Marathi,
  switchable to English. Data entry fields (customer name, area) already
  accept Marathi input natively via the OS keyboard/IME — no extra work
  needed there, only the labels/chrome needed translating.
- **Bill output:** a "Download PDF" option was added alongside the existing
  WhatsApp image share, for an actual printable document rather than only a
  PNG.

## 7. Open Items Before Final Build

- Confirm exact brand hex codes / logo files (vector, if available) with the client rather than relying on estimates from the poster photo
- Confirm whether the store-selector should list all 5 branches or just Lalbaug/Sewri (Shivdi) as originally scoped
- Confirm which Devanagari web font (if any) matches their existing print branding, or whether English-only UI is acceptable for the operator-facing tool
