# Admin Dashboard User Guide

This document is the canonical internal user guide for the Admin Dashboard. It targets platform operators and administrators who need to manage users, roles, application settings, and monitor system metrics.

Prerequisites
- Admin account with appropriate role (see Roles & Permissions below)
- Network access to staging/production dashboard endpoints
- Optional: access to monitoring/alerts system for deeper investigation

Navigation Overview
- Login: /admin/login (or platform SSO flow)
- Main sections:
  - Users: list, create, edit, deactivate
  - Roles & Permissions: define roles and map permissions
  - Metrics / Dashboards: health, usage, errors
  - Settings: feature flags, integrations, system config
  - Audit Logs: view recent admin actions

Roles & Permissions
- Built-in roles:
  - Superadmin: full access to everything
  - Admin: manage users, roles, and settings, but cannot change platform-level secrets
  - Viewer: read-only access to metrics and audit logs
- Best practices:
  - Assign Superadmin sparingly (2-3 people max)
  - Use role-based access instead of granting individual permissions when possible
  - Regularly review role membership (quarterly)

Common Workflows

1) Create a new user
- Steps:
  1. Navigate to Users -> New User
  2. Fill in name, email, initial role
  3. Optionally enable 2FA enforcement for the user
  4. Click Create — the user will receive an invitation email
- Notes: If your platform uses SSO, create the user in the identity provider and assign the platform role instead.

2) Edit user roles and permissions
- Steps:
  1. Users -> select user -> Edit
  2. Change role or toggle individual permissions (if your role model permits)
  3. Save changes — changes take effect immediately
- Troubleshooting: If a user loses access, verify their role and SSO group membership, then check audit logs.

3) Deactivate or delete a user
- Steps:
  1. Users -> select user -> Deactivate (preferred)
  2. Confirm deactivation — this preserves audit trails
  3. If you must delete, use Delete after exporting any needed data
- Notes: Prefer deactivation for safety.

4) View metrics and health dashboards
- Steps:
  1. Navigate to Metrics/Dashboards
  2. Select timeframe and key metrics (requests, error rate, latency)
  3. Use filters to narrow by service or region
- Runbook tips: If error rate spikes, open the error logs and correlate with recent deploys (see Deploy Checklist).

Settings & Feature Flags
- Editing settings should be limited to Admin/Superadmin roles.
- Feature flags:
  - Toggle in Settings -> Feature Flags
  - Use gradual rollout (0 -> 10% -> 50% -> 100%) and monitor metrics during rollouts

Audit Logs
- Location: Audit Logs
- What to look for: role changes, user deactivations, settings changes, API key creation
- Retention policy: logs are retained for 90 days (verify with Release Engineer)

Troubleshooting & Runbook
- Problem: Admin cannot log in
  - Verify SSO provider health
  - Try an alternate admin account
  - Check backend auth logs for failures

- Problem: Permission escalation or incorrect role behavior
  - Reproduce with a test account
  - Check audit logs for recent role changes
  - Revoke suspect sessions and rotate affected credentials

- Emergency rollback (settings/feature flags)
  1. Toggle flag back to previous state
  2. If settings change caused outage, revert using the last known-good config file from backups
  3. Notify on-call and open incident ticket

Security Considerations
- Enforce MFA for all admin accounts
- Rotate API keys and service credentials on a schedule
- Limit access to production dashboard by IP allowlist if feasible
- Log and monitor all admin actions; forward critical alerts to on-call

Screenshots and API references
- Placeholder: the Staff Engineer should add screenshots of the live UI and list exact API endpoints used by admin actions (eg. POST /api/admin/users, PATCH /api/admin/users/:id)

Appendix: QA Test Matrix (summary)
- Create user: happy path, duplicate email, invalid email
- Edit role: permission changes take effect immediately, stale tokens revoked
- Deactivate user: ensure deactivated user cannot authenticate
- Feature flag rollout: verify metrics respond to flag toggle

Revision history
- v0.1 - initial draft (CTO)

(End of file)
