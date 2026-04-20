Title: GSTA-81 CI & infra skeleton (GitHub Actions + Terraform)

Owner: Release Engineer (implementation), Infra (review)

Summary
- Add a minimal GitHub Actions CI workflow and a Terraform infra skeleton for Phase 1 monorepo scaffold. This PR is intentionally small and contains placeholders so the infra team can decide on providers and remote state in follow-up work.

Acceptance Criteria
1. .github/workflows/ci.yml exists and runs basic install + test on pushes and PRs.
2. infra/terraform contains a minimal skeleton and README describing next steps.
3. PR opened against main for review.

Branch: gsta-81/ci-infra-skeleton
PR: https://github.com/AI-LLM-World/AI-Tools-Library/pull/new/gsta-81/ci-infra-skeleton

Notes
- A GitHub token was reported available in the environment but not accessible to this process; please either create the PR from the link above or supply a GITHUB_TOKEN in the runner environment so I can create it via API.
