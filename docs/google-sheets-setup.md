# Google Sheets logging setup

The billing app has no backend, so it logs completed orders to Google Sheets via
a Google Apps Script "Web App" bound to the spreadsheet — the browser sends a
POST request to that script's URL each time an order is fully confirmed, and the
script appends rows using the Sheet owner's own permissions. No user sign-in
happens inside the app.

Target sheet: https://docs.google.com/spreadsheets/d/1TNlcLvQ9ue-kJl6ap0WP14MPjYddwtbI1BdECxnNuc4/edit

## 1. Add the script to the sheet

1. Open the spreadsheet above.
2. **Extensions → Apps Script**. This opens a script editor already bound to
   this specific spreadsheet.
3. Delete any starter code in `Code.gs` and paste in the contents of
   `docs/apps-script-webhook.gs` (in this repo, right next to this file).
4. Click **Save** (the disk icon), name the project something like
   "Billing Webhook".

## 2. Deploy it as a Web App

1. Top-right **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → **Web app**.
3. Settings:
   - Description: `Billing webhook`
   - Execute as: **Me** (your Google account — this is what lets it write to
     the sheet without the app's users needing their own Google login)
   - Who has access: **Anyone** (required so the browser can call it; the URL
     itself is the only thing that gates access — don't publish it publicly)
4. Click **Deploy**. Google will ask you to authorize the script the first
   time — approve it (it's your own script acting on your own sheet).
5. Copy the **Web app URL** it gives you (ends in `/exec`).

## 3. Wire the URL into the app

Set the URL as an environment variable named `VITE_SHEETS_WEBHOOK_URL`:

- **Local dev**: create `.env.local` in the project root (already gitignored)
  with `VITE_SHEETS_WEBHOOK_URL=<the URL you copied>`, then restart `npm run dev`.
- **Vercel**: Project → Settings → Environment Variables → add
  `VITE_SHEETS_WEBHOOK_URL` with that value → redeploy.

Until this is set, the app runs exactly as before — it just skips the Sheets
write silently (check the browser console for a one-line warning).

## 4. Re-deploying after script edits

Apps Script Web App URLs stay the same across edits, but you still have to
**Deploy → Manage deployments → edit (pencil icon) → New version → Deploy**
each time you change the script, or your edits won't take effect.

## What gets logged

One row per confirmed bill (so a 2-item order writes 2 rows), with columns:

`Timestamp | Date | Customer Name | Phone | Area | POC | Billing Mode | Store | Masala Type | Quantity (kg) | Ingredients Subtotal | Making Charge | Total`

Add a header row with those labels as the first row of the sheet if you want
one — the script doesn't create it automatically, it just appends.
