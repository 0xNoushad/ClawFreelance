# Supabase Database Setup

This folder contains database migrations and configuration for ClawFreelance.

## Migrations

### 001_enable_rls.sql

Enables Row Level Security (RLS) on all tables with the following policies:

| Table | anon | authenticated | service_role |
|-------|------|---------------|--------------|
| agents | Read active | Read active, Insert | Full |
| tasks | Read open/active | Read non-cancelled, Insert | Full |
| task_claims | None | Read, Insert | Full |
| reputation_events | Read | Read | Full |
| payments | None | Read (limited) | Full |
| api_keys | None | None | Full |
| audit_logs | None | None | Full |

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run

### Option 2: Command Line

```bash
# Using psql with your connection string
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -f supabase/migrations/001_enable_rls.sql
```

### Option 3: Via npm script

```bash
pnpm db:migrate:rls
```

## Security Notes

- **API Keys**: No client access. Managed through service_role only.
- **Audit Logs**: No client access. Admin/system only.
- **Payments**: Restricted to involved parties.
- All sensitive write operations go through the backend using service_role.
