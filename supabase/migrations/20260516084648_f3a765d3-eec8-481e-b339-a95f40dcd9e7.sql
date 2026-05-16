
-- ============================================================
-- HopeDB Full Rebuild
-- ============================================================

-- Drop old role-dependent policies & functions
DROP POLICY IF EXISTS "leads delete super" ON public.leads;
DROP POLICY IF EXISTS "leads select assigned or admin" ON public.leads;
DROP POLICY IF EXISTS "leads update assigned or admin" ON public.leads;
DROP POLICY IF EXISTS "leads insert auth" ON public.leads;
DROP POLICY IF EXISTS "activities delete own or admin" ON public.activities;
DROP POLICY IF EXISTS "activities select via lead" ON public.activities;
DROP POLICY IF EXISTS "activities insert auth" ON public.activities;
DROP POLICY IF EXISTS "audit_log insert admin self" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log select admin" ON public.audit_log;
DROP POLICY IF EXISTS "login_events select self or admin" ON public.login_events;
DROP POLICY IF EXISTS "login_events insert self" ON public.login_events;
DROP POLICY IF EXISTS "profiles admin update non-admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles select self or admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles super update admins" ON public.profiles;
DROP POLICY IF EXISTS "profiles update self" ON public.profiles;
DROP POLICY IF EXISTS "profiles insert self" ON public.profiles;
DROP POLICY IF EXISTS "user_roles admin manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles select self or admin" ON public.user_roles;

DROP POLICY IF EXISTS "customer admin delete" ON public.customer;
DROP POLICY IF EXISTS "customer admin insert" ON public.customer;
DROP POLICY IF EXISTS "customer admin update" ON public.customer;
DROP POLICY IF EXISTS "customer select authenticated" ON public.customer;
DROP POLICY IF EXISTS "employee admin delete" ON public.employee;
DROP POLICY IF EXISTS "employee admin insert" ON public.employee;
DROP POLICY IF EXISTS "employee admin update" ON public.employee;
DROP POLICY IF EXISTS "employee select authenticated" ON public.employee;
DROP POLICY IF EXISTS "sales admin delete" ON public.sales;
DROP POLICY IF EXISTS "sales admin insert" ON public.sales;
DROP POLICY IF EXISTS "sales admin update" ON public.sales;
DROP POLICY IF EXISTS "sales select authenticated" ON public.sales;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_super(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.customer CASCADE;
DROP TABLE IF EXISTS public.employee CASCADE;

-- ============================================================
-- HopeDB data tables
-- ============================================================
CREATE TABLE public.customer (
  cust_no varchar(10) PRIMARY KEY,
  cust_name text NOT NULL,
  address text,
  payment_terms text
);

CREATE TABLE public.employee (
  emp_no varchar(10) PRIMARY KEY,
  last_name text NOT NULL,
  first_name text NOT NULL,
  gender char(1),
  birth_date date,
  hire_date date,
  termination_date date
);

CREATE TABLE public.product (
  prod_no varchar(10) PRIMARY KEY,
  prod_name text NOT NULL,
  unit text,
  category text
);

CREATE TABLE public.price_hist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prod_no varchar(10) NOT NULL REFERENCES public.product(prod_no) ON DELETE CASCADE,
  unit_price numeric(12,2) NOT NULL,
  effective_date date NOT NULL,
  UNIQUE (prod_no, effective_date)
);

CREATE TABLE public.sales (
  trans_no varchar(12) PRIMARY KEY,
  cust_no varchar(10) REFERENCES public.customer(cust_no),
  emp_no varchar(10) REFERENCES public.employee(emp_no),
  sales_date date NOT NULL,
  record_status text NOT NULL DEFAULT 'ACTIVE',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trans_no varchar(12) NOT NULL REFERENCES public.sales(trans_no) ON DELETE CASCADE,
  prod_no varchar(10) NOT NULL REFERENCES public.product(prod_no),
  qty numeric(10,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  record_status text NOT NULL DEFAULT 'ACTIVE',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Rights / Modules
-- ============================================================
CREATE TABLE public.modules (
  mod_code text PRIMARY KEY,
  mod_name text NOT NULL
);

CREATE TABLE public.rights (
  right_code text PRIMARY KEY,
  right_name text NOT NULL,
  mod_code text NOT NULL REFERENCES public.modules(mod_code) ON DELETE CASCADE
);

CREATE TABLE public.app_users (
  user_id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  is_superadmin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_module (
  user_id uuid NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  mod_code text NOT NULL REFERENCES public.modules(mod_code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, mod_code)
);

CREATE TABLE public.user_module_rights (
  user_id uuid NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  right_code text NOT NULL REFERENCES public.rights(right_code) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, right_code)
);

-- ============================================================
-- Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE user_id = _user AND is_superadmin = true)
$$;

CREATE OR REPLACE FUNCTION public.has_right(_user uuid, _right text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.app_users WHERE user_id = _user AND is_superadmin = true)
    OR EXISTS (
      SELECT 1 FROM public.user_module_rights
      WHERE user_id = _user AND right_code = _right AND granted = true
    )
$$;

CREATE OR REPLACE FUNCTION public.tg_stamp_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER sales_stamp BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_update();
CREATE TRIGGER sales_detail_stamp BEFORE UPDATE ON public.sales_detail
  FOR EACH ROW EXECUTE FUNCTION public.tg_stamp_update();

-- New auth-user handler: profile + app_users link by email
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_users (user_id, email, is_superadmin)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_hist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer select" ON public.customer FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'CUST_LOOKUP'));
CREATE POLICY "customer super write" ON public.customer FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "employee select" ON public.employee FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'EMP_LOOKUP'));
CREATE POLICY "employee super write" ON public.employee FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "product select" ON public.product FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'PROD_LOOKUP'));
CREATE POLICY "product super write" ON public.product FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "price_hist select" ON public.price_hist FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'PRICE_LOOKUP'));
CREATE POLICY "price_hist super write" ON public.price_hist FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "sales select" ON public.sales FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'SALES_VIEW'));
CREATE POLICY "sales insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_right(auth.uid(),'SALES_ADD'));
CREATE POLICY "sales update" ON public.sales FOR UPDATE TO authenticated USING (public.has_right(auth.uid(),'SALES_EDIT'));
CREATE POLICY "sales delete" ON public.sales FOR DELETE TO authenticated USING (public.has_right(auth.uid(),'SALES_DEL'));

CREATE POLICY "sd select" ON public.sales_detail FOR SELECT TO authenticated USING (public.has_right(auth.uid(),'SD_VIEW'));
CREATE POLICY "sd insert" ON public.sales_detail FOR INSERT TO authenticated WITH CHECK (public.has_right(auth.uid(),'SD_ADD'));
CREATE POLICY "sd update" ON public.sales_detail FOR UPDATE TO authenticated USING (public.has_right(auth.uid(),'SD_EDIT'));
CREATE POLICY "sd delete" ON public.sales_detail FOR DELETE TO authenticated USING (public.has_right(auth.uid(),'SD_DEL'));

CREATE POLICY "modules read" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules super" ON public.modules FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "rights read" ON public.rights FOR SELECT TO authenticated USING (true);
CREATE POLICY "rights super" ON public.rights FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "app_users self or super" ON public.app_users FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "app_users super write" ON public.app_users FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "user_module self or super" ON public.user_module FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "user_module super write" ON public.user_module FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "user_module_rights self or super" ON public.user_module_rights FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "user_module_rights super write" ON public.user_module_rights FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- Re-create surviving table policies using new helpers
CREATE POLICY "profiles select self or super" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles super update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE POLICY "login_events insert self" ON public.login_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "login_events select self or super" ON public.login_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE POLICY "audit_log select super" ON public.audit_log FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "audit_log insert super" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND public.is_superadmin(auth.uid()));

CREATE POLICY "leads insert auth" ON public.leads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "leads select owner or super" ON public.leads FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "leads update owner or super" ON public.leads FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "leads delete super" ON public.leads FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE POLICY "activities insert auth" ON public.activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "activities select via lead" ON public.activities FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = activities.lead_id AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR public.is_superadmin(auth.uid())))
);
CREATE POLICY "activities delete own or super" ON public.activities FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

-- ============================================================
-- Seed: modules & rights
-- ============================================================
INSERT INTO public.modules (mod_code, mod_name) VALUES
  ('Sales_Mod','Sales'),
  ('SD_Mod','Sales Detail'),
  ('Lookup_Mod','Lookups'),
  ('Adm_Mod','Administration');

INSERT INTO public.rights (right_code, right_name, mod_code) VALUES
  ('SALES_VIEW','View Sales','Sales_Mod'),
  ('SALES_ADD','Add Sales','Sales_Mod'),
  ('SALES_EDIT','Edit Sales','Sales_Mod'),
  ('SALES_DEL','Delete Sales','Sales_Mod'),
  ('SD_VIEW','View Sales Detail','SD_Mod'),
  ('SD_ADD','Add Sales Detail','SD_Mod'),
  ('SD_EDIT','Edit Sales Detail','SD_Mod'),
  ('SD_DEL','Delete Sales Detail','SD_Mod'),
  ('CUST_LOOKUP','Customer Lookup','Lookup_Mod'),
  ('EMP_LOOKUP','Employee Lookup','Lookup_Mod'),
  ('PROD_LOOKUP','Product Lookup','Lookup_Mod'),
  ('PRICE_LOOKUP','Price Lookup','Lookup_Mod'),
  ('ADM_USER','User Administration','Adm_Mod');

-- ============================================================
-- Seed: SUPERADMIN
-- ============================================================
INSERT INTO public.app_users (user_id, email, is_superadmin)
VALUES (gen_random_uuid(), 'jcesperanza@neu.edu.ph', true)
ON CONFLICT (email) DO UPDATE SET is_superadmin = true;

UPDATE public.app_users a
SET user_id = u.id
FROM auth.users u
WHERE a.email = 'jcesperanza@neu.edu.ph' AND u.email = a.email;

INSERT INTO public.user_module_rights (user_id, right_code, granted)
SELECT a.user_id, r.right_code, true
FROM public.app_users a CROSS JOIN public.rights r
WHERE a.email = 'jcesperanza@neu.edu.ph'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_module (user_id, mod_code)
SELECT a.user_id, m.mod_code
FROM public.app_users a CROSS JOIN public.modules m
WHERE a.email = 'jcesperanza@neu.edu.ph'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: sample data
-- ============================================================
-- 82 customers
INSERT INTO public.customer (cust_no, cust_name, address, payment_terms)
SELECT
  'C' || lpad(g::text, 4, '0'),
  (ARRAY['Globus Medical','RF Industries','HMS Holdings','Acme Corp','Vertex Labs','BlueRock Systems','Cardinal Supply','Delta Pharma','Echo Foods','Fenix Tools','Granite Mining','Helios Energy','Iris Cosmetics','Jaguar Logistics','Krypton Plastics','Lumen Optics','Mantis Robotics','Nova Print','Orion Aerospace','Pacific Imports','Quantum Glass','Redwood Timber','Sterling Bank','Titan Metals','Umbra Studios','Vortex Marine','Wavelength Audio','Xenith Sports','Yellowstone Co','Zephyr Air','Apex Builders','Brio Coffee','Cinder Forge','Drift Surf','Ember Grill','Falcon Drone','Granger Foods','Halcyon Yachts','Ivory Linens','Juno Bikes','Kepler Telescopes','Lumber Co','Maven Books','Nestor Inks','Orbit Travel','Polar Ice','Quill Pens','Rivet Jeans','Solstice Spa','Tempest Wind'])[((g-1) % 50) + 1] || ' #' || g,
  (((g*37) % 9999))::text || ' Main St, City ' || ((g*7) % 100),
  (ARRAY['30D','45D','60D','COD','Net 15'])[((g-1) % 5) + 1]
FROM generate_series(1, 82) g;

-- 31 employees
INSERT INTO public.employee (emp_no, last_name, first_name, gender, birth_date, hire_date, termination_date)
SELECT
  lpad(g::text, 5, '0'),
  (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker'])[g],
  (ARRAY['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Nancy','Daniel','Lisa','Matthew','Betty','Anthony','Helen','Donald','Sandra','Mark'])[g],
  CASE WHEN g % 2 = 0 THEN 'F' ELSE 'M' END,
  ('1975-01-01'::date + ((g * 137) % 5000))::date,
  ('2005-01-01'::date + ((g * 211) % 5000))::date,
  CASE WHEN g % 7 = 0 THEN ('2020-01-01'::date + ((g * 31) % 1500))::date ELSE NULL END
FROM generate_series(1, 31) g;

-- 52 products
INSERT INTO public.product (prod_no, prod_name, unit, category)
SELECT
  'P' || lpad(g::text, 4, '0'),
  (ARRAY['Widget','Gadget','Sprocket','Flange','Bolt','Nut','Bracket','Hinge','Spring','Bearing','Coupling','Gasket','Seal','Valve','Pump','Motor','Fan','Filter','Sensor','Switch','Relay','Cable','Wire','Connector','Plug','Socket','Adapter','Battery','Charger','Lamp','Light','Bulb','Mirror','Lens','Shield','Cover','Plate','Panel','Frame','Beam','Rod','Pipe','Tube','Hose','Strap','Belt','Chain','Rope','Mesh','Sheet','Foil','Tape'])[g] || ' Model ' || chr(64 + ((g % 26) + 1)),
  (ARRAY['EA','BOX','KG','M','L'])[((g-1) % 5) + 1],
  (ARRAY['Hardware','Electrical','Plumbing','Optics','Tools','Consumables'])[((g-1) % 6) + 1]
FROM generate_series(1, 52) g;

-- 69 price history rows + 1 manual = 70
INSERT INTO public.price_hist (prod_no, unit_price, effective_date)
SELECT 'P' || lpad(g::text, 4, '0'), round((10 + (g * 1.37))::numeric, 2), '2024-01-01'::date + (g % 90)
FROM generate_series(1, 52) g;

INSERT INTO public.price_hist (prod_no, unit_price, effective_date)
SELECT 'P' || lpad(g::text, 4, '0'), round((12 + (g * 1.51))::numeric, 2), '2024-06-01'::date + (g % 60)
FROM generate_series(1, 52) g WHERE g % 3 = 0;

INSERT INTO public.price_hist (prod_no, unit_price, effective_date) VALUES ('P0001', 99.99, '2025-01-15');

-- 124 sales
INSERT INTO public.sales (trans_no, cust_no, emp_no, sales_date)
SELECT
  'T' || lpad(g::text, 6, '0'),
  'C' || lpad((((g * 13) % 82) + 1)::text, 4, '0'),
  lpad((((g * 7) % 31) + 1)::text, 5, '0'),
  '2024-06-01'::date + ((g * 4) % 540)
FROM generate_series(1, 124) g;

-- 310 sales_detail (124*3 - 62 = 310)
INSERT INTO public.sales_detail (trans_no, prod_no, qty, unit_price)
SELECT
  'T' || lpad(g::text, 6, '0'),
  'P' || lpad((((g * line * 11) % 52) + 1)::text, 4, '0'),
  ((g + line) % 10) + 1,
  round((10 + ((g + line) * 1.37))::numeric, 2)
FROM generate_series(1, 124) g, generate_series(1, 3) line
WHERE NOT (line = 3 AND g % 2 = 0);
