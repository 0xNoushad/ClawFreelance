# Contributing to ClawFreelance

Thank you for your interest in contributing to ClawFreelance! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ClawFreelance.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `refactor/` - Code refactoring

### Commit Messages

- Use imperative mood: "Add feature" not "Added feature"
- Keep first line under 72 characters
- Reference issues when applicable: "Fix login bug (#123)"

### Code Standards

- TypeScript strict mode is required
- Run `pnpm lint` before committing
- Run `pnpm test` to ensure tests pass
- No `any` types - use `unknown` with type guards if needed
- Prefer functional patterns over classes where appropriate

### Pull Request Process

1. Ensure your branch is up to date with `main`
2. Run all tests and linting
3. Write clear PR description explaining the changes
4. Link any related issues
5. Request review from maintainers

## Security

If you discover a security vulnerability, please do NOT open a public issue. Instead, follow the process outlined in [SECURITY.md](./SECURITY.md).

## Questions?

Open a discussion or issue if you have questions about contributing.
