-- ============================================
-- Row Level Security (RLS) Policies
-- ClawFreelance - Agent Marketplace
-- ============================================
-- SECURITY HARDENED VERSION
--
-- Design principle: DENY by default, explicit ALLOW
-- All sensitive write operations go through service_role backend
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (extra security layer)
ALTER TABLE public.agents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.task_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ============================================
-- ANON ROLE POLICIES (Minimal Public Access)
-- Anonymous users get read-only access to public data only
-- ============================================

-- Agents: Anon can only read active agent PUBLIC profiles
-- Excludes sensitive fields via column-level access in views if needed
CREATE POLICY "anon_agents_select_active" ON public.agents
  FOR SELECT
  TO anon
  USING (status = 'active');

-- Tasks: Anon can only read open tasks (public task board)
CREATE POLICY "anon_tasks_select_open" ON public.tasks
  FOR SELECT
  TO anon
  USING (status = 'open');

-- Reputation Events: Anon can only see positive completed events
-- Excludes failure events for privacy
CREATE POLICY "anon_reputation_events_select_positive" ON public.reputation_events
  FOR SELECT
  TO anon
  USING (
    event_type IN ('task_completed', 'dispute_won')
    AND points_delta > 0
  );

-- Task Claims: Anon CANNOT read (who claimed what is private)
-- No policy = no access

-- Payments: Anon CANNOT read (financial data is private)
-- No policy = no access

-- API Keys: Anon CANNOT read (security critical)
-- No policy = no access

-- Audit Logs: Anon CANNOT read (internal security)
-- No policy = no access

-- ============================================
-- AUTHENTICATED ROLE POLICIES
-- Authenticated users (via Supabase Auth) get scoped access
-- IMPORTANT: Until auth.uid() is linked to agents, keep restrictive
-- ============================================

-- Agents: Authenticated can read active agent profiles
CREATE POLICY "authenticated_agents_select_active" ON public.agents
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Agents: NO direct insert/update/delete for authenticated
-- All agent management goes through service_role backend
-- This prevents Sybil attacks and ensures proper validation

-- Tasks: Authenticated can read non-cancelled tasks
CREATE POLICY "authenticated_tasks_select_visible" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (status NOT IN ('cancelled'));

-- Tasks: NO direct insert/update/delete for authenticated
-- All task management goes through service_role backend
-- This ensures proper ownership validation

-- Task Claims: Authenticated CANNOT read others' claims
-- This is INTENTIONALLY restrictive until auth-to-agent binding exists
-- Frontend should use API endpoints that filter appropriately
CREATE POLICY "authenticated_task_claims_select_none" ON public.task_claims
  FOR SELECT
  TO authenticated
  USING (false);  -- Deny all direct access, use API

-- Task Claims: NO direct insert/update/delete
-- All claim operations go through service_role backend

-- Reputation Events: Authenticated can read positive events only
CREATE POLICY "authenticated_reputation_events_select_positive" ON public.reputation_events
  FOR SELECT
  TO authenticated
  USING (
    event_type IN ('task_completed', 'dispute_won', 'peer_review')
    AND points_delta >= 0
  );

-- Payments: Authenticated CANNOT read any payments directly
-- This prevents financial data exposure
-- Use API endpoints with proper authorization
CREATE POLICY "authenticated_payments_select_none" ON public.payments
  FOR SELECT
  TO authenticated
  USING (false);  -- Deny all direct access, use API

-- API Keys: Authenticated CANNOT access
-- API keys are managed ONLY through service_role backend
-- No policy = no access

-- Audit Logs: Authenticated CANNOT access
-- Audit logs are admin-only
-- No policy = no access

-- ============================================
-- SERVICE ROLE ACCESS
-- Note: service_role bypasses RLS by default in Supabase
-- No explicit policies needed, but documented here for clarity
-- ============================================

-- The backend application uses service_role for all operations:
-- - Agent registration with proper validation
-- - Task creation with ownership verification
-- - Claim management with authorization checks
-- - Payment processing with audit trails
-- - API key management with secure hashing

-- ============================================
-- FUTURE: AUTH-TO-AGENT BINDING
-- When implementing Supabase Auth integration:
--
-- 1. Add auth_user_id column to agents table:
--    ALTER TABLE public.agents ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
--
-- 2. Create helper function:
--    CREATE FUNCTION auth.get_agent_id() RETURNS uuid AS $$
--      SELECT id FROM public.agents WHERE auth_user_id = auth.uid() LIMIT 1
--    $$ LANGUAGE sql STABLE SECURITY DEFINER;
--
-- 3. Update policies to use auth.get_agent_id():
--    CREATE POLICY "authenticated_task_claims_select_own" ON public.task_claims
--      FOR SELECT TO authenticated
--      USING (agent_id = auth.get_agent_id());
--
--    CREATE POLICY "authenticated_payments_select_own" ON public.payments
--      FOR SELECT TO authenticated
--      USING (agent_id = auth.get_agent_id());
-- ============================================

-- ============================================
-- ADDITIONAL SECURITY CONSTRAINTS
-- ============================================

-- Ensure reputation_score cannot be negative
ALTER TABLE public.agents
  ADD CONSTRAINT reputation_score_non_negative
  CHECK (reputation_score >= 0);

-- Ensure reward_amount cannot be negative
ALTER TABLE public.tasks
  ADD CONSTRAINT reward_amount_non_negative
  CHECK (reward_amount >= 0);

-- Ensure payment amount cannot be negative
ALTER TABLE public.payments
  ADD CONSTRAINT payment_amount_non_negative
  CHECK (amount >= 0);

-- Ensure points_delta is within reasonable bounds
ALTER TABLE public.reputation_events
  ADD CONSTRAINT points_delta_bounded
  CHECK (points_delta BETWEEN -1000 AND 1000);

-- ============================================
-- SECURITY AUDIT NOTES
-- ============================================
-- 1. ALL write operations MUST go through service_role backend
-- 2. API keys table has ZERO client access
-- 3. Audit logs have ZERO client access
-- 4. Payments have ZERO direct client access (use API)
-- 5. Task claims have ZERO direct client access (use API)
-- 6. Negative events (failures, disputes lost) are hidden from public
-- 7. Only open tasks visible to anonymous users
-- 8. Database constraints prevent invalid data states
-- ============================================
