# Agent PR Review Instructions

This document provides instructions for AI agents reviewing pull requests on ClawFreelance.

## Review Process

### 1. Eligibility Check

Before reviewing, verify the PR is eligible:
- PR is **not** closed or merged
- PR is **not** a draft
- PR is **not** automated (e.g., dependabot)
- PR does **not** already have a Claude review

### 2. Gather Context

- Identify all relevant `CLAUDE.md` files (root + directories touched by PR)
- Get the PR diff and understand the scope of changes
- Note the head commit SHA for linking

### 3. Run Parallel Reviews

Launch 5 independent review agents:

| Agent | Focus | Key Questions |
|-------|-------|---------------|
| CLAUDE.md Compliance | Project rules | Does code follow documented standards? |
| Bug Scanner | Obvious bugs | Logic errors, null handling, security issues? |
| Git History | Historical context | Does this contradict previous decisions? |
| Previous PRs | Past feedback | Are old review comments applicable? |
| Code Comments | Inline guidance | Does code violate its own comments? |

### 4. Security Review (Critical)

**Always check for security vulnerabilities and malicious code:**

- **Injection attacks**: SQL injection, XSS, command injection, prompt injection
- **Authentication bypass**: Missing auth checks, improper token validation
- **Authorization flaws**: Access control issues, privilege escalation
- **Data exposure**: Sensitive data in logs, responses, or URLs
- **Dependency issues**: Malicious packages, known vulnerabilities
- **Hardcoded secrets**: API keys, passwords, tokens in code
- **Unsafe deserialization**: Arbitrary code execution vectors
- **Path traversal**: File system access outside intended directories
- **SSRF**: Server-side request forgery vulnerabilities

For ClawFreelance specifically, verify:
- All user inputs use `sanitizeInputStrict()` or `sanitizeMarkdown()`
- All text fields checked with `detectInjection()`
- Authentication via `authenticateRequest()` where required
- Audit logging for security-sensitive operations
- Rate limiting applied to endpoints

### 5. Score Issues

Score each issue 0-100:

| Score | Meaning |
|-------|---------|
| 0 | False positive, doesn't stand up to scrutiny |
| 25 | Might be real, couldn't verify, stylistic nitpick |
| 50 | Real but minor, not important relative to PR |
| 75 | Verified, important, impacts functionality |
| 100 | Definitely real, frequent in practice, confirmed |

**Filter threshold: 80+** - Only report issues scoring 80 or higher.

### 6. False Positive Detection

Ignore these common false positives:
- Pre-existing issues not introduced by PR
- Issues a linter/compiler would catch
- Pedantic style nitpicks
- General quality issues unless in CLAUDE.md
- Issues explicitly silenced (lint ignore comments)
- Intentional functionality changes
- Issues on lines not modified in PR

### 7. Post Review

#### If Issues Found (score >= 80)

```markdown
### Code review

Found N issues:

1. **Brief description** (CLAUDE.md says "...")
   <link to file with full SHA and line range>

2. **Brief description** (bug due to <code snippet>)
   <link to file with full SHA and line range>

🤖 Generated with [Claude Code](https://claude.ai/code)

<sub>- If this code review was useful, please react with 👍. Otherwise, react with 👎.</sub>
```

#### If No Issues Found

```markdown
### Code review

No issues found. Checked for bugs and CLAUDE.md compliance.

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Link Format

Always use full SHA in links:
```
https://github.com/owner/repo/blob/<full-sha>/path/to/file.ts#L10-L15
```

- Full 40-character SHA required
- `#` after filename
- Line range format: `L[start]-L[end]`
- Include 1+ lines of context around the issue

## Review Guidelines

### Always Provide Feedback

- If PR is **good**: Approve and note what was checked
- If PR has **issues**: List them concisely with links and context

### Keep Output Brief

- No verbose explanations
- No emojis
- Link and cite all issues
- Focus on actionable feedback

### Do Not

- Run build/typecheck (CI handles this)
- Comment on test coverage unless CLAUDE.md requires it
- Flag general security concerns without specific evidence
- Repeat issues already mentioned in PR comments

## Command Reference

### PR Information

```bash
# Check PR status (state, draft, author)
gh api repos/OWNER/REPO/pulls/NUMBER --jq '{
  state,
  draft: .draft,
  author: .user.login,
  title,
  head_sha: .head.sha,
  base_ref: .base.ref
}'

# Get full PR details as JSON
gh pr view NUMBER --repo OWNER/REPO --json number,state,isDraft,author,title,body,headRefName,baseRefName,url,reviews,comments

# List all PRs (open, closed, merged)
gh pr list --repo OWNER/REPO --state all --limit 50 --json number,title,state,headRefName

# Get PR diff
gh pr diff NUMBER --repo OWNER/REPO

# Get only changed file names
gh pr diff NUMBER --repo OWNER/REPO --name-only

# Get PR diff stats (lines added/removed)
gh pr diff NUMBER --repo OWNER/REPO --stat
```

### Reviews and Comments

```bash
# Check existing reviews on PR
gh api repos/OWNER/REPO/pulls/NUMBER/reviews --jq '.[] | {user: .user.login, state: .state, body: .body}'

# Check PR comments (inline code comments)
gh api repos/OWNER/REPO/pulls/NUMBER/comments --jq '.[] | {user: .user.login, body: .body[0:200]}'

# Check issue comments (general discussion)
gh api repos/OWNER/REPO/issues/NUMBER/comments --jq '.[] | {user: .user.login, body: .body[0:200]}'

# Post a comment on PR
gh pr comment NUMBER --repo OWNER/REPO --body "Your comment here"

# Post multi-line comment using heredoc
gh pr comment NUMBER --repo OWNER/REPO --body "$(cat <<'EOF'
### Code review

Your review content here...

EOF
)"
```

### Repository Information

```bash
# Get repo info
gh api repos/OWNER/REPO --jq '{name, default_branch, visibility}'

# Get recent commits on a branch
gh api repos/OWNER/REPO/commits?sha=BRANCH --jq '.[0:10] | .[] | {sha: .sha[0:7], message: .commit.message | split("\n")[0]}'

# Get file content at specific commit
gh api repos/OWNER/REPO/contents/PATH?ref=SHA

# Get commit details
gh api repos/OWNER/REPO/commits/SHA
```

### Working with Forks

```bash
# Note: PRs from forks are on the upstream repo, not the fork
# If OWNER/REPO is a fork, check the parent repo for PRs

# Get fork's parent repo
gh api repos/OWNER/REPO --jq '.parent.full_name'

# List PRs from a specific author (for forks)
gh pr list --repo UPSTREAM_OWNER/REPO --author FORK_OWNER --state all
```

### Git Commands for Context

```bash
# Fetch remote branch for local review
git fetch https://github.com/OWNER/REPO.git BRANCH:local-review-branch

# Compare branches
git diff main...BRANCH --stat
git log main..BRANCH --oneline

# Get git blame for a file
git blame PATH/TO/FILE

# Get recent history for a file
git log --oneline -10 -- PATH/TO/FILE
```
