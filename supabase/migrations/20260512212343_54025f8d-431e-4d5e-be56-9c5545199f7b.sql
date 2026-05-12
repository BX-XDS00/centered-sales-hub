
-- Roles enum
create type public.app_role as enum ('user', 'admin', 'super_admin');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost', 'archived');
create type public.activity_type as enum ('call', 'email', 'meeting', 'note');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer role checker
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create or replace function public.is_admin_or_super(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'super_admin')
  )
$$;

-- Leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  status lead_status not null default 'new',
  value numeric(12,2) not null default 0,
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads enable row level security;

-- Activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type activity_type not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.activities enable row level security;

-- Profiles policies
create policy "profiles select self or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin_or_super(auth.uid()));
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "profiles insert self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles admin update" on public.profiles
  for update to authenticated using (public.is_admin_or_super(auth.uid()));

-- user_roles policies
create policy "user_roles select self or admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin_or_super(auth.uid()));
create policy "user_roles admin manage" on public.user_roles
  for all to authenticated
  using (public.is_admin_or_super(auth.uid()))
  with check (public.is_admin_or_super(auth.uid()));

-- Leads policies
create policy "leads select assigned or admin" on public.leads
  for select to authenticated
  using (assigned_to = auth.uid() or created_by = auth.uid() or public.is_admin_or_super(auth.uid()));

create policy "leads insert auth" on public.leads
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "leads update assigned or admin" on public.leads
  for update to authenticated
  using (assigned_to = auth.uid() or public.is_admin_or_super(auth.uid()));

create policy "leads delete super" on public.leads
  for delete to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

-- Activities policies
create policy "activities select via lead" on public.activities
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (l.assigned_to = auth.uid() or l.created_by = auth.uid() or public.is_admin_or_super(auth.uid()))
    )
  );
create policy "activities insert auth" on public.activities
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "activities delete own or admin" on public.activities
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin_or_super(auth.uid()));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
