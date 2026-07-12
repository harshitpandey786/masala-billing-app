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

## 2. Create the `bills` and `bill_line_items` tables

`bills` holds one row per confirmed bill (customer + order summary).
`bill_line_items` holds one row per ingredient on that bill (code, quantity,
amount), linked back via `bill_id` -- so the full masala + ingredient
breakdown for every order is queryable, not just the totals.

1. In the project, open the **SQL Editor** (left sidebar).
2. Paste and run this:

```sql
create table public.bills (
  id uuid primary key,
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
  total numeric
);

create table public.bill_line_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  code text not null,
  qty numeric not null,
  unit text not null,
  amount numeric not null,
  line_order integer not null
);

alter table public.bills enable row level security;
alter table public.bill_line_items enable row level security;

create policy "Allow anonymous inserts"
  on public.bills
  for insert
  to anon
  with check (true);

create policy "Allow anonymous inserts"
  on public.bill_line_items
  for insert
  to anon
  with check (true);

-- Needed because "Automatically expose new tables" is off: RLS policies
-- control which rows are visible/writable, but the anon role still needs
-- this base grant before it can touch either table via the API at all.
grant usage on schema public to anon;
grant insert on public.bills to anon;
grant insert on public.bill_line_items to anon;
```

`bills.id` has no default -- the app generates the UUID client-side and sends
it explicitly, so it can insert the matching `bill_line_items` rows in the
same round trip without needing to read the row back (the anon key only has
insert privileges, not select).

This creates one `bills` row per confirmed bill (so a 2-item order writes 2
rows) plus one `bill_line_items` row per ingredient on that bill (~25-30 per
bill). The RLS policies only allow inserting new rows via the public key --
reading the data back requires logging into the Supabase dashboard directly.

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

Supabase dashboard → **Table Editor** → `bills` or `bill_line_items`. To see
a bill with its full ingredient breakdown in one place, run a query like:

```sql
select b.*, li.code, li.qty, li.unit, li.amount, li.line_order
from public.bills b
join public.bill_line_items li on li.bill_id = b.id
order by b.created_at desc, li.line_order;
```

You can also export either table to CSV from the Table Editor, or connect a
BI/marketing tool directly to the Postgres database if needed later.
