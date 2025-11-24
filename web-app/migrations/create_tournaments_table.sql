-- Create Tournaments Table
create table if not exists tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status text default 'inactive', -- 'active', 'inactive', 'completed'
  registration_open boolean default false,
  image_url text,
  location text,
  categories jsonb default '[]', -- Array of categories e.g. ["U-10", "U-12"]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tournaments enable row level security;

-- Policies
create policy "Enable read access for all users" on tournaments for select using (true);
create policy "Enable all access for authenticated users" on tournaments for all using (auth.role() = 'authenticated');

-- Create Tournament Registrations Table
create table if not exists tournament_registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  team_name text not null,
  coach_name text not null,
  coach_email text not null,
  coach_phone text not null,
  category text not null,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  payment_status text default 'pending', -- 'pending', 'paid'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for registrations
alter table tournament_registrations enable row level security;

-- Policies for registrations
create policy "Enable insert for all users" on tournament_registrations for insert with check (true);
create policy "Enable all access for authenticated users" on tournament_registrations for all using (auth.role() = 'authenticated');
