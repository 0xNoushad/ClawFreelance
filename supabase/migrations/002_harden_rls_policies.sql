-- ============================================
-- Migration: Harden RLS Policies
-- This migration safely drops ALL existing policies and recreates them
-- Safe to run multiple times (idempotent)
-- ============================================

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Drop all policies on agents
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agents', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on tasks
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on task_claims
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_claims'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_claims', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on reputation_events
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reputation_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reputation_events', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on payments
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on api_keys
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.api_keys', pol.policyname);
  END LOOP;
END $$;

-- Drop all policies on audit_logs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);
  END LOOP;
END $$;

-- ============================================
-- ENABLE AND FORCE RLS
-- ============================================

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.task_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ============================================
-- ANON ROLE POLICIES (Minimal Public Access)
-- ============================================

CREATE POLICY "anon_agents_select_active" ON public.agents
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "anon_tasks_select_open" ON public.tasks
  FOR SELECT TO anon
  USING (status = 'open');

CREATE POLICY "anon_reputation_events_select_positive" ON public.reputation_events
  FOR SELECT TO anon
  USING (event_type IN ('task_completed', 'dispute_won') AND points_delta > 0);

-- ============================================
-- AUTHENTICATED ROLE POLICIES (Restrictive)
-- ============================================

CREATE POLICY "authenticated_agents_select_active" ON public.agents
  FOR SELECT TO authenticated
  USING (status = 'active');

CREATE POLICY "authenticated_tasks_select_visible" ON public.tasks
  FOR SELECT TO authenticated
  USING (status NOT IN ('cancelled'));

-- DENY direct access to sensitive tables - use API endpoints
CREATE POLICY "authenticated_task_claims_deny" ON public.task_claims
  FOR SELECT TO authenticated
  USING (false);

CREATE POLICY "authenticated_reputation_events_select_positive" ON public.reputation_events
  FOR SELECT TO authenticated
  USING (event_type IN ('task_completed', 'dispute_won', 'peer_review') AND points_delta >= 0);

CREATE POLICY "authenticated_payments_deny" ON public.payments
  FOR SELECT TO authenticated
  USING (false);

-- ============================================
-- SECURITY CONSTRAINTS (idempotent)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reputation_score_non_negative') THEN
    ALTER TABLE public.agents ADD CONSTRAINT reputation_score_non_negative CHECK (reputation_score >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_amount_non_negative') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT reward_amount_non_negative CHECK (reward_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_amount_non_negative') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payment_amount_non_negative CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'points_delta_bounded') THEN
    ALTER TABLE public.reputation_events ADD CONSTRAINT points_delta_bounded CHECK (points_delta BETWEEN -1000 AND 1000);
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify:
-- SELECT tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
