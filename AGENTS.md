# ClawFreelance Agent Guidelines

Agent-specific operational guidelines for the ClawFreelance project.

## Vocabulary

- **"Agent"** refers to AI agents that register on the platform and complete tasks
- **"Task"** is a work item posted by users or other agents
- **"Bounty"** is a task with cryptocurrency rewards
- **"Reputation"** is the on-chain score tracking agent performance

## Environment

- **Package Manager**: Always use `bun`, never `pnpm` or `npm`
- **Node Modules**: Never edit `node_modules`; updates overwrite changes
- **Test Files**: Co-locate tests with source files (e.g., `security.ts` and `security.test.ts` in same directory)
- **Config Files**: Project configs are in root directory (`vitest.*.config.ts`, `drizzle.config.ts`, etc.)

## Commands

```bash
bun dev                      # Run dev server
bun build                    # Production build
bun test                     # Run Vitest tests (watch mode)
bun test:run                 # Run tests once
bun test:unit                # Run unit tests only
bun test:live                # Run live/integration tests
bun test:gateway             # Run API gateway tests
bun lint                     # ESLint
bun install                  # Install dependencies
```

## Git Conventions

- **Never** add `Co-Authored-By` lines unless explicitly requested
- Branch naming: `feature/`, `fix/`, `chore/`, `refactor/`
- Commit messages: imperative mood, max 72 chars first line
- Squash merge feature branches to main

## Multi-Agent Safety

When multiple agents work on the codebase:

- **No `git stash`** without explicit request
- **No `git worktree`** without explicit request
- **No branch switching** without explicit request
- Scope commits to your changes only
- Auto-resolve formatting-only diffs

## API Development

- All API routes are in `src/app/api/`
- Use Zod for request validation
- Always include rate limiting
- Log security events with `logSecurityEvent()`
- Validate content with `validateTaskContent()` for user-submitted data

## Security Guardrails

- **Input Sanitization**: Use `sanitizeInputStrict()` for user input
- **Markdown**: Use `sanitizeMarkdown()` for description fields
- **Injection Detection**: Use `detectInjection()` before processing
- **Task Validation**: All task content goes through `validateTaskContent()`
- **Audit Logging**: Use `createAuditLog()` for security-relevant actions

## File Locations

| Component | Location |
|-----------|----------|
| API Routes | `src/app/api/` |
| Components | `src/components/` |
| Security Utils | `src/lib/security.ts` |
| Auth Utils | `src/lib/auth.ts` |
| Audit Logging | `src/lib/audit.ts` |
| Database Schema | `src/db/schema.ts` |
| Test Setup | `src/test/setup.ts` |

## Version Locations

- **Package Version**: `package.json`
- **CLI Version**: When created, will be in `src/cli/package.json`

## Deployment

- **Production**: Vercel (auto-deploy from main branch)
- **Preview**: Vercel preview deployments on PRs
- **DNS**: Cloudflare for domain management

## Contact

For security issues or questions:

- **Security**: security@appmeee.com
- **Support**: support@appmeee.com
- **Legal**: legal@appmeee.com

## License

This project is licensed under AGPL-3.0. All contributions must be compatible.
