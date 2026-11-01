# Supabase setup

The billing app has no backend, so it writes completed orders straight to
Supabase from the browser using the public "anon" key.

The app now also ships an **owner dashboard** (`/admin`) that searches past
orders, which needs that same anon key to be able to *read* rows too (see
[§6](#6-enable-the-owner-search-dashboard-admin)). Once that's turned on,
the read access applies to anyone who has the anon key -- which is anyone
who opens the app, since it ships in the browser JS. The `/admin` password
only gates the dashboard's UI; it is not a substitute for real row security.
Treat it as a deterrent against casual snooping, not as protecting the data
from someone who goes looking for the key in the network tab.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in / create an account.
2. **New project** — pick an org, name it (e.g. "shindraj-billing"), set a
   database password (save it somewhere, you won't need it for this setup but
   Supabase requires one), pick a region close to your users.
3. In the **Security** section of the create-project form:
   - **Enable Data API**: keep checked (required -- this is what `supabase-js`
     talks to).
   - **Automatically expose new tables**: uncheck it. The SQL below grants
     access to just the `bills` table explicitly, which is safer than every
     future table being auto-exposed to the public API.
   - **Enable automatic RLS**: leave unchecked -- the SQL below enables RLS on
     the `bills` table explicitly.
4. Create the project and wait for provisioning (~2 minutes).

## 2. Create the `bills` table

One row per confirmed bill (customer + order summary), with its full
ingredient breakdown (code, quantity, unit, amount) nested as JSON in the
`line_items` column -- so the table stays one-row-per-bill and easy to scan
in the Table Editor, while still capturing every ingredient on the bill.

(An earlier version of this used a second `bill_line_items` table with one
row per ingredient. That's a more "correct" relational design for
aggregating across bills in SQL, but it's harder to browse directly --
JSON-per-bill won this tradeoff for how this data actually gets used.)

1. In the project, open the **SQL Editor** (left sidebar).
2. Paste and run this:

```sql
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_date date not null,
  customer_name text not null,
  phone text not null,
  area text,
  poc_name text,
  billing_mode text,
  store text,
  masala_type text,
  quantity_kg text,
  ingredients_subtotal numeric,
  making_charge numeric,
  total numeric,
  line_items jsonb
);

alter table public.bills enable row level security;

create policy "Allow anonymous inserts"
  on public.bills
  for insert
  to anon
  with check (true);

-- Needed because "Automatically expose new tables" is off: RLS policies
-- control which rows are visible/writable, but the anon role still needs
-- this base grant before it can touch the table via the API at all.
grant usage on schema public to anon;
grant insert on public.bills to anon;
```

This creates one row per confirmed bill (so a 2-item order writes 2 rows).
The RLS policy only allows inserting new rows via the public key -- reading
the data back requires logging into the Supabase dashboard directly.

### If you already ran the older two-table version

Run this instead to migrate in place (keeps existing rows, just reshapes
the schema):

```sql
alter table public.bills add column line_items jsonb;
alter table public.bills alter column id set default gen_random_uuid();
drop table public.bill_line_items;

-- Optional: clean up test rows created while verifying the connection
delete from public.bills where customer_name in (
  'Test Customer', 'App Flow Test', 'Direct Client Test',
  'Network Verify Test', 'Fetch Intercept Test'
);
```

## 3. Get the API credentials

1. **Project Settings → API** (left sidebar, gear icon).
2. Copy the **Project URL** and the **anon / public** key (not the
   `service_role` key -- that one must never go in client-side code).

## 4. Wire the credentials into the app

Set two environment variables:

- **Local dev**: create `.env.local` in the project root (gitignored) with:
  ```
  VITE_SUPABASE_URL=<project URL>
  VITE_SUPABASE_ANON_KEY=<anon key>
  VITE_ADMIN_PASSWORD=<pick a password for the /admin dashboard>
  ```
  then restart `npm run dev`.
- **Vercel**: Project → Settings → Environment Variables → add
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ADMIN_PASSWORD` →
  redeploy.

`VITE_ADMIN_PASSWORD` gates the `/admin` search dashboard (see §6). Like the
other `VITE_`-prefixed variables it ends up in the shipped JS, so pick
something that keeps out casual lookers rather than something you'd reuse
anywhere sensitive.

Until both are set, the app runs exactly as before and just skips the
Supabase write silently (check the browser console for a one-line warning).

## 5. Add export-friendly views (for sharing data with the client)

The `bills` table itself is right for the app (fast inserts, flexible JSON),
but exporting it straight to CSV dumps `line_items` as a raw JSON string in
each cell -- unreadable in Excel/Sheets. These two read-only views present
the same data flattened out, so exporting one of them to CSV just works.

Run this once in the **SQL Editor**:

```sql
-- One row per bill, no JSON -- the quick export for customer/spend data.
create view public.bill_summaries as
select
  id,
  created_at,
  order_date,
  customer_name,
  phone,
  area,
  poc_name,
  billing_mode,
  store,
  masala_type,
  quantity_kg,
  ingredients_subtotal,
  making_charge,
  total
from public.bills
order by created_at desc;

-- One row per ingredient per bill, flattened out of line_items -- for
-- ingredient-level detail in a normal spreadsheet shape.
create view public.bill_ingredients as
select
  b.id as bill_id,
  b.order_date,
  b.customer_name,
  b.phone,
  b.masala_type,
  b.quantity_kg,
  item ->> 'code' as ingredient_code,
  (item ->> 'qty')::numeric as qty,
  item ->> 'unit' as unit,
  (item ->> 'amount')::numeric as amount
from public.bills b,
  jsonb_array_elements(b.line_items) as item
order by b.order_date desc, b.id;
```

These aren't granted to the `anon` role, so they're not reachable through
the app's public API -- only visible to whoever's logged into the Supabase
dashboard directly, same access level as the `bills` table itself.

## Viewing and sharing the logged data

Supabase dashboard → **Table Editor** → pick `bill_summaries` or
`bill_ingredients` from the table list on the left (views show up alongside
tables) → **Export data** (top right) → CSV. That's what to hand off to the
client on whatever cadence they need it.

If you want raw SQL instead (e.g. to filter to a date range first):

```sql
select * from public.bill_summaries where order_date >= '2026-07-01';
select * from public.bill_ingredients where ingredient_code = 'GTDC';
```

You can also connect a BI/marketing tool directly to the Postgres database
and point it at these views if the client wants something more automated
than manual CSV exports down the line.

## 6. Enable the owner search dashboard (`/admin`)

The app's `/admin` page lets the owner search every customer's order
history -- by name or phone, optionally filtered by date -- and see the
same line-item detail that's on each bill. It reads straight from the
`bills` table using the anon key, which today can only **insert**. Run this
once to also let it **read**:

```sql
create policy "Allow anonymous reads"
  on public.bills
  for select
  to anon
  using (true);

grant select on public.bills to anon;
```

Then set `VITE_ADMIN_PASSWORD` as described in §4. Opening `/admin` asks for
that password before showing anything; it's stored in the browser's session
storage (cleared when the tab closes) rather than persisted, so it has to be
re-entered each time the dashboard is opened fresh.

**Security note:** this SELECT policy makes every row in `bills` readable by
the anon key, which ships in the app's public JS bundle -- the `/admin`
password is a UI gate, not row-level security. Anyone who extracts the anon
key from the network tab can query the table directly regardless of the
password. That's an acceptable tradeoff for a small shop's internal tool,
but if the data ever needs real protection (hiding it from someone who goes
looking, not just from accidental stumbling), the fix is to move the search
behind a server endpoint that checks the password server-side and queries
with the `service_role` key instead -- ask for that upgrade if it becomes
necessary.
