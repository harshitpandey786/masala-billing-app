# Masala Billing & Order Platform — Product Spec (Draft v0.1)

**Client:** FMCG masala brand, Lalbaug, Mumbai (multiple retail locations)
**Problem being solved:** Replace manual bill-writing for both ready-to-eat and *customized* masala orders with a digital tool that (a) speeds up billing, (b) auto-calculates ingredient pricing, and (c) produces a shareable record per customer.

---

## 1. User Flow

### Step 1 — Customer Details Screen
Shown after splash/intro screen. Operator (salesman) fills in:
- Customer name
- Phone number
- Area/place in Mumbai (free-text input)
- Billing mode: **Online** or **Offline**
  - If Offline → select store: **Lalbaug** or **Sewri**
- Date (may default to today, shown near the top)

### Step 2 — Order Builder
Operator selects, for each item the customer wants:
- **Masala type** (dropdown): *Malvani* / *Ghati*
- **Quantity** (dropdown or numeric): e.g. 1, 1.25, 3, 4, 5 kg
- A **+** button adds another type/quantity line (e.g. Malvani 1.25 kg + Ghati 3 kg in the same order)

Each (type, quantity) combination the customer orders becomes **its own separate bill** downstream — they are generated and confirmed one at a time, in the order they were added.

### Step 3 — Per-Item Bill Generation
For each (type, quantity) pair, clicking **Generate Bill** produces an itemized, editable table:

| Particulars | Quantity | Amount |
|---|---|---|

Rules:
- The **ingredient list and default quantities (in grams)** for a given masala type + base quantity (e.g. "Malvani 1.25") come from a **reference recipe list** (to be supplied) — the "1.25" here refers to the base chili quantity that anchors the recipe.
- Row order is **fixed/rigid** (must match the physical prep sequence) — reordering is not allowed, but quantity and amount are editable, and new ingredient rows can be inserted *between* existing rows.
- **Pricing logic**: ingredient quantities are stored/entered in **grams**, but the rate card is priced **per kg**. The app must convert kg→gram rate and compute amount = (gram qty ÷ 1000) × per-kg rate. Editing the quantity must live-recalculate the amount.
- **Special line items:**
  - Three chili-type ingredients (codes **GTDC, ABDC, AKDC**) — quantities pre-set per recipe, but the operator can also **add more chilies** via a dropdown of allowed chili ingredients, with quantity input and auto-priced amount.
  - **JF (Jaiphal / nutmeg)** — priced **per piece**, not per gram. Appears as its own line, quantity = number of pieces, editable.
  - **Making charges** — flat **₹100/kg** on the *total* order weight, auto-calculated and appended as a final line item (e.g. 4,000g total → 4 kg × ₹100 = ₹400).
- Operator confirms the bill, then moves to the next item's bill (if any), until all items in the order are done.

### Step 4 — Share / Output
- If the customer ordered **one item**: a share option (PDF or shareable image) appears right after that single bill.
- If the customer ordered **multiple items**: after the last item's bill is confirmed, a **combined document** covering all bills for that customer/order is generated, with a **Share to WhatsApp** option (PDF or image).
- Storage (database vs. Google Sheets vs. none) is **explicitly deferred** — out of scope for v1 beyond generating the shareable document.

---

## 2. Data Inputs Needed From Client (not yet provided)

These are referenced in the brief but not yet attached — nothing downstream can be built accurately without them:

1. **Recipe list per masala type + base quantity** (e.g. Malvani 1.25, Malvani 3kg, Ghati 1.25, Ghati 3kg, etc.) — full ingredient breakdown with default gram quantities, in the fixed prep order, using the client's ingredient codes (e.g. "DC" = Elaichi).
2. **Rate card** — price per kg for each ingredient code, plus per-piece rate for Jaiphal (JF).
3. **List of "addable" chili ingredients** for the GTDC/ABDC/AKDC add-ingredient dropdown.
4. **Full list of masala base types/quantities** the shop sells (confirm it's just Malvani × Ghati, or are there more types beyond these two?).
5. **Brand identity/style guide** (colors, logo, fonts) for the UI.
6. Confirmation on the **making charges** edge case: is it ₹100/kg per *individual item bill*, or per *combined customer order*? (Brief implies per item bill, worth confirming.)
7. Any existing branding for **Sewri** vs **Lalbaug** store — do bills need store-specific headers/letterheads?

---

## 3. Open Questions / Ambiguities to Resolve

- **Rounding:** how should gram-to-price conversion round (nearest rupee, 2 decimals, etc.)?
- **Editable quantity re-triggering making charges:** if the operator edits ingredient quantities after generation, should the making-charges total recalculate live too?
- **Bill numbering/IDs:** does each bill need a unique invoice/bill number for the client's own tracking, even without a database yet?
- **Multi-device use:** will multiple salesmen use this simultaneously across Lalbaug and Sewri, or is it single-device per shop?
- **Offline resilience:** does this need to work without internet access at the counter (since it's a shop-floor tool)?
- **PDF vs image share:** any preference, or is "whichever is easiest to WhatsApp" fine? (PDF is generally more reliable for line-item bills.)

---

## 4. Suggested Tech Approach (for Claude Code)

Given this is a shop-floor, tablet/desktop-browser tool with structured forms, calculated tables, and PDF export + WhatsApp share:

- **Frontend:** React (single-page app), simple state machine for the multi-step flow (Customer Details → Order Builder → Bill 1 → Bill 2 → ... → Share)
- **Calculation logic:** a small pricing engine module — recipes + rate card as structured JSON/config data, loaded once, so updating prices later doesn't require touching UI code
- **PDF generation:** client-side (e.g. a PDF library) so no backend is strictly required for v1
- **WhatsApp share:** simplest path is generating the PDF/image and using WhatsApp's share/click-to-chat link or native share sheet (mobile browser) — full API integration is a later-phase item if needed
- **Storage:** stub this out now (e.g. save to local JSON/localStorage or a simple Google Sheets append) so it's not blocking, but keep the real database decision for a later phase as you noted

### Recommended immediate next steps in your project folder
1. Drop the recipe list, rate card, and chili add-on list in as CSV/JSON files — this becomes your pricing engine's data layer.
2. Have Claude Code scaffold the React app with the 4-step flow above as separate components/screens.
3. Build the pricing engine as a pure, testable function first (recipe + rate card → priced line items) before wiring up UI — this is the part most likely to have edge cases (JF per-piece, chili add-ons, making charges) and is easiest to get right in isolation.
4. Wire up the multi-bill sequencing and final combined-PDF assembly last.

