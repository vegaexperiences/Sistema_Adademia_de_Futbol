-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Families Table
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tutor_cedula text unique not null,
  tutor_name text not null,
  tutor_email text,
  tutor_phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Players Table
create table players (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete set null,
  first_name text not null,
  last_name text not null,
  birth_date date,
  gender text,
  cedula text,
  category text,
  status text default 'Active', -- Active, Inactive, Scholarship, Suspended
  discount_percent float default 0,
  monthly_fee_override float,
  image_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Payments Table
create table payments (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id) on delete set null,
  amount decimal(10, 2) not null,
  type text not null, -- Enrollment, Monthly, Tournament, Expense
  status text default 'Paid', -- Paid, Pending, Overdue, Cancelled
  method text, -- Cash, Transfer, Yappy, Check, Card
  reference text,
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text
);

-- 4. Expenses Table
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount decimal(10, 2) not null,
  category text,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  payment_method text,
  created_by uuid references auth.users(id), -- Optional: link to admin user
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. System Config Table (Key-Value Store)
create table system_config (
  key text primary key,
  value jsonb not null
);

-- Initial Config Data
insert into system_config (key, value) values 
('financial', '{"monthly_fee": 130, "enrollment_fee": 130, "family_monthly_fee": 110.50, "currency": "USD"}'),
('categories', '["U-6 M", "U-8 M", "U-10 M", "U-12 M", "U-14 M", "U-16 M", "U-10 F", "U-12 F", "U-14 F", "U-16 F", "U-18 F"]');

-- Row Level Security (RLS) Policies
-- For now, we'll enable RLS but allow public read/write for development speed if needed, 
-- OR better: allow authenticated users (admins) to do everything.

alter table families enable row level security;
alter table players enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table system_config enable row level security;

-- Policy: Allow everything for authenticated users (Admins)
create policy "Enable all for authenticated users" on families for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on players for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on payments for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on expenses for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users" on system_config for all using (auth.role() = 'authenticated');
