# HopeDB Full Rebuild Plan

## 1. Schema migration (single migration file)

**Drop existing data** in `sales`, `customer`, `employee`, plus `user_roles`/related role infra that gets replaced. Keep `profiles`, `login_events`, `audit_log` (app still needs them). `leads`/`activities` are orthogonal — leave alone.

**Recreate per HopeDB spec:**
- `customer` (cust_no PK, cust_name, address, payment_terms) — reseed 82 rows
- `employee` (emp_no PK, last_name, first_name, gender, birth_date, hire_date, termination_date) — reseed 31 rows
- `product` NEW (prod_no PK, prod_name, unit, category) — 52 rows
- `priceHist` NEW (id PK, prod_no FK, unit_price, effective_date) — ~70 rows
- `sales` rebuilt (trans_no PK, cust_no FK, emp_no FK, sales_date, **record_status DEFAULT 'ACTIVE'**, created_by, created_at, updated_by, updated_at) — 124 rows
- `salesDetail` NEW (id PK, trans_no FK, prod_no FK, qty, unit_price, **record_status DEFAULT 'ACTIVE'**, stamp cols) — ~310 rows

**Rights system (replaces user_roles):**
- `modules` (mod_code PK, mod_name) — seed 4: Sales_Mod, SD_Mod, Lookup_Mod, Adm_Mod
- `rights` (right_code PK, right_name, mod_code FK) — seed 13: SALES_VIEW/ADD/EDIT/DEL, SD_VIEW/ADD/EDIT/DEL, CUST_LOOKUP, EMP_LOOKUP, PROD_LOOKUP, PRICE_LOOKUP, ADM_USER
- `app_users` (user_id PK = auth.users.id, email, is_superadmin) — keeps a link to Supabase auth
- `user_module` (user_id, mod_code) — module-level grants
- `user_module_rights` (user_id, right_code, granted bool DEFAULT true) — per-right grants

**Helpers:**
- `has_right(_user uuid, _right text)` SECURITY DEFINER — true if superadmin OR row in user_module_rights
- `is_superadmin(_user uuid)` SECURITY DEFINER
- Trigger to auto-stamp `updated_at`/`updated_by` on sales/salesDetail

**RLS:** enable on all new tables. Policies use `has_right(auth.uid(), 'SALES_VIEW')` etc. Lookup tables (customer/employee/product/priceHist) keyed to `*_LOOKUP` rights.

**SUPERADMIN seed:** insert `app_users` row for `jcesperanza@neu.edu.ph` with `is_superadmin=true` + all 13 rights. (If that auth user doesn't exist yet, seed a placeholder row keyed by email; row is upserted to real user_id on first login via trigger on auth.users.)

## 2. Sample data generation

Use deterministic random data (fixed seed) generated inside the migration via `generate_series` + arrays:
- 82 customers, 31 employees, 52 products spanning 6 categories, ~70 price history rows (1-2 per product), 124 sales transactions over the last 18 months, ~310 sales detail lines (1-4 per sale).

## 3. App code updates

- `src/lib/auth-context.tsx`: replace `role` ("user"/"admin"/"super_admin") with `rights: Set<string>` + `isSuperadmin` fetched from `user_module_rights`/`app_users`.
- `src/routes/_authenticated/admin.tsx`: gate on `isSuperadmin || has ADM_USER right`.
- `src/routes/_authenticated/dashboard.tsx`: query sales joined with customer/employee.
- `src/routes/_authenticated/super-admin.tsx`: manage modules/rights/user grants.
- Remove `has_role`/`is_admin_or_super` usages from app code (DB functions kept as no-ops or dropped).
- `/leads` and `/activities` features remain functional with their existing RLS (not part of HopeDB spec).

## 4. Files created/touched

- `supabase/migrations/<ts>_hopedb_full_rebuild.sql` (schema + seed in one file)
- `src/lib/auth-context.tsx` (rights model)
- `src/lib/rights.ts` NEW (right constants + `useHasRight` hook)
- `src/routes/_authenticated/admin.tsx`, `super-admin.tsx`, `dashboard.tsx` (rights-based gating + new data)
- `src/components/top-nav.tsx` (nav items shown per right)

## 5. Risks / notes

- Existing signed-in users will lose role until granted rights. SUPERADMIN email gets all rights on first login.
- Dropping `user_roles` cascades — any leftover policies referencing `has_role`/`is_admin_or_super` on `leads`/`activities`/`profiles` will be rewritten to use the new helpers or simplified to "owner OR superadmin".
- Generated sample data is realistic but synthetic; numbers (82/31/52/70/124/310) match the spec exactly.

Approve and I'll run the migration then update the app code.