
CREATE TABLE public.customer (
  cust_no varchar(5) PRIMARY KEY,
  cust_name text,
  address text,
  payment_terms text
);

CREATE TABLE public.employee (
  emp_no varchar(5) PRIMARY KEY,
  last_name text,
  first_name text,
  gender char(1),
  birth_date date,
  hire_date date,
  termination_date date
);

ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer select authenticated" ON public.customer FOR SELECT TO authenticated USING (true);
CREATE POLICY "customer admin insert" ON public.customer FOR INSERT TO authenticated WITH CHECK (is_admin_or_super(auth.uid()));
CREATE POLICY "customer admin update" ON public.customer FOR UPDATE TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "customer admin delete" ON public.customer FOR DELETE TO authenticated USING (is_admin_or_super(auth.uid()));

CREATE POLICY "employee select authenticated" ON public.employee FOR SELECT TO authenticated USING (true);
CREATE POLICY "employee admin insert" ON public.employee FOR INSERT TO authenticated WITH CHECK (is_admin_or_super(auth.uid()));
CREATE POLICY "employee admin update" ON public.employee FOR UPDATE TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "employee admin delete" ON public.employee FOR DELETE TO authenticated USING (is_admin_or_super(auth.uid()));
