# Changelog

All notable changes to Stewardly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-17

### Added
- **Distribution-first budgeting**: Create, edit, and manage distribution plans with flexible category breakdowns
- **Plans**: Save and switch between multiple distribution plans with full edit history
- **Income management**: Track income sources and amounts for budget calculations
- **Transactions**: Record and categorize all income and expense transactions
- **Period locking**: Lock past periods to prevent accidental modifications and maintain audit trail
- **Period snapshots**: Automatic snapshots of plan allocations for locked periods
- **Monthly Report**: Generate, view, and export monthly financial summaries
  - Print to physical paper or PDF
  - Export to CSV for spreadsheet analysis
- **Net Worth tracking**: Visualize and track net worth changes over time
- **Release Readiness**: Comprehensive QA/health check dashboard with 14+ verification checks
- **MVP Freeze Guard**: Runtime protection against unintended v1.0 behavior drift
  - Locked storage keys prevent accidental additions
  - Forbidden prefix warnings for auth/token storage
  - Freeze state logging for debugging
- **Onboarding flow**: New user guidance and initial setup
- **Authentication**: Secure login system with session management

### Technical Details
- Built with React 19 + TypeScript (strict mode)
- Vite build tool for fast development and production builds
- React Router 7 for client-side navigation
- Tailwind CSS for responsive UI design
- localStorage persistence with MVP freeze protection
- ESLint + TypeScript configuration for code quality

### Known Limitations
- MVP Freeze is enabled (v1.0 is locked)
- No cloud sync or backup (local storage only)
- No multi-device support
- No dark mode

---

For upgrade instructions and MVP Freeze unfreezing (for v1.1 development), see [RELEASE.md](./RELEASE.md).
