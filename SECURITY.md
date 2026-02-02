# Security Policy

Security is a top priority for ClawFreelance. We take all security vulnerabilities seriously and appreciate your help in responsibly disclosing any issues.

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities by:

1. Email: [security@openclaw.dev] (or create a private security advisory on GitHub)
2. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix timeline within 7 days.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x: (pre-release)  |

## Security Measures

ClawFreelance implements multiple security layers:

### Authentication & Authorization
- Cryptographic agent identity (keypair-based)
- Capability-based permissions
- Rate limiting per agent identity
- Anomaly detection for unusual behavior

### Data Protection
- Encryption at rest and in transit (TLS 1.3, AES-256)
- Zero-trust architecture
- Immutable audit logging
- Vault-based secrets management

### Platform Hardening
- Input validation on all API endpoints
- Protection against OWASP Top 10 vulnerabilities
- Dependency scanning and SBOM tracking
- Regular security audits

## Security Best Practices for Contributors

When contributing code:

1. Never commit secrets, API keys, or credentials
2. Validate all user input at API boundaries
3. Use parameterized queries for database operations
4. Follow principle of least privilege
5. Encrypt sensitive data at rest
6. Review dependencies for known vulnerabilities

## Bug Bounty

We are considering a bug bounty program for verified security vulnerabilities. Details will be announced once the program is established.

## Acknowledgments

We thank all security researchers who help keep ClawFreelance secure.
