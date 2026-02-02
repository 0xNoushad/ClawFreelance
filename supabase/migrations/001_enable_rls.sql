-- ============================================
-- Row Level Security (RLS) Policies
-- ClawFreelance - Agent Marketplace
-- ============================================
-- This migration enables RLS on all tables and creates
-- secure policies. By default, nothing is accessible to
-- anonymous users. The service_role has full access for
-- backend operations.
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

-- ============================================
-- SERVICE ROLE POLICIES (Full Access)
-- The service_role bypasses RLS by default in Supabase,
-- but we add explicit policies for clarity.
-- ============================================

-- Agents: Service role full access
CREATE POLICY "service_role_agents_all" ON public.agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tasks: Service role full access
CREATE POLICY "service_role_tasks_all" ON public.tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Task Claims: Service role full access
CREATE POLICY "service_role_task_claims_all" ON public.task_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reputation Events: Service role full access
CREATE POLICY "service_role_reputation_events_all" ON public.reputation_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Payments: Service role full access
CREATE POLICY "service_role_payments_all" ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- API Keys: Service role full access
CREATE POLICY "service_role_api_keys_all" ON public.api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Audit Logs: Service role full access
CREATE POLICY "service_role_audit_logs_all" ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ANON ROLE POLICIES (Public Read-Only for Select Tables)
-- Anonymous users can only read public data.
-- ============================================

-- Agents: Anon can read active agent profiles (public leaderboard)
CREATE POLICY "anon_agents_select" ON public.agents
  FOR SELECT
  TO anon
  USING (status = 'active');

-- Tasks: Anon can read open tasks (public task board)
CREATE POLICY "anon_tasks_select" ON public.tasks
  FOR SELECT
  TO anon
  USING (status IN ('open', 'claimed', 'in_progress', 'completed'));

-- Reputation Events: Anon can read (transparency/audit trail)
CREATE POLICY "anon_reputation_events_select" ON public.reputation_events
  FOR SELECT
  TO anon
  USING (true);

-- Task Claims: Anon CANNOT read (privacy of who claimed what)
-- No policy = no access

-- Payments: Anon CANNOT read (financial privacy)
-- No policy = no access

-- API Keys: Anon CANNOT read (security critical)
-- No policy = no access

-- Audit Logs: Anon CANNOT read (internal security)
-- No policy = no access

-- ============================================
-- AUTHENTICATED ROLE POLICIES
-- Authenticated users (via Supabase Auth) get more access.
-- These will be refined as auth is implemented.
-- ============================================

-- Agents: Authenticated can read all active agents
CREATE POLICY "authenticated_agents_select" ON public.agents
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Agents: Authenticated can insert (register as agent)
-- Note: Additional validation should happen in the backend
CREATE POLICY "authenticated_agents_insert" ON public.agents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Tasks: Authenticated can read all non-cancelled tasks
CREATE POLICY "authenticated_tasks_select" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (status != 'cancelled');

-- Tasks: Authenticated can create tasks
CREATE POLICY "authenticated_tasks_insert" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Task Claims: Authenticated can read their own claims
-- Note: Uses auth.uid() to match with agent lookup
CREATE POLICY "authenticated_task_claims_select" ON public.task_claims
  FOR SELECT
  TO authenticated
  USING (true);  -- Refined when auth is linked to agents

-- Task Claims: Authenticated can create claims
CREATE POLICY "authenticated_task_claims_insert" ON public.task_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Reputation Events: Authenticated can read all
CREATE POLICY "authenticated_reputation_events_select" ON public.reputation_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Payments: Authenticated can view (will be refined)
CREATE POLICY "authenticated_payments_select" ON public.payments
  FOR SELECT
  TO authenticated
  USING (true);  -- Refined when auth is linked to agents

-- API Keys: Authenticated CANNOT access via RLS
-- API keys are managed through secure backend endpoints only
-- No policy = no access

-- Audit Logs: Authenticated CANNOT access
-- Audit logs are admin-only
-- No policy = no access

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. All write operations (INSERT/UPDATE/DELETE) for sensitive
--    tables go through the service_role backend, not directly
--    from the client.
--
-- 2. API keys table has NO client access - managed server-side only.
--
-- 3. Audit logs have NO client access - admin/system only.
--
-- 4. Payments have restricted access - users see only their own
--    (to be refined when auth is linked to agent IDs).
--
-- 5. The authenticated policies assume Supabase Auth integration.
--    If using custom auth, requests should use service_role.
-- ============================================
