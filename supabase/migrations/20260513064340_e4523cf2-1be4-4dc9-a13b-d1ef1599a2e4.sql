CREATE TABLE public.sales (
  trans_no VARCHAR(8) NOT NULL PRIMARY KEY,
  sales_date DATE,
  cust_no VARCHAR(5),
  emp_no VARCHAR(5)
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales admin select" ON public.sales FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "sales admin insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "sales admin update" ON public.sales FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "sales admin delete" ON public.sales FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));