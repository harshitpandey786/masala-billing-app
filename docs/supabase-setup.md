# Supabase setup

The billing app has no backend, so it writes completed orders straight to
Supabase from the browser using the public "anon" key. That's safe here
because the table only grants that key permission to **insert** rows, not
read, update, or delete them -- so even though the key is visible in the
app's shipped JS, it can't be used to read customer data back out or tamper
with existing rows.

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
  ```
  then restart `npm run dev`.
- **Vercel**: Project → Settings → Environment Variables → add both
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` → redeploy.

Until both are set, the app runs exactly as before and just skips the
Supabase write silently (check the browser console for a one-line warning).

## Viewing the logged data

Supabase dashboard → **Table Editor** → `bills`. Click a row's `line_items`
cell to expand the JSON and see that bill's full ingredient breakdown.

To pull out a specific ingredient's quantity across many bills in SQL:

```sql
select customer_name, order_date, item ->> 'code' as code, item ->> 'qty' as qty
from public.bills, jsonb_array_elements(line_items) as item
where item ->> 'code' = 'GTDC'
order by order_date desc;
```

You can also export the table to CSV from the Table Editor (the `line_items`
column comes through as a JSON string in the CSV), or connect a BI/marketing
tool directly to the Postgres database if needed later.
