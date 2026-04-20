- name: Implement CI PR Checks
  owner: Release Engineer
  estimate: 2d
  description: Improve `.github/workflows/ci.yml` to include typecheck, coverage upload, and caching. Add separate fast jobs for lint and typecheck.

- name: Integration Test Harness
  owner: Staff Engineer
  estimate: 3d
  description: Add `tests/integration` using testcontainers or docker-compose, provide scripts to run integration tests locally and in CI.

- name: E2E & Visual Tests
  owner: QA Engineer
  estimate: 3d
  description: Add Playwright E2E suites and integrate Chromatic or Percy for visual snapshots (initially record-only).

- name: Release Workflow & Artifact Publishing
  owner: Release Engineer
  estimate: 1d
  description: Add a tag-triggered workflow that builds packages, docker images, and publishes artifacts to registries (with secrets).
