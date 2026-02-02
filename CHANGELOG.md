# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker deployment with `docker-compose.yml`
- Multi-stage Dockerfile for optimized production builds
- Matrix Synapse container with bridge support
- Comprehensive `.env.example` configuration template
- Contributing guidelines (`CONTRIBUTING.md`)
- GitHub issue templates (bug report, feature request)
- Pull request template
- CI workflow for Docker image builds

### Changed
- License changed from MIT to AGPL-3.0 with enterprise provisions
- Simplified README with Docker-first approach
- Streamlined project structure
- Development requires HTTPS with local certificates

## [1.0.0] - 2026-01-31

### Added
- Unified inbox for 14+ messaging platforms
- Gmail, Discord, Slack, Outlook, Teams integrations via OAuth
- Matrix bridges for WhatsApp, Signal, Discord, Slack, Google Messages, Google Voice, LinkedIn
- iMessage integration via macOS desktop app
- AI-powered auto-replies with GPT-4 and Gemini
- End-to-end encryption via Matrix
- Multi-language support (EN, ES, FR, DE, JA)
- Discord voice channel support via LiveKit
- Browser extension for OAuth flows
- Push notifications with Web Push API
- OmniSearch (⌘K) across all conversations
- Email reader with keyboard navigation
- Device verification UI for encryption setup

### Security
- AES-256-GCM encryption for OAuth tokens
- Zero-trust architecture
- Client-side recovery key encryption
