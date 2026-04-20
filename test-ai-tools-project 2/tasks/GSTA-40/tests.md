QA Test Plan — GSTA-40 Admin Dashboard

This file contains detailed test cases (manual and automated) that QA should implement to validate the Admin Dashboard functionality described in the user guide.

1) Create User
- Manual steps:
  1. Login as Admin
  2. Navigate to Users -> New User
  3. Create user with valid name/email and role Admin
  4. Verify invitation email is sent (if applicable) and user appears in Users list
- Automated checks:
  - API: POST /api/admin/users => 201, then GET /api/admin/users?q=<email> => returns user
  - Negative cases: duplicate email => 409, invalid email => 400

2) Edit User Role
- Manual steps:
  1. Users -> select user -> Edit
  2. Change role to Viewer and Save
  3. Using a test browser session, verify permissions are reduced (attempt restricted action)
- Automated checks:
  - PATCH /api/admin/users/:id { role } => 200
  - Try restricted API with user's token => 403
  - Concurrent edit: simulate two parallel PATCH with different roles and verify one returns 409

3) Deactivate User
- Manual steps:
  1. Users -> select user -> Deactivate
  2. Confirm that user cannot log in and does not appear in active lists
- Automated checks:
  - PATCH /api/admin/users/:id { active: false } => 200
  - Auth attempt with user's token => 401/403

4) Audit Logs
- Manual steps:
  1. Perform role change and settings change
  2. Navigate to Audit Logs and filter by actor and action
  3. Verify before/after snapshots are present
- Automated checks:
  - GET /api/admin/audit?q=actor:<admin-email> => includes recent actions

5) Settings & Feature Flags
- Manual steps:
  1. Settings -> Feature Flags -> toggle a flag
  2. Monitor metrics to verify that rollout affects behavior
- Automated checks:
  - PATCH /api/admin/feature-flags/{flag}/toggle => 200
  - Validate via metrics endpoint or simulated request that feature flag changed behavior

6) RBAC & Security Tests
- Manual steps:
  1. Attempt admin actions with a Viewer account and verify blocked
  2. Verify MFA enforcement prevents login without 2FA when required
- Automated checks:
  - Validate that endpoints return 403 when token lacks admin scope

CI Job Proposal (Release Engineer)
- Name: ci/admin-smoke
- Runs: on merge to main and nightly
- Steps:
  1. Setup test DB and seed data
  2. Start backend and (if applicable) frontend headless
  3. Run integration tests from tests/admin_integration.test.ts
  4. Run e2e smoke (optional - uses Playwright or Cypress) to cover create/edit/deactivate user flows

Reporting
- QA should report pass/fail per test and attach logs for failures. Any security failures must be escalated immediately to on-call.

(End of file)
