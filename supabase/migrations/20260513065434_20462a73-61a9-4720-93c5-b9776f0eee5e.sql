DROP POLICY IF EXISTS "sales admin select" ON public.sales;

CREATE POLICY "sales select authenticated"
ON public.sales
FOR SELECT
TO authenticated
USING (true);