
-- 1. Grant super admin to brixconde41@gmail.com
INSERT INTO public.app_users (user_id, email, is_superadmin)
VALUES ('39fccdde-8b53-41f7-9935-e7977935888b', 'brixconde41@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET is_superadmin = true, user_id = EXCLUDED.user_id;

-- 2. Drop existing policies on sales and sales_detail
DROP POLICY IF EXISTS "sales select" ON public.sales;
DROP POLICY IF EXISTS "sales insert" ON public.sales;
DROP POLICY IF EXISTS "sales update" ON public.sales;
DROP POLICY IF EXISTS "sales delete" ON public.sales;

DROP POLICY IF EXISTS "sd select" ON public.sales_detail;
DROP POLICY IF EXISTS "sd insert" ON public.sales_detail;
DROP POLICY IF EXISTS "sd update" ON public.sales_detail;
DROP POLICY IF EXISTS "sd delete" ON public.sales_detail;

-- Helper: admin-or-super check inlined in each policy

-- 3. SALES policies
CREATE POLICY "sales select active or admin" ON public.sales
FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR has_right(auth.uid(), 'ADM_USER')
  OR (record_status = 'ACTIVE' AND has_right(auth.uid(), 'SALES_VIEW'))
);

CREATE POLICY "sales insert" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (has_right(auth.uid(), 'SALES_ADD'));

-- Edit content (any field) - requires SALES_EDIT; can keep status ACTIVE
CREATE POLICY "sales update edit" ON public.sales
FOR UPDATE TO authenticated
USING (has_right(auth.uid(), 'SALES_EDIT'))
WITH CHECK (
  has_right(auth.uid(), 'SALES_EDIT')
  AND record_status = 'ACTIVE'
);

-- Soft delete: set status INACTIVE - requires SALES_DEL
CREATE POLICY "sales update soft delete" ON public.sales
FOR UPDATE TO authenticated
USING (has_right(auth.uid(), 'SALES_DEL') AND record_status = 'ACTIVE')
WITH CHECK (record_status = 'INACTIVE');

-- Recovery: set status ACTIVE - admin or superadmin only
CREATE POLICY "sales update recover" ON public.sales
FOR UPDATE TO authenticated
USING (
  (is_superadmin(auth.uid()) OR has_right(auth.uid(), 'ADM_USER'))
  AND record_status = 'INACTIVE'
)
WITH CHECK (record_status = 'ACTIVE');

-- 4. SALES_DETAIL policies (same 4-pattern)
CREATE POLICY "sd select active or admin" ON public.sales_detail
FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR has_right(auth.uid(), 'ADM_USER')
  OR (record_status = 'ACTIVE' AND has_right(auth.uid(), 'SD_VIEW'))
);

CREATE POLICY "sd insert" ON public.sales_detail
FOR INSERT TO authenticated
WITH CHECK (has_right(auth.uid(), 'SD_ADD'));

CREATE POLICY "sd update edit" ON public.sales_detail
FOR UPDATE TO authenticated
USING (has_right(auth.uid(), 'SD_EDIT'))
WITH CHECK (
  has_right(auth.uid(), 'SD_EDIT')
  AND record_status = 'ACTIVE'
);

CREATE POLICY "sd update soft delete" ON public.sales_detail
FOR UPDATE TO authenticated
USING (has_right(auth.uid(), 'SD_DEL') AND record_status = 'ACTIVE')
WITH CHECK (record_status = 'INACTIVE');

CREATE POLICY "sd update recover" ON public.sales_detail
FOR UPDATE TO authenticated
USING (
  (is_superadmin(auth.uid()) OR has_right(auth.uid(), 'ADM_USER'))
  AND record_status = 'INACTIVE'
)
WITH CHECK (record_status = 'ACTIVE');

-- 5. Lookup tables: drop existing write-all-super policies, keep SELECT-only for authenticated
DROP POLICY IF EXISTS "customer super write" ON public.customer;
DROP POLICY IF EXISTS "customer select" ON public.customer;
CREATE POLICY "customer select all auth" ON public.customer
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "employee super write" ON public.employee;
DROP POLICY IF EXISTS "employee select" ON public.employee;
CREATE POLICY "employee select all auth" ON public.employee
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product super write" ON public.product;
DROP POLICY IF EXISTS "product select" ON public.product;
CREATE POLICY "product select all auth" ON public.product
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "price_hist super write" ON public.price_hist;
DROP POLICY IF EXISTS "price_hist select" ON public.price_hist;
CREATE POLICY "price_hist select all auth" ON public.price_hist
FOR SELECT TO authenticated USING (true);

-- 6. Cascade soft-delete/recovery trigger on sales
CREATE OR REPLACE FUNCTION public.tg_sales_cascade_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.record_status IS DISTINCT FROM OLD.record_status THEN
    UPDATE public.sales_detail
       SET record_status = NEW.record_status,
           updated_at = now(),
           updated_by = auth.uid()
     WHERE trans_no = NEW.trans_no;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_cascade_status ON public.sales;
CREATE TRIGGER sales_cascade_status
AFTER UPDATE OF record_status ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.tg_sales_cascade_status();

REVOKE EXECUTE ON FUNCTION public.tg_sales_cascade_status() FROM PUBLIC, anon;

-- 7. Views (security_invoker so RLS applies as caller)
DROP VIEW IF EXISTS public.sales_with_lookup;
CREATE VIEW public.sales_with_lookup
WITH (security_invoker = true) AS
SELECT
  s.trans_no,
  s.sales_date,
  s.record_status,
  s.created_at,
  s.updated_at,
  s.created_by,
  s.updated_by,
  s.cust_no,
  c.cust_name,
  c.address       AS cust_address,
  c.payment_terms,
  s.emp_no,
  e.first_name    AS emp_first_name,
  e.last_name     AS emp_last_name,
  COALESCE(d.line_count, 0) AS line_count,
  COALESCE(d.total_amount, 0) AS total_amount
FROM public.sales s
LEFT JOIN public.customer c ON c.cust_no = s.cust_no
LEFT JOIN public.employee e ON e.emp_no  = s.emp_no
LEFT JOIN (
  SELECT trans_no,
         COUNT(*)              AS line_count,
         SUM(qty * unit_price) AS total_amount
  FROM public.sales_detail
  WHERE record_status = 'ACTIVE'
  GROUP BY trans_no
) d ON d.trans_no = s.trans_no;

DROP VIEW IF EXISTS public.salesdetail_with_product;
CREATE VIEW public.salesdetail_with_product
WITH (security_invoker = true) AS
SELECT
  sd.id,
  sd.trans_no,
  sd.prod_no,
  p.prod_name,
  p.category,
  p.unit,
  sd.qty,
  sd.unit_price,
  (sd.qty * sd.unit_price) AS line_total,
  cp.unit_price            AS current_unit_price,
  cp.effective_date        AS current_price_date,
  sd.record_status,
  sd.created_at,
  sd.updated_at,
  sd.created_by,
  sd.updated_by
FROM public.sales_detail sd
LEFT JOIN public.product p ON p.prod_no = sd.prod_no
LEFT JOIN LATERAL (
  SELECT ph.unit_price, ph.effective_date
  FROM public.price_hist ph
  WHERE ph.prod_no = sd.prod_no
    AND ph.effective_date <= CURRENT_DATE
  ORDER BY ph.effective_date DESC
  LIMIT 1
) cp ON true;
