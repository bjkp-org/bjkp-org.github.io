-- BJKP Supabase Database
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_id text unique not null,
  name text not null,
  mobile text not null,
  email text,
  district text not null,
  role text not null default 'सामान्य सदस्य',
  photo_url text,
  transaction_number text,
  payment_status text not null default 'pending' check (payment_status in ('pending','verified','rejected')),
  payment_verified_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- Public users can submit applications.
create policy "public can insert membership"
on public.members for insert to anon, authenticated
with check (status = 'pending');

-- Public verification can only read approved members.
create policy "public can verify approved members"
on public.members for select to anon, authenticated
using (status = 'approved');

-- Admin actions use authenticated users. Create your admin user in Supabase Auth.
create policy "authenticated can manage members"
on public.members for all to authenticated
using (true) with check (true);


-- Migration for an existing members table
alter table public.members add column if not exists photo_url text;
alter table public.members add column if not exists transaction_number text;
alter table public.members add column if not exists payment_status text not null default 'pending';
alter table public.members add column if not exists payment_verified_at timestamptz;
