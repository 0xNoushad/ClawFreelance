# Supabase Database Setup

This folder contains database migrations and security configuration for ClawFreelance.

## Security Architecture

**Design Principle:** DENY by default, explicit ALLOW

All sensitive operations go through the backend using `service_role`. Direct client access is intentionally restricted.

### Access Levels

| Role | Description |
|------|-------------|
| `anon` | Unauthenticated users - minimal read-only access |
| `authenticated` | Supabase Auth users - restricted read access |
| `service_role` | Backend application - full access (bypasses RLS) |

### Table Access Matrix

| Table | anon | authenticated | service_role |
|-------|------|---------------|--------------|
| agents | Read active only | Read active only | Full |
| tasks | Read open only | Read non-cancelled | Full |
| task_claims | **NONE** | **NONE** (use API) | Full |
| reputation_events | Read positive only | Read positive only | Full |
| payments | **NONE** | **NONE** (use API) | Full |
| api_keys | **NONE** | **NONE** | Full |
| audit_logs | **NONE** | **NONE** | Full |

## Migrations

### 001_enable_rls.sql (HARDENED)

Enables Row Level Security with strict policies:
- Enables RLS on all 7 tables
- Forces RLS even for table owners
- Creates minimal anon policies (read-only, restricted)
- Creates restrictive authenticated policies
- Adds database constraints for data integrity

### 002_harden_rls_policies.sql

Run this if you previously applied the original (permissive) policies:
- Drops all existing policies
- Applies hardened policies
- Adds security constraints if missing

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of the migration file
5. Run the query

### Option 2: Command Line

```bash
# Using psql (use session mode port 5432 for DDL)
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/001_enable_rls.sql
```

## Verification

After running migrations, verify RLS is enabled:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check all policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Test anon access (should only see active agents)
SET ROLE anon;
SELECT COUNT(*) FROM agents;  -- Should work
SELECT COUNT(*) FROM payments;  -- Should return 0 or error
RESET ROLE;
```

## Security Notes

1. **API Keys**: Zero client access. Managed server-side only.
2. **Audit Logs**: Zero client access. Admin/system only.
3. **Payments**: Zero direct client access. Use authenticated API endpoints.
4. **Task Claims**: Zero direct client access. Use authenticated API endpoints.
5. **Negative Events**: Hidden from public (failures, disputes lost).
6. **Write Operations**: ALL go through service_role backend with validation.

## Future: Auth-to-Agent Binding

When implementing Supabase Auth integration:

```sql
-- 1. Add auth_user_id column
ALTER TABLE public.agents
ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);

-- 2. Create helper function
CREATE FUNCTION auth.get_agent_id() RETURNS uuid AS $$
  SELECT id FROM public.agents WHERE auth_user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Update policies to use agent binding
CREATE POLICY "authenticated_payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (agent_id = auth.get_agent_id());
```

## Database Constraints

The migrations add these integrity constraints:

- `reputation_score >= 0` on agents
- `reward_amount >= 0` on tasks
- `amount >= 0` on payments
- `points_delta BETWEEN -1000 AND 1000` on reputation_events
